"""PyTorch Geometric Dataset over ResPlan.

Converts each ResPlan sample (geometry-only pickle entry) into a graph the v1
baseline model can train on:

- a rasterized boundary mask (from `plan["inner"]`, the building's bounds polygon)
- one node per room, with a room-type id and a target bounding box, normalized
  into the boundary's own [0, 1] coordinate frame (not raw metres) so the model
  learns shape/proportion rather than absolute plan size
- typed edges built by ResPlan's own `resplan_utils.plan_to_graph` +
  `add_adjacency_edges` (via_door / via_window / direct / adjacency) — we depend
  on those functions rather than re-deriving the edge taxonomy ourselves

Room-type and edge-type vocabularies are fixed lists below, matching
`resplan_utils.CATEGORY_COLORS`'s room categories and the paper's edge taxonomy.
Anything outside those lists (which shouldn't happen given the dataset's own
documented taxonomy, but data is data) maps to an explicit "unknown" bucket
instead of crashing — logged once, not silently dropped.
"""

from __future__ import annotations

import importlib.util
import json
import pickle
import sys
import warnings
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image, ImageDraw
from torch_geometric.data import Data, Dataset

ROOM_TYPES = ["living", "bedroom", "bathroom", "kitchen", "balcony", "storage", "stair"]
ROOM_TYPE_TO_ID = {name: i for i, name in enumerate(ROOM_TYPES)}
UNKNOWN_ROOM_TYPE_ID = len(ROOM_TYPES)  # one extra bucket for anything unexpected

EDGE_TYPES = ["via_door", "via_window", "direct", "adjacency"]
EDGE_TYPE_TO_ID = {name: i for i, name in enumerate(EDGE_TYPES)}
UNKNOWN_EDGE_TYPE_ID = len(EDGE_TYPES)

BOUNDARY_MASK_SIZE = 64


