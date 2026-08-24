"use client";

import { useEffect, useState } from "react";

const DEFAULT_ANCHOR_TOP = 72;

/** Date active selon la position de scroll dans la grille. */
export function useMasonryScrollDate({
  dayGroups,
  rootRef,
  enabled = false,
  anchorTop = DEFAULT_ANCHOR_TOP,
}) {
  const [label, setLabel] = useState(() => dayGroups[0]?.label ?? "");

  useEffect(() => {
    if (!enabled) {
      setLabel("");
      return;
    }

    if (!dayGroups.length) {
      return;
    }

    function resolveActiveGroup(root) {
      const gridTop = root.getBoundingClientRect().top;
      const yInGrid = anchorTop - gridTop;

      if (yInGrid < 0) return dayGroups[0];

      let active = dayGroups[0];
      for (const group of dayGroups) {
        if (group.top <= yInGrid) {
          active = group;
        } else {
          break;
        }
      }
      return active;
    }

    function update() {
      const root = rootRef.current;
      if (!root) return;
      const active = resolveActiveGroup(root);
      setLabel(active?.label ?? "");
    }

    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [dayGroups, enabled, anchorTop, rootRef]);

  return label;
}
