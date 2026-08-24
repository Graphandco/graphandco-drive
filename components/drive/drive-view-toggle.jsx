"use client";

import { Grid3x3, LayoutGrid, List } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { springSnappy } from "@/lib/motion";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "grid", label: "Vue grille", icon: LayoutGrid },
  { id: "compact", label: "Vue compacte", icon: Grid3x3 },
  { id: "list", label: "Vue liste", icon: List },
];

export function DriveViewToggle({ layout, onChange }) {
  return (
    <div className="relative inline-flex items-center rounded-lg border border-white/10 bg-black/20 p-0.5">
      {VIEWS.map(({ id, label, icon: Icon }) => {
        const active = layout === id;
        return (
          <Button
            key={id}
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={label}
            aria-pressed={active}
            className={cn("relative z-10", active && "text-white")}
            onClick={() => onChange(id)}
          >
            {active ? (
              <motion.span
                layoutId="view-toggle-pill"
                className="absolute inset-0 rounded-md bg-white/10"
                transition={springSnappy}
              />
            ) : null}
            <Icon className="relative z-10" />
          </Button>
        );
      })}
    </div>
  );
}
