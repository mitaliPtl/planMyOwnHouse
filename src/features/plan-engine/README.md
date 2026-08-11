# Plan Engine (Phase 4 — not implemented yet)

Houses the future `PlanGenerationEngine` service and 2D floor-plan viewer/editor
components. Input: plot, setbacks, floors, rooms, room dimensions, orientation, Vastu
rules. Output: structured plan data (Project → Floor → Rooms → Walls → Doors →
Windows → Stairs → Furniture → Dimensions), rendered as interactive SVG/canvas — never
a static image. See `docs/roadmap.md` for scope.
