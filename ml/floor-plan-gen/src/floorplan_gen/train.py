"""Training loop for the v1 baseline. Meant to be run from
`notebooks/02_train_baseline.ipynb` on Colab's free GPU tier, but works the same
from a plain shell for local debugging on a CPU/small subset.

Checkpoints save every epoch to `--checkpoint-dir` (point this at a mounted
Google Drive folder in Colab — the free tier's local VM disk does not survive a
session disconnect, so anything not saved to Drive is lost).

Usage:
    python -m floorplan_gen.train --data-dir data/ --checkpoint-dir /content/drive/MyDrive/floorplan-gen/checkpoints
"""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
import torch.nn.functional as F
from torch_geometric.loader import DataLoader
from tqdm import tqdm

from floorplan_gen.data.resplan_dataset import ResPlanDataset
from floorplan_gen.model.graph_encoder import RoomBoxRegressor


def overlap_penalty(boxes: torch.Tensor, batch_vec: torch.Tensor) -> torch.Tensor:
    """Soft training signal only — mean pairwise overlap area between predicted
    room boxes *within the same graph* in the batch. This does not guarantee
    zero overlap (see generate.py's deterministic cleanup pass for that)."""
    total = boxes.new_zeros(())
    pair_count = 0
    for graph_id in batch_vec.unique():
        b = boxes[batch_vec == graph_id]
        n = b.shape[0]
        if n < 2:
            continue
        x0, y0 = b[:, 0], b[:, 1]
        x1, y1 = b[:, 0] + b[:, 2], b[:, 1] + b[:, 3]
        ix0 = torch.maximum(x0.unsqueeze(0), x0.unsqueeze(1))
        iy0 = torch.maximum(y0.unsqueeze(0), y0.unsqueeze(1))
        ix1 = torch.minimum(x1.unsqueeze(0), x1.unsqueeze(1))
        iy1 = torch.minimum(y1.unsqueeze(0), y1.unsqueeze(1))
        inter = (ix1 - ix0).clamp(min=0) * (iy1 - iy0).clamp(min=0)
        triu = torch.triu(torch.ones(n, n, device=b.device), diagonal=1)
        total = total + (inter * triu).sum()
        pair_count += n * (n - 1) // 2
    return total / pair_count if pair_count > 0 else total


def run_epoch(model, loader, device, optimizer=None, overlap_weight: float = 0.1) -> float:
    training = optimizer is not None
    model.train(training)
    total_loss, total_graphs = 0.0, 0

    for batch in loader:
        batch = batch.to(device)
        with torch.set_grad_enabled(training):
            pred = model(batch)
            box_loss = F.l1_loss(pred, batch.y)
            loss = box_loss + overlap_weight * overlap_penalty(pred, batch.batch)
            if training:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
        total_loss += loss.item() * batch.num_graphs
        total_graphs += batch.num_graphs

    return total_loss / total_graphs if total_graphs else 0.0


def train(
    data_dir: Path,
    checkpoint_dir: Path,
    epochs: int = 20,
    batch_size: int = 32,
    lr: float = 1e-3,
    overlap_weight: float = 0.1,
    max_train_samples: int | None = None,
) -> RoomBoxRegressor:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on {device}")

    train_ds = ResPlanDataset(data_dir, "train")
    val_ds = ResPlanDataset(data_dir, "val")
    if max_train_samples is not None:
        # Sized to fit a single Colab free-tier session — see README's honesty
        # note that Phase 1 proves the pipeline works, not that the model is
        # fully converged.
        train_ds = train_ds[:max_train_samples]
    print(f"train={len(train_ds)} val={len(val_ds)}")

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size)

    model = RoomBoxRegressor().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    best_val_loss = float("inf")

    for epoch in range(1, epochs + 1):
        train_loss = run_epoch(model, tqdm(train_loader, desc=f"epoch {epoch}/{epochs} [train]"), device, optimizer, overlap_weight)
        val_loss = run_epoch(model, val_loader, device, optimizer=None, overlap_weight=overlap_weight)
        print(f"epoch {epoch}: train_loss={train_loss:.4f} val_loss={val_loss:.4f}")

        state = {"model_state": model.state_dict(), "epoch": epoch, "val_loss": val_loss}
        torch.save(state, checkpoint_dir / "latest.pt")
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(state, checkpoint_dir / "best.pt")

    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--checkpoint-dir", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--overlap-weight", type=float, default=0.1)
    parser.add_argument("--max-train-samples", type=int, default=None, help="Cap training set size (Colab free-tier sessions are time-limited)")
    args = parser.parse_args()

    train(
        data_dir=args.data_dir,
        checkpoint_dir=args.checkpoint_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        overlap_weight=args.overlap_weight,
        max_train_samples=args.max_train_samples,
    )
