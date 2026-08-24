"use client";

import { useMemo, useRef } from "react";

import { MasonryStickyDateBadge } from "@/components/drive/masonry-sticky-date-badge";
import { useMasonry } from "@/hooks/use-masonry";
import { useMasonryScrollDate } from "@/hooks/use-masonry-scroll-date";
import { formatDayLabel, getFileDayKey } from "@/lib/format";
import { computeMasonryDayGroups, getMasonryAspectRatio } from "@/lib/masonry";
import { itemSelectionKey } from "@/lib/tags";

function getDayLabelFromItem(item) {
  return formatDayLabel(item.captured_at || item.created_at);
}

export function MasonryGrid({
  items,
  compact,
  showDayLabels = false,
  children,
}) {
  const rootRef = useRef(null);

  const masonryItems = useMemo(
    () =>
      items.map((item) => ({
        key: itemSelectionKey(item),
        aspectRatio: getMasonryAspectRatio(item),
        item,
      })),
    [items],
  );

  const gap = compact ? 6 : 8;
  const { containerRef, layout } = useMasonry({
    items: masonryItems,
    compact,
    gap,
  });

  const positionByKey = useMemo(() => {
    const map = new Map();
    for (const position of layout.positions) {
      map.set(position.key, position);
    }
    return map;
  }, [layout.positions]);

  const dayGroups = useMemo(() => {
    if (!showDayLabels) return [];

    return computeMasonryDayGroups(masonryItems, positionByKey, {
      getDayKey: (entry) => getFileDayKey(entry.item),
      getDayLabel: (entry) => getDayLabelFromItem(entry.item),
    });
  }, [showDayLabels, masonryItems, positionByKey]);

  const activeDayLabel = useMasonryScrollDate({
    dayGroups,
    rootRef,
    enabled: showDayLabels,
  });

  const displayLabel =
    activeDayLabel ||
    (showDayLabels && items[0]
      ? getDayLabelFromItem(items[0])
      : "");

  return (
    <div ref={rootRef} className="relative w-full">
      {showDayLabels && displayLabel ? (
        <MasonryStickyDateBadge label={displayLabel} rootRef={rootRef} />
      ) : null}

      <ul
        ref={containerRef}
        className="relative w-full"
        style={layout.height > 0 ? { height: layout.height } : undefined}
      >
        {masonryItems.map((entry, index) => {
          const position = positionByKey.get(entry.key);
          if (!position) return null;

          return children({
            item: entry.item,
            index,
            position,
            key: `${entry.item.kind}-${entry.item.id}`,
          });
        })}
      </ul>
    </div>
  );
}
