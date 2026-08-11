# planMyOwnHouse — Roadmap (Phases 3–12)

This document tracks what's built and what's intentionally deferred. Phases 1–4
(project foundation, customer authentication, dashboard & project shell, plot/rooms/2D
plan generation) are implemented — see below. Phases 5–12 are **not implemented**; each
is summarized here at a scope level so future work starts from the full picture instead
of rediscovering it.

## Done: Phase 1 — Foundation

Next.js (App Router) + TypeScript + Tailwind v4, a centralized design-token system
(`src/app/globals.css` `@theme`, `src/config/design-tokens.ts`), a small owned
component library (`src/components/ui`), PostgreSQL + Prisma (auth-scoped schema
only), the full modular folder structure, and the landing page.

## Done: Phase 2 — Customer authentication

Signup, login (with remember-me and Google OAuth), required email verification,
forgot/reset password (hashed single-use tokens), profile view/edit — all backed by a
service → repository layered architecture, server-side `requireAuth()`/`requireRole()`
enforcement, rate limiting, and audit logging. See the plan file this was built from
for the full design rationale.

## Done: Phase 3 — Dashboard & project shell

`Project` Prisma model (name/description/location/status — `Plot` is deferred to
Phase 4, where it's actually needed), full project CRUD (create/list/search/rename/
duplicate/archive/delete) service → repository → API-route layered the same way as
auth, and the real dashboard shell: collapsible sidebar (desktop persistent, mobile
drawer), top bar with a working project-name search, dashboard stats (project count is
real; 2D/3D/elevation/estimate counts are honestly `0` since those engines don't exist
yet), quick actions, and recent-projects cards. Not-yet-built nav items (Estimates,
Saved Plans, Elevations, Support, Settings) render disabled with a "Soon" badge instead
of dead links. The project detail page shows an honest step-by-step "design workflow"
panel — Project Information is marked done, Plot Details through Estimation are marked
"Soon" — rather than pretending the wizard works. `proxy.ts`'s optimistic route guard
and `redirectIfAuthenticated()` were extended to cover `/dashboard` and `/projects`
alongside `/profile`.

## Done: Phase 4 — Wizard + 2D Plan Generation Engine

`Plot` (1:1 with Project), `RoomType` (seeded, 14 defaults — admin CRUD is Phase 8),
`ProjectRoom`, `Plan` (each generation creates a new row; `version` is the versioning
mechanism, not a separate `PlanVersion` model), and `PlanGenerationJob` (the real
consumer of the `server/jobs` `JobQueue` interface — see below). Three wizard steps:
Plot Details (form + live interactive SVG preview of the plot/setbacks/road/north),
Requirements & Room Settings (combined into one step/model — see "Scope decisions"
below), and 2D Plan (generate/regenerate, interactive SVG viewer with zoom/pan/
fullscreen/toggle-dimensions/download-SVG/print).

**`PlanGenerationEngine`** (`src/server/plan-engine/plan-generation-engine.ts`) is a
real, deterministic, unit-tested algorithm — not a stub and not AI-generated content.
It's a documented "Basic Automatic Layout Engine (v1)": largest-area-first row-packing
within the buildable area (plot minus setbacks), with an auto-added staircase for
multi-floor plots, per-room walls, a door on each room's edge closest to the front
setback, and windows on edges that lie on the plot boundary. Rooms that don't fit are
reported in `warnings`, never silently dropped. See the module docstring for exactly
what it does and doesn't do (no adjacency/circulation reasoning, no merged shared
walls) — real architectural optimization is future work (spec §54), not something this
phase pretends to do.

**Job queue**: `server/jobs`'s `JobQueue` interface went from stub to real, backed by
`DbJobQueueProvider` and the `PlanGenerationJob` table. Status transitions
(QUEUED → PROCESSING → COMPLETED/FAILED) happen inline in the same request today, since
no real queue/worker exists yet — Phase 10 swaps in BullMQ/Redis behind this same
interface. The interface itself was adjusted from its Phase 1 draft (dropped the
generic `type` field, `result` → `resultId`) once a real consumer showed what shape it
actually needed — see the interface file for details.

