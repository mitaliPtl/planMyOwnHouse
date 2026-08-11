# Admin (Phase 8 — not implemented yet)

Houses the future SUPER_ADMIN surface: room types, elevation styles/templates/
materials, construction rates, users, audit logs, system analytics. All admin routes
will reuse `requireRole("SUPER_ADMIN")` from `src/server/auth/require-auth.ts`, the
same pattern this phase establishes for customer routes. See `docs/roadmap.md`.
