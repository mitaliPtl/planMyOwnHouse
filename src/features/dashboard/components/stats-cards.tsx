import { FolderKanban, Ruler, Box, Building2, Calculator } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  stats: {
    totalProjects: number;
    plans2dGenerated: number;
    designs3dGenerated: number;
    elevationsGenerated: number;
    estimatesGenerated: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    { label: "Total Projects", value: stats.totalProjects, icon: FolderKanban },
    { label: "2D Plans Generated", value: stats.plans2dGenerated, icon: Ruler },
    { label: "3D Designs Generated", value: stats.designs3dGenerated, icon: Box },
    { label: "Elevations Generated", value: stats.elevationsGenerated, icon: Building2 },
    { label: "Estimates Generated", value: stats.estimatesGenerated, icon: Calculator },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="grid gap-2">
            <item.icon className="size-5 text-primary" />
            <p className="text-2xl font-bold text-navy">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