**Scope decisions** (deliberate, not omissions):
- Requirements (which room types) and Room Settings (their dimensions) are one
  combined step/model (`ProjectRoom`), not the spec's two separate steps — selecting a
  room type and sizing it happen together in the UI.
- `layoutData` on `Plan` is JSON, not normalized `Wall`/`Door`/`Window`/`Staircase`
  tables — the only consumer is rendering the whole layout at once; revisit if
  per-element querying/admin-editing becomes a real need.
- **Not built**: the full drag-to-move/resize/add/remove-room 2D editor with
  undo/redo (spec §23) — a separate, large subsystem from the viewer (spec §22, which
  *is* built). "Regenerate" is the current mechanism for adjusting a plan. PNG/PDF
  export (only SVG download exists) is Phase 10 scope, unchanged from before.

The project detail page's "design workflow" panel now links Plot Details, Requirements
& Room Settings, and 2D Plan for real, with completion state computed from actual data
— 3D View through Estimation are still "Soon".

## Phase 5 — 3D visualization

`ThreeDModel` generation, derived from the structured 2D plan (not authored
independently), rendered with Three.js/React Three Fiber, lazy-loaded so the 3D engine
never ships on unrelated pages. Exterior/interior tabs, orbit/zoom/pan controls.
Versioned like plans.

## Phase 6 — Elevation engine

`ElevationStyle`, `ElevationTemplate`, `ElevationMaterial`, `ElevationCustomization`
models; the `ElevationEngine` service generating front/left/right/rear elevations from
the 2D plan + 3D model + selected style/materials; the elevation viewer and
customization UI (walls, windows, doors, roof, balcony, exterior finish, lighting);
elevation versioning (save/duplicate/restore/delete). Reuses the job + storage infra
from Phase 4.

## Phase 7 — Estimation engine

Admin-managed `Rate` records (rate changes must preserve historical estimate values —
never mutate a rate a past `Estimate` already referenced), `EstimateItem` line items,
and the `EstimationEngine` service producing a category breakdown (construction,
electrical, plumbing, flooring, doors/windows, painting, kitchen, bathroom, elevation,
misc). Elevation customizations (stone/wood finish, glass railing, exterior lighting)
feed into the estimate when applicable.

## Phase 8 — Admin panel

SUPER_ADMIN surface for room types, elevation styles/templates/materials, construction
rates, users, audit logs, and system analytics. Every admin route reuses
`requireRole("SUPER_ADMIN")` from `src/server/auth/require-auth.ts` — the same pattern
established in Phase 2 for customer routes, not a new authorization mechanism.

## Phase 9 — Saved plans, favorites, notifications

`SavedPlan`, `Favorite`, `Notification` models; in-app notifications plus email
fan-out through the Phase 2 `EmailProvider` interface (no new email plumbing needed).

## Phase 10 — Exports

PDF/PNG/SVG export pipeline for 2D plans, elevations (individual + combined sheet),
and estimates — all branded, versioned, and carrying project/customer/date metadata.
This phase also swaps the Phase 1 stubs for real backends: `server/jobs` →
BullMQ/Redis, `server/storage` → real S3/R2 (from MinIO in dev), behind the same
interfaces so nothing above them changes.

## Phase 11 — Testing hardening

Expand unit/integration/e2e coverage across the generation engines, load-test
async job throughput, contract-test the `{ success, message, code, errors }` API
shape across every route (established in Phase 2, should hold everywhere).

## Phase 12 — Production hardening & launch

Observability/monitoring, activating the real Upstash rate limiter (dev used the
in-memory limiter), a full security review, CI/CD, SEO, accessibility audit, and
re-verifying the Auth.js v5 GA status (Phase 2 pinned a beta release — check for GA and
re-test the upgrade before shipping).

## Architectural disclaimer (spec §51 — must stay visible once generation ships)

"Generated plans and estimates are intended for planning and visualization purposes.
Final construction drawings should be reviewed and approved by a qualified
architect/engineer and comply with applicable local building regulations."
