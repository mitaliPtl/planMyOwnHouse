"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";

import { SidebarNav } from "@/features/dashboard/components/sidebar-nav";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DashboardShellProps {
  user: { fullName: string };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = search.trim();
    router.push(query ? `/projects?q=${encodeURIComponent(query)}` : "/projects");
  }

  return (
    <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link href="/dashboard" className="text-lg font-bold text-navy">
            planMyOwnHouse
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-[var(--shadow-card-hover)]">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="text-lg font-bold text-navy">planMyOwnHouse</span>
              <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(false)}>
                <X className="size-4" />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>

          <form onSubmit={submitSearch} className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search your projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              aria-label="Search your projects"
            />
          </form>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/profile"
              className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
            >
              {user.fullName}
            </Link>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
