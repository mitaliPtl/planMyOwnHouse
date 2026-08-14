"""Matplotlib rendering for generated plans — a research-side sanity-check tool,
not the product's plan viewer (that's `src/features/plan-engine/components/
plan-svg.tsx` in the Next.js app, which this doesn't touch)."""

from __future__ import annotations

import matplotlib.patches as patches
import matplotlib.pyplot as plt

from floorplan_gen.generate import GeneratedPlan

# Mirrors resplan_utils.CATEGORY_COLORS so a generated plan and a real ResPlan
# sample read consistently when viewed side by side in the explore/demo notebooks.
ROOM_COLORS = {
    "living": "#d9d9d9",
    "bedroom": "#66c2a5",
    "bathroom": "#fc8d62",
    "kitchen": "#8da0cb",
    "balcony": "#b3b3b3",
    "storage": "#FF8C69",
    "stair": "#9e9ac8",
    "unknown": "#cccccc",
}


def plot_generated_plan(
    plan: GeneratedPlan,
    boundary_coords: list[tuple[float, float]] | None = None,
    ax: plt.Axes | None = None,
    title: str | None = None,
) -> plt.Axes:
    if ax is None:
        _, ax = plt.subplots(figsize=(6, 6))

    if boundary_coords:
        xs = [c[0] for c in boundary_coords] + [boundary_coords[0][0]]
        ys = [c[1] for c in boundary_coords] + [boundary_coords[0][1]]
        ax.plot(xs, ys, color="black", linewidth=1.5, zorder=1)

    for room in plan.rooms:
        color = ROOM_COLORS.get(room.room_type, ROOM_COLORS["unknown"])
        ax.add_patch(
            patches.Rectangle(
                (room.x, room.y),
                room.width,
                room.height,
                facecolor=color,
                edgecolor="black",
                linewidth=1.0,
                alpha=0.85,
                zorder=2,
            )
        )
        ax.text(
            room.x + room.width / 2,
            room.y + room.height / 2,
            room.room_type,
            ha="center",
            va="center",
            fontsize=8,
            zorder=3,
        )

    ax.set_aspect("equal")
    ax.invert_yaxis()  # match the app's screen convention: y grows downward/toward the rear
    if title:
        ax.set_title(title)
    if plan.warnings:
        ax.set_xlabel("\n".join(plan.warnings), fontsize=8, color="firebrick")

    return ax
