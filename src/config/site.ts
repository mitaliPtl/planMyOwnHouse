import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  Calculator,
  Bookmark,
  Building2,
  UserCircle,
  LifeBuoy,
  Settings,
} from "lucide-react";

export const siteConfig = {
  name: "planMyOwnHouse",
  description:
    "Create personalized 2D and 3D house plans, explore exterior elevations, and get construction estimates based on your requirements.",
};

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Not built yet (Phase 4+) — rendered disabled with a "Soon" badge instead of a dead link. */
  comingSoon?: boolean;
}

export const dashboardNav: DashboardNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Projects", href: "/projects", icon: FolderKanban },
  { label: "Create New Plan", href: "/projects/new", icon: PlusCircle },
  { label: "Estimates", href: "/estimates", icon: Calculator, comingSoon: true },
  { label: "Saved Plans", href: "/saved-plans", icon: Bookmark, comingSoon: true },
  { label: "Elevations", href: "/elevations", icon: Building2, comingSoon: true },
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Support", href: "/support", icon: LifeBuoy, comingSoon: true },
  { label: "Settings", href: "/settings", icon: Settings, comingSoon: true },
];
