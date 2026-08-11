import Link from "next/link";
import { PlusCircle, Ruler, Box, Building2, Calculator, Download } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const ACTIONS = [
  { label: "Create New Plan", href: "/projects/new", icon: PlusCircle, comingSoon: false },
  { label: "Generate 2D Plan", href: "#", icon: Ruler, comingSoon: true },
  { label: "Generate 3D Design", href: "#", icon: Box, comingSoon: true },
  { label: "Generate Elevation", href: "#", icon: Building2, comingSoon: true },
  { label: "Generate Estimate", href: "#", icon: Calculator, comingSoon: true },
  { label: "Download & Share", href: "#", icon: Download, comingSoon: true },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ACTIONS.map((action) =>
        action.comingSoon ? (
          <Card key={action.label} className="opacity-60">
            <CardContent
              aria-disabled="true"
              className="grid cursor-not-allowed justify-items-center gap-2 py-4 text-center"
            >
              <action.icon className="size-5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Soon
              </span>
            </CardContent>
          </Card>
        ) : (
          <Link key={action.label} href={action.href}>
            <Card className="transition-shadow hover:shadow-[var(--shadow-card-hover)]">
              <CardContent className="grid justify-items-center gap-2 py-4 text-center">
                <action.icon className="size-5 text-primary" />
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        )
      )}
    </div>
  );
}
