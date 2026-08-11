/**
 * Design tokens as typed constants, mirroring the CSS custom properties in
 * `src/app/globals.css`. Tailwind-based UI should use the CSS variables/utility
 * classes directly; this module exists for non-Tailwind consumers (canvas/SVG
 * renderers in the future 2D/3D/elevation viewers) that need raw values in JS.
 *
 * Keep these in sync with globals.css by hand — there is no build-time link
 * between the two, since Tailwind v4 tokens live in CSS, not JS.
 */

export const colors = {
  primary: "#2563EB",
  navy: "#0F2747",
  white: "#FFFFFF",
  background: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#E4E7EC",
  muted: "#F4F6F8",
  mutedForeground: "#64748B",
  foreground: "#111827",
  destructive: "#DC2626",
} as const;

export const radius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.625rem",
  xl: "0.875rem",
  "2xl": "1.125rem",
} as const;

export const shadow = {
  card: "0 1px 2px 0 rgb(15 39 71 / 0.04), 0 1px 3px 0 rgb(15 39 71 / 0.06)",
  cardHover: "0 4px 12px 0 rgb(15 39 71 / 0.08)",
} as const;

export const typography = {
  fontSans: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontMono: "var(--font-geist-mono), ui-monospace, monospace",
} as const;

export const spacing = {
  xs: "0.5rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
} as const;
