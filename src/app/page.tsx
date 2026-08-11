import Link from "next/link";
import {
  Compass,
  Ruler,
  Box,
  Building2,
  Calculator,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/server/auth/auth";
import { LogoutButton } from "@/features/auth/components/logout-button";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#resources", label: "Resources" },
];

const FEATURES = [
  {
    icon: Ruler,
    title: "2D Floor Plans",
    description: "Interactive, dimensioned floor plans generated from your plot and room requirements.",
  },
  {
    icon: Box,
    title: "3D Visualization",
    description: "Walk through a 3D model of your house, derived directly from your floor plan.",
  },
  {
    icon: Building2,
    title: "Elevations",
    description: "Front, left, right, and rear elevations with selectable architectural styles.",
  },
  {
    icon: Calculator,
    title: "Construction Estimates",
    description: "A category-by-category cost breakdown based on configurable construction rates.",
  },
];

const STEPS = [
  { step: "1", title: "Project & Plot", description: "Tell us your plot dimensions, orientation, and setbacks." },
  { step: "2", title: "Requirements", description: "Choose rooms — bedrooms, kitchen, puja room, parking, and more." },
  { step: "3", title: "Generate & Review", description: "Get your 2D plan, 3D view, elevations, and cost estimate." },
];

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-navy">
            planMyOwnHouse
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session?.user ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {session.user.fullName}
                </span>
                <Button size="sm" render={<Link href="/dashboard">Dashboard</Link>} />
                <LogoutButton />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" render={<Link href="/login">Login</Link>} />
                <Button size="sm" render={<Link href="/signup">Get Started</Link>} />
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="grid gap-6">
            <h1 className="text-4xl font-bold tracking-tight text-navy sm:text-5xl">
              Design Your Dream Home, Your Way
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Create personalized 2D and 3D house plans, explore exterior elevations, and get
              construction estimates based on your requirements.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                render={
                  <Link href="/signup">
                    Create Your Plan
                    <ArrowRight />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                render={<a href="#how-it-works">Explore How It Works</a>}
              />
            </div>
          </div>

          <div
            aria-hidden
            className="relative aspect-square rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
          >
            <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Illustrative architectural blueprint of a house">
              <rect x="10" y="10" width="180" height="180" rx="8" fill="none" stroke="var(--color-border)" strokeWidth="1" />
              <rect x="30" y="60" width="140" height="110" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
              <line x1="100" y1="60" x2="100" y2="170" stroke="var(--color-primary)" strokeWidth="1.5" />
              <line x1="30" y1="115" x2="100" y2="115" stroke="var(--color-primary)" strokeWidth="1.5" />
              <rect x="40" y="70" width="50" height="35" fill="var(--color-primary)" fillOpacity="0.08" />
              <rect x="110" y="70" width="50" height="90" fill="var(--color-primary)" fillOpacity="0.08" />
              <rect x="40" y="125" width="50" height="35" fill="var(--color-primary)" fillOpacity="0.08" />
              <polyline points="20,60 100,20 180,60" fill="none" stroke="var(--color-navy)" strokeWidth="2" />
              <circle cx="65" cy="87" r="16" fill="none" stroke="var(--color-navy)" strokeWidth="1" strokeDasharray="2 2" />
            </svg>
          </div>
        </section>

        <section id="features" className="border-t border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold text-navy">
              Everything you need to plan your home
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="grid gap-2">
                    <feature.icon className="size-6 text-primary" />
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold text-navy">How it works</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.step} className="grid gap-2 text-center">
                  <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {s.step}
                  </div>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="resources" className="border-t border-border bg-navy py-16 text-navy-foreground">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center">
            <Compass className="size-8" />
            <h2 className="text-2xl font-bold">Ready to design your dream home?</h2>
            <p className="max-w-md text-navy-foreground/80">
              Create a free account and generate your first 2D plan in minutes.
            </p>
            <Button
              size="lg"
              variant="secondary"
              render={
                <Link href="/signup">
                  Create Your Plan
                  <ArrowRight />
                </Link>
              }
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground">
          <p className="mx-auto max-w-2xl">
            Generated plans and estimates are intended for planning and visualization purposes.
            Final construction drawings should be reviewed and approved by a qualified
            architect/engineer and comply with applicable local building regulations.
          </p>
          <p className="mt-4">&copy; {new Date().getFullYear()} planMyOwnHouse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
