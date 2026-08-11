// no-op — see vitest.config.ts alias. The real "server-only" package unconditionally
// throws outside Next.js's RSC bundler (it only no-ops under the "react-server"
// resolution condition), which Vitest doesn't set.
export {};
