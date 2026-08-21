"""Inference + a deterministic geometry cleanup pass.

The model's raw output is a soft prediction trained with an overlap *penalty*,
not an overlap *guarantee* — so before anything here is called "a plan," it goes
through `cleanup_boxes`, which clips every box into the boundary and iteratively
separates any that still overlap. If cleanup can't fully resolve every overlap
within a bounded number of iterations, that's reported back as a warning rather
than silently returning a plan that looks fine but isn't — the same "no fake
functionality" principle the deterministic TypeScript engine follows
(src/server/plan-engine/plan-generation-engine.ts).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import torch
from torch_geometric.data import Data

from floorplan_gen.data.resplan_dataset import ROOM_TYPES, UNKNOWN_ROOM_TYPE_ID
from floorplan_gen.model.graph_encoder import RoomBoxRegressor


@dataclass
class GeneratedRoom:
    name: str
    room_type: str
    x: float
    y: float
    width: float
    height: float


@dataclass
class GeneratedPlan:
    rooms: list[GeneratedRoom]
    warnings: list[str] = field(default_factory=list)


def load_model(checkpoint_path: str, device: torch.device | None = None) -> RoomBoxRegressor:
    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = RoomBoxRegressor().to(device)
    checkpoint = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(checkpoint["model_state"])
    model.eval()
    return model


def _clip_to_unit_square(boxes: np.ndarray) -> np.ndarray:
    """Keeps every box inside [0, 1] by SLIDING it back into bounds, not by
    shrinking it. Clamping width/height from remaining-space-after-position
    (the original approach) silently squashes a box toward zero size whenever
    separation pushes it near an edge — a technically-valid but useless
    "resolution" (a bathroom with zero width isn't a bathroom). Width/height are
    only ever clamped down if they genuinely exceed the whole [0, 1] extent."""
    boxes = boxes.copy()
    boxes[:, 2] = np.clip(boxes[:, 2], 1e-3, 1.0)
    boxes[:, 3] = np.clip(boxes[:, 3], 1e-3, 1.0)
    boxes[:, 0] = np.clip(boxes[:, 0], 0.0, 1.0 - boxes[:, 2])
    boxes[:, 1] = np.clip(boxes[:, 1], 0.0, 1.0 - boxes[:, 3])
    return boxes


def _separate_overlaps(boxes: np.ndarray, iterations: int = 100) -> tuple[np.ndarray, bool]:
    """Greedy pairwise separation: pushes overlapping boxes apart along
    whichever axis has the smaller overlap, one pass at a time. Not globally
    optimal, but bounded and deterministic — a reasonable v1 cleanup, not a
    claim of doing real geometric packing.

    Re-clips to the unit square after every pass (not just once at the end,
    outside this function) — otherwise this can "resolve" an overlap by
    shoving a box outside [0, 1], report success, and then have that overlap
    silently reappear the moment something clips it back into bounds later.
    Resolved has to mean resolved-and-in-bounds, not resolved-by-cheating."""
    boxes = boxes.copy()
    n = len(boxes)
    for _ in range(iterations):
        moved = False
        for i in range(n):
            for j in range(i + 1, n):
                x0i, y0i, wi, hi = boxes[i]
                x0j, y0j, wj, hj = boxes[j]
                x1i, y1i = x0i + wi, y0i + hi
                x1j, y1j = x0j + wj, y0j + hj

                overlap_x = min(x1i, x1j) - max(x0i, x0j)
                overlap_y = min(y1i, y1j) - max(y0i, y0j)
                if overlap_x <= 1e-6 or overlap_y <= 1e-6:
                    continue

                moved = True
                if overlap_x < overlap_y:
                    shift = overlap_x / 2 + 1e-4
                    if x0i < x0j:
                        boxes[i, 0] -= shift
                        boxes[j, 0] += shift
                    else:
                        boxes[i, 0] += shift
                        boxes[j, 0] -= shift
                else:
                    shift = overlap_y / 2 + 1e-4
                    if y0i < y0j:
                        boxes[i, 1] -= shift
                        boxes[j, 1] += shift
                    else:
                        boxes[i, 1] += shift
                        boxes[j, 1] -= shift
        boxes = _clip_to_unit_square(boxes)
        if not moved:
            return boxes, True
    return boxes, False


def _shrink_toward_center(boxes: np.ndarray, factor: float) -> np.ndarray:
    """Scales every box by `factor` around its own center. Used as a fallback
    when pure translation can't separate everything — e.g. the model predicted
    rooms that are collectively too large to tile into the boundary without
    resizing, so no amount of pushing alone can ever fully separate them.
    Shrinking opens up gaps between previously-touching/overlapping boxes for
    `_separate_overlaps` to work with, without changing the overall layout."""
    boxes = boxes.copy()
    cx = boxes[:, 0] + boxes[:, 2] / 2
    cy = boxes[:, 1] + boxes[:, 3] / 2
    boxes[:, 2] *= factor
    boxes[:, 3] *= factor
    boxes[:, 0] = cx - boxes[:, 2] / 2
    boxes[:, 1] = cy - boxes[:, 3] / 2
    return boxes


def _count_overlaps(boxes: np.ndarray) -> int:
    n = len(boxes)
    count = 0
    for i in range(n):
        for j in range(i + 1, n):
            x0i, y0i, wi, hi = boxes[i]
            x0j, y0j, wj, hj = boxes[j]
            overlap_x = min(x0i + wi, x0j + wj) - max(x0i, x0j)
            overlap_y = min(y0i + hi, y0j + hj) - max(y0i, y0j)
            if overlap_x > 1e-6 and overlap_y > 1e-6:
                count += 1
    return count


def cleanup_boxes(raw_boxes: np.ndarray, rounds: int = 3, max_shrink_attempts: int = 6) -> tuple[np.ndarray, list[str]]:
    """Alternates clip-to-boundary and overlap-separation, since separating two
    boxes can push one back out of bounds. If pure translation still can't fully
    separate everything after `rounds` attempts — which can happen when the
    model's predicted room sizes are collectively too large to tile into the
    boundary without resizing, a case translation alone can never resolve —
    falls back to shrinking every box slightly around its own center and
    retrying, up to `max_shrink_attempts` times, before giving up and reporting
    whatever overlap remains. Returns the cleaned boxes plus any warnings."""
    boxes = raw_boxes.copy()
    resolved = False
    for _ in range(rounds):
        boxes = _clip_to_unit_square(boxes)
        boxes, resolved = _separate_overlaps(boxes)
        if resolved:
            break

    shrink_attempts = 0
    while not resolved and shrink_attempts < max_shrink_attempts:
        boxes = _shrink_toward_center(boxes, factor=0.92)
        boxes = _clip_to_unit_square(boxes)
        boxes, resolved = _separate_overlaps(boxes)
        shrink_attempts += 1

    boxes = _clip_to_unit_square(boxes)

    warnings: list[str] = []
    remaining = _count_overlaps(boxes)
    if remaining > 0:
        warnings.append(
            f"{remaining} room pair(s) still overlap after geometry cleanup — the "
            f"model's prediction didn't separate cleanly for this room count/boundary. "
            f"Treat this plan as a rough draft, not a final layout."
        )
    return boxes, warnings


def generate_plan(model: RoomBoxRegressor, sample: Data, device: torch.device | None = None) -> GeneratedPlan:
    """Runs the model on `sample` (built via `resplan_dataset.build_query_sample`
    or taken directly from `ResPlanDataset`) and returns a cleaned-up plan in the
    same real-world units as `sample.boundary_bounds`."""
    device = device or next(model.parameters()).device
    sample = sample.to(device)
    # A single-graph "batch" of size 1, so the model's batch-indexed boundary
    # lookup (see graph_encoder.RoomBoxRegressor.forward) works unmodified.
    sample.batch = torch.zeros(sample.num_nodes, dtype=torch.long, device=device)
    sample.boundary_mask = sample.boundary_mask.unsqueeze(0) if sample.boundary_mask.dim() == 2 else sample.boundary_mask

    with torch.no_grad():
        raw_boxes = model(sample).cpu().numpy()

    boxes, warnings = cleanup_boxes(raw_boxes)

    minx, miny, maxx, maxy = sample.boundary_bounds.cpu().numpy()
    bw, bh = maxx - minx, maxy - miny

    rooms = []
    for i, room_type_id in enumerate(sample.room_type.cpu().numpy()):
        x, y, w, h = boxes[i]
        room_type = ROOM_TYPES[room_type_id] if room_type_id != UNKNOWN_ROOM_TYPE_ID else "unknown"
        name = sample.room_names[i] if hasattr(sample, "room_names") else f"{room_type}_{i}"
        rooms.append(
            GeneratedRoom(
                name=name,
                room_type=room_type,
                x=minx + x * bw,
                y=miny + y * bh,
                width=w * bw,
                height=h * bh,
            )
        )

    return GeneratedPlan(rooms=rooms, warnings=warnings)
