# Integration tests (Phase 3+)

Real-database integration tests (auth APIs against a test Postgres instance, project
APIs once they exist) land here. Phase 1-2 relies on unit tests (`tests/unit`) with a
mocked Prisma client plus manual/curl verification — see the plan's verification steps.
