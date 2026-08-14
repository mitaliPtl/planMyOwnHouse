# Floor Plan Generator — v1 baseline

A learned floor-plan generation model, trained toward Indian/South-Asian home
layouts, meant to eventually complement or replace the deterministic room-packing
engine in the main app (`src/server/plan-engine/plan-generation-engine.ts`).

This is a **standalone research project**. Nothing here is imported by, or called
from, the Next.js app yet — it's a separate Python environment, trained and run via
Google Colab. Wiring a trained model into the product is future work, once there's
a model worth wiring in.

## What this is (and isn't) — read before assuming more than v1 delivers

This is a **v1 baseline**, not a reproduction of the full Graph2Plan paper:

- ✅ A graph neural network that takes a building boundary + room type list +
  room-adjacency graph, and regresses a bounding box per room.
- ✅ A deterministic geometry cleanup pass after inference (clip to boundary,
  resolve overlaps) — the model's raw output is not guaranteed valid, so we never
  ship an overlapping or out-of-bounds plan, the same principle the TypeScript
  engine follows.
- ❌ **No raster refinement branch.** The original Graph2Plan paper has a second
  stage that refines a rasterized segmentation map; this baseline skips it.
- ❌ **No wall/door/window synthesis.** Output is room boxes only.
- ❌ **No Indian-specific training data yet.** Trained on ResPlan (South Asian real
  estate listings — see below), which is a much better regional fit than the
  original RPLAN idea, but is not India-specific and has not been fine-tuned on
  anything India-specific (PMAY model-house plans) yet — that's a later phase, once
  a handful of those PDFs are manually digitized into the same graph format.
- ❌ **Not a fully converged model.** Training runs on Google Colab's free GPU
  tier, capped by session limits (~12h, can disconnect) — Phase 1 proves the full
  pipeline works end-to-end, not that the model is production-quality.

See `docs/roadmap.md`-style honesty: say what v1 does and doesn't do, rather than
letting the existence of a "generate" script imply more than it delivers.

## Why we're not using the existing Graph2Plan GitHub repo directly

`github.com/HanHan55/Graph2plan` (the original authors' reference implementation)
has **no LICENSE file** — under GitHub's own terms, no license means default
all-rights-reserved copyright, so we don't have permission to copy or build on that
code. It's a fine reference for understanding the paper's approach (and it's what
this reimplementation is conceptually based on), but every file in this directory
is written from scratch against the published paper (Hu et al., *Graph2Plan:
Learning Floorplan Generation from Layout Graphs*, SIGGRAPH 2020,
[arXiv:2004.13204](https://arxiv.org/abs/2004.13204)), not copied from that repo.

## Data — ResPlan

[ResPlan](https://github.com/m-agour/ResPlan) (2025): 17,000 residential floor
plans sourced from South Asian real-estate listings, in vector-graph format
(room polygons, typed connectivity graph, metric coordinates).

- **License: CC BY 4.0 (data) / MIT (code) — commercial use permitted, attribution
  required.** If a model trained on this data ever ships in the product, the
  attribution requirement travels with it (credit ResPlan/the original authors
  somewhere reachable, e.g. an about/credits page).
- Ships with a canonical `split.json` (train/val/test/augmented) — we use it as-is
  rather than re-splitting, so results stay comparable to the dataset's own
  baselines.
- The pickle carries **geometry only**; the room-adjacency graph is built on
  demand via the dataset's own `resplan_utils.py` (`plan_to_graph` +
  `add_adjacency_edges`) — we depend on those functions rather than
  reimplementing graph construction ourselves, since getting the edge-type
  taxonomy (`via_door` / `adjacency` / `direct` / `via_window`) right by hand
  would be redundant and error-prone.
- Room categories (from `resplan_utils.CATEGORY_COLORS`): `living`, `bedroom`,
  `bathroom`, `kitchen`, `balcony`, `storage`, `stair` (plus non-room connector
  geometry: `door`, `window`, `front_door`, `wall`).

We looked at PMAY (Pradhan Mantri Awas Yojana) government model-house plans as a
genuinely Indian, genuinely free source — real, but only a handful of PDF
drawings per state (not vector data, not thousands of samples, and specifically
PMAY-Gramin minimum rural housing, ~25 m²). Not enough volume or the right shape
of data to train on. Deferred to a later phase as a tiny manually-digitized
evaluation/fine-tuning set once this pipeline works.

## Model — v1 baseline (`src/floorplan_gen/model/graph_encoder.py`)

1. A small CNN encodes a rasterized mask of the building boundary into a fixed
   embedding.
2. Each room gets a type embedding, conditioned on the boundary embedding.
3. A graph neural network runs message passing over the room-adjacency graph
   (using ResPlan's real edge types) so each room's representation is informed by
   its neighbors — this is the mechanism meant to eventually learn real
   adjacency/zoning patterns from data, rather than the hand-written
   public/private/service keyword heuristic in the current TypeScript engine.
4. A regression head per room predicts a bounding box `(x, y, w, h)`.

Loss: box regression (L1) + a soft overlap penalty between predicted room boxes.
This is a *training signal*, not a guarantee — `generate.py` runs a deterministic
cleanup pass on the model's raw output before it's considered a valid plan.

## Compute — Google Colab (free tier)

T4 GPU, ~12h sessions that can disconnect without warning. Training checkpoints
save to a mounted Google Drive folder so progress survives a disconnect; nothing
persists on the Colab VM's local disk between sessions.

## Layout

```
src/floorplan_gen/
├── data/
│   ├── download.py          # fetches resplan_utils.py + the dataset release assets
│   └── resplan_dataset.py   # PyTorch Geometric Dataset built on resplan_utils
├── model/
│   └── graph_encoder.py     # the v1 baseline model
├── train.py                 # training loop, checkpoints to Drive
├── generate.py               # inference + geometry cleanup
└── visualize.py               # matplotlib rendering for sanity checks

notebooks/
├── 01_explore_resplan.ipynb  # download data, print stats, render real samples
├── 02_train_baseline.ipynb   # run a short training job on Colab's free GPU
└── 03_generate_demo.ipynb    # load a checkpoint, generate + visualize + validate
```

`data/` (downloaded dataset) and `checkpoints/` (model weights) are gitignored —
only code, notebooks, and this README are committed. Re-run `download.py` (or the
first notebook) to repopulate `data/` in any fresh environment/session.

## Running it

All three notebooks are meant to be opened in Google Colab (each has a first cell
that clones this repo and installs `requirements.txt`). See the notebook
docstrings for the exact sequence — the short version:

1. `01_explore_resplan.ipynb` — sanity-checks the data pipeline.
2. `02_train_baseline.ipynb` — trains a checkpoint, saves it to Drive.
3. `03_generate_demo.ipynb` — loads that checkpoint and generates a sample plan.

## Roadmap (explicitly not part of v1)

- Raster refinement branch (the paper's second stage).
- Real geometry post-processing (wall alignment/snapping, not just clip+resolve).
- Wall/door/window synthesis on generated plans.
- A manually-digitized PMAY evaluation/fine-tuning set for Indian-specific
  layouts.
- Quantitative evaluation against held-out real plans (room-count accuracy, IoU,
  adjacency-satisfaction rate) beyond the current qualitative visual check.
- Only once the model is demonstrably good: a design decision on whether/how to
  surface it in the product (as a replacement for, or an option alongside, the
  deterministic engine) — not assumed or scoped here.
