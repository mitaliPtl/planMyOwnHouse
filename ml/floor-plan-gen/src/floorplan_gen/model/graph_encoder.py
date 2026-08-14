"""The v1 baseline model: boundary CNN + room-type embedding + a relational GNN
over ResPlan's typed adjacency graph, regressing a normalized bounding box per
room. See README.md for what this deliberately does *not* do (no raster branch,
no wall/door/window synthesis) — this is a box-regression baseline, not a full
Graph2Plan reproduction.

Expects batches built by `torch_geometric.loader.DataLoader` over
`ResPlanDataset` samples (see `data/resplan_dataset.py` for the exact fields:
`room_type`, `edge_index`, `edge_type`, `boundary_mask`, `y`, `batch`).
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import RGCNConv

from floorplan_gen.data.resplan_dataset import BOUNDARY_MASK_SIZE, EDGE_TYPES, ROOM_TYPES


class BoundaryEncoder(nn.Module):
    """Rasterized building-footprint mask -> a fixed-size embedding."""

    def __init__(self, embed_dim: int = 64, mask_size: int = BOUNDARY_MASK_SIZE):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),  # -> mask_size / 2
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),  # -> mask_size / 4
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d(1),
        )
        self.fc = nn.Linear(64, embed_dim)

    def forward(self, boundary_mask: torch.Tensor) -> torch.Tensor:
        # boundary_mask: (num_graphs_in_batch, mask_size, mask_size) after PyG's
        # default batch-concatenation of each sample's (1, mask_size, mask_size)
        # attribute along dim 0 — add the channel dim back for Conv2d.
        x = boundary_mask.unsqueeze(1)
        x = self.conv(x).flatten(1)
        return self.fc(x)


class RoomBoxRegressor(nn.Module):
    """Boundary embedding + room-type embedding -> relational GNN -> per-room
    (x, y, w, h) in the plan's normalized [0, 1] boundary frame."""

    def __init__(self, room_embed_dim: int = 32, boundary_embed_dim: int = 64, hidden_dim: int = 96, num_gnn_layers: int = 3):
        super().__init__()
        num_room_types = len(ROOM_TYPES) + 1  # + unknown bucket, see resplan_dataset.py
        num_edge_types = len(EDGE_TYPES) + 1

        self.room_type_embedding = nn.Embedding(num_room_types, room_embed_dim)
        self.boundary_encoder = BoundaryEncoder(embed_dim=boundary_embed_dim)

        self.input_proj = nn.Linear(room_embed_dim + boundary_embed_dim, hidden_dim)
        self.gnn_layers = nn.ModuleList(
            [RGCNConv(hidden_dim, hidden_dim, num_relations=num_edge_types) for _ in range(num_gnn_layers)]
        )

        self.box_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_dim, 4),
        )

    def forward(self, batch) -> torch.Tensor:
        boundary_embed = self.boundary_encoder(batch.boundary_mask)  # (num_graphs, boundary_embed_dim)
        boundary_per_node = boundary_embed[batch.batch]  # (num_nodes, boundary_embed_dim)

        room_embed = self.room_type_embedding(batch.room_type)  # (num_nodes, room_embed_dim)
        h = self.input_proj(torch.cat([room_embed, boundary_per_node], dim=-1))

        for layer in self.gnn_layers:
            h = F.relu(layer(h, batch.edge_index, batch.edge_type))

        # Sigmoid: targets are normalized to [0, 1] relative to the boundary's own
        # bounding box (see resplan_dataset._normalize_box).
        return torch.sigmoid(self.box_head(h))
