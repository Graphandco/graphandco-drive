"use client";

import { Grid3x3, LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "grid", label: "Vue grille", icon: LayoutGrid },
  { id: "compact", label: "Vue compacte", icon: Grid3x3 },
  { id: "list", label: "Vue liste", icon: List },
];

export function DriveViewToggle({ layout, onChange }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-white/10 bg-black/20 p-0.5">
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={label}
          aria-pressed={layout === id}
          className={cn(layout === id && "bg-white/10")}
          onClick={() => onChange(id)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}