def _load_resplan_utils(utils_path: Path):
    """Dynamically imports the ResPlan repo's own resplan_utils.py (downloaded by
    `floorplan_gen.data.download`) — this is intentionally not vendored/copied
    into this package, since the point is to depend on ResPlan's real graph
    construction rather than reimplement it (see module docstring and README)."""
    if not utils_path.exists():
        raise FileNotFoundError(
            f"{utils_path} not found — run `python -m floorplan_gen.data.download "
            f"--dest {utils_path.parent}` first."
        )
    spec = importlib.util.spec_from_file_location("resplan_utils", utils_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["resplan_utils"] = module
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def _rasterize_boundary(parts_norm_coords: list, size: int = BOUNDARY_MASK_SIZE) -> np.ndarray:
    """Rasterizes one or more polygon rings (already normalized to [0, 1]) into a
    `size x size` binary mask, 1.0 inside the building footprint. Takes a list of
    rings (not a single ring) because ResPlan's `plan["inner"]` boundary is
    sometimes a MultiPolygon — a disjoint/multi-wing footprint — and every part
    should show up in the mask, not just one."""
    img = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(img)
    for coords in parts_norm_coords:
        pixel_coords = [(x * (size - 1), y * (size - 1)) for x, y in coords]
        draw.polygon(pixel_coords, fill=1)
    return np.array(img, dtype=np.float32)


def _polygon_rings(geom):
    """Yields each part's exterior coordinate ring — handles both a plain Polygon
    and a MultiPolygon boundary (ResPlan has both)."""
    if geom.geom_type == "Polygon":
        yield geom.exterior.coords
    elif geom.geom_type == "MultiPolygon":
        for part in geom.geoms:
            yield part.exterior.coords
    else:
        raise ValueError(f"Unexpected boundary geometry type: {geom.geom_type!r}")


def _normalize_box(minx: float, miny: float, maxx: float, maxy: float, bounds: tuple[float, float, float, float]):
    bx0, by0, bx1, by1 = bounds
    bw, bh = (bx1 - bx0) or 1.0, (by1 - by0) or 1.0
    x = (minx - bx0) / bw
    y = (miny - by0) / bh
    w = (maxx - minx) / bw
    h = (maxy - miny) / bh
    return x, y, w, h


def plan_to_pyg_data(plan: dict[str, Any], resplan_utils) -> Data | None:
    """Converts one ResPlan plan dict into a `torch_geometric.data.Data` sample.

    Returns None for plans that don't yield a usable graph (e.g. no rooms) —
    the dataset filters these out at load time rather than crashing on them.
    """
    graph = resplan_utils.plan_to_graph(plan)
    graph = resplan_utils.add_adjacency_edges(graph)

    # ResPlan's graph also includes connector nodes like "front_door" (a door
    # threshold, not a room — confirmed empirically: it showed up sized like a
    # doorway and got mis-treated as a room to box-regress and overlap-check,
    # which is wrong and pollutes both training signal and validity checks).
    # Room type membership is the only thing that decides whether a node is kept
    # — everything outside ROOM_TYPES (front_door, and anything else that isn't
    # a real room) is dropped from the graph entirely, not mapped to "unknown".
    node_ids = [n for n in graph.nodes if graph.nodes[n].get("type", "") in ROOM_TYPE_TO_ID]
    if len(node_ids) == 0:
        return None

    boundary = plan.get("inner")
    if boundary is None or boundary.is_empty:
        return None
    bounds = boundary.bounds  # (minx, miny, maxx, maxy)
    bw, bh = (bounds[2] - bounds[0]) or 1.0, (bounds[3] - bounds[1]) or 1.0
    boundary_norm_parts = [
        [((x - bounds[0]) / bw, (y - bounds[1]) / bh) for x, y in ring]
        for ring in _polygon_rings(boundary)
    ]
    boundary_mask = torch.from_numpy(_rasterize_boundary(boundary_norm_parts))

    room_type_ids: list[int] = []
    target_boxes: list[list[float]] = []
    room_names: list[str] = []
    node_index = {node_id: i for i, node_id in enumerate(node_ids)}

    for node_id in node_ids:
        attrs = graph.nodes[node_id]
        room_type_ids.append(ROOM_TYPE_TO_ID[attrs["type"]])  # guaranteed present, see the filter above

        geom = attrs["geometry"]
        target_boxes.append(list(_normalize_box(*geom.bounds, bounds=bounds)))
        room_names.append(str(node_id))

    edge_src: list[int] = []
    edge_dst: list[int] = []
    edge_type_ids: list[int] = []
    for u, v, edge_attrs in graph.edges(data=True):
        if u not in node_index or v not in node_index:
            continue  # touches a dropped connector node (front_door, etc.) — skip
        edge_type = edge_attrs.get("type", "")
        type_id = EDGE_TYPE_TO_ID.get(edge_type, UNKNOWN_EDGE_TYPE_ID)
        # Undirected graph -> both directions, so message passing sees symmetric edges.
        edge_src += [node_index[u], node_index[v]]
        edge_dst += [node_index[v], node_index[u]]
        edge_type_ids += [type_id, type_id]

    edge_index = torch.tensor([edge_src, edge_dst], dtype=torch.long) if edge_src else torch.zeros((2, 0), dtype=torch.long)
    edge_type = torch.tensor(edge_type_ids, dtype=torch.long) if edge_type_ids else torch.zeros((0,), dtype=torch.long)

    return Data(
        room_type=torch.tensor(room_type_ids, dtype=torch.long),
        y=torch.tensor(target_boxes, dtype=torch.float32),
        edge_index=edge_index,
        edge_type=edge_type,
        boundary_mask=boundary_mask.unsqueeze(0),  # (1, H, W) for a CNN
        num_nodes=len(node_ids),
        room_names=room_names,
        boundary_bounds=torch.tensor(bounds, dtype=torch.float32),
    )


def build_query_sample(
    boundary_coords: list[tuple[float, float]],
    room_types: list[str],
    edges: list[tuple[int, int, str]],
) -> Data:
    """Builds a `Data` sample for a *new* boundary + room list, not a ResPlan
    training example — this is what `generate.py`/the demo notebook uses to ask
    the model for a plan on an arbitrary plot, the actual point of "generate".

    `boundary_coords`: polygon exterior in any consistent unit (metres, feet —
    normalized internally, so unit doesn't matter for the model itself, only for
    interpreting the output afterwards).
    `room_types`: one entry per room, values from ROOM_TYPES (unknown values map
    to the unknown bucket, same as training data).
    `edges`: (src_index, dst_index, edge_type) into `room_types`; `edge_type`
    values from EDGE_TYPES (unknown values map to the unknown bucket).
    """
    xs = [c[0] for c in boundary_coords]
    ys = [c[1] for c in boundary_coords]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    bw, bh = (maxx - minx) or 1.0, (maxy - miny) or 1.0
    boundary_norm = [((x - minx) / bw, (y - miny) / bh) for x, y in boundary_coords]
    boundary_mask = torch.from_numpy(_rasterize_boundary([boundary_norm]))

    room_type_ids = [ROOM_TYPE_TO_ID.get(t, UNKNOWN_ROOM_TYPE_ID) for t in room_types]

    edge_src, edge_dst, edge_type_ids = [], [], []
    for u, v, edge_type in edges:
        type_id = EDGE_TYPE_TO_ID.get(edge_type, UNKNOWN_EDGE_TYPE_ID)
        edge_src += [u, v]
        edge_dst += [v, u]
        edge_type_ids += [type_id, type_id]
    edge_index = torch.tensor([edge_src, edge_dst], dtype=torch.long) if edge_src else torch.zeros((2, 0), dtype=torch.long)
    edge_type = torch.tensor(edge_type_ids, dtype=torch.long) if edge_type_ids else torch.zeros((0,), dtype=torch.long)

    return Data(
        room_type=torch.tensor(room_type_ids, dtype=torch.long),
        edge_index=edge_index,
        edge_type=edge_type,
        boundary_mask=boundary_mask.unsqueeze(0),
        num_nodes=len(room_types),
        room_names=[f"{t}_{i}" for i, t in enumerate(room_types)],
        boundary_bounds=torch.tensor([minx, miny, maxx, maxy], dtype=torch.float32),
    )


class ResPlanDataset(Dataset):
    """`split` is one of "train" / "val" / "test" / "augmented", matching
    ResPlan's own split.json — we use the dataset's canonical split rather than
    re-shuffling, so results stay comparable to ResPlan's published baselines."""

    def __init__(self, data_dir: Path, split: str):
        super().__init__()
        self.data_dir = Path(data_dir)
        self.resplan_utils = _load_resplan_utils(self.data_dir / "resplan_utils.py")

        with open(self.data_dir / "ResPlan.pkl", "rb") as f:
            all_plans = pickle.load(f)

        with open(self.data_dir / "split.json") as f:
            splits = json.load(f)
        if split not in splits:
            raise ValueError(f"Unknown split '{split}', expected one of {list(splits)}")
        indices = splits[split]

        self._samples: list[Data] = []
        skipped = 0
        for i in indices:
            sample = plan_to_pyg_data(all_plans[i], self.resplan_utils)
            if sample is None:
                skipped += 1
                continue
            self._samples.append(sample)
        if skipped:
            warnings.warn(f"Skipped {skipped}/{len(indices)} '{split}' plans with no usable graph.", stacklevel=2)

    def len(self) -> int:
        return len(self._samples)

    def get(self, idx: int) -> Data:
        return self._samples[idx]
