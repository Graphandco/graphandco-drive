import { isImageFile } from "@/lib/mime";

/** Breakpoints alignés sur la grille Tailwind (sm/md/lg/xl). */
export const MASONRY_BREAKPOINTS = {
  grid: [
    { minWidth: 1280, columns: 5 },
    { minWidth: 1024, columns: 4 },
    { minWidth: 768, columns: 3 },
    { minWidth: 640, columns: 2 },
    { minWidth: 0, columns: 1 },
  ],
  compact: [
    { minWidth: 1280, columns: 8 },
    { minWidth: 1024, columns: 6 },
    { minWidth: 768, columns: 5 },
    { minWidth: 640, columns: 4 },
    { minWidth: 0, columns: 3 },
  ],
};

export function getMasonryColumnCount(compact, viewportWidth) {
  const breakpoints = compact
    ? MASONRY_BREAKPOINTS.compact
    : MASONRY_BREAKPOINTS.grid;

  for (const breakpoint of breakpoints) {
    if (viewportWidth >= breakpoint.minWidth) {
      return breakpoint.columns;
    }
  }

  return 1;
}

/** Ratio largeur / hauteur pour le calcul du layout. */
export function getMasonryAspectRatio(item) {
  const width = Number(item.width_px);
  const height = Number(item.height_px);

  if (width > 0 && height > 0) {
    return width / height;
  }

  if (isImageFile({ mimeType: item.mime_type, name: item.name })) {
    return 4 / 3;
  }

  return 1;
}

/**
 * Masonry « colonne la plus basse » : ordre source préservé, remplissage gauche → droite.
 */
export function computeMasonryLayout({
  items,
  columnCount,
  gap,
  containerWidth,
}) {
  if (!items.length || columnCount < 1 || containerWidth <= 0) {
    return { positions: [], height: 0, columnWidth: 0 };
  }

  const columnWidth =
    (containerWidth - gap * (columnCount - 1)) / columnCount;
  const columnHeights = Array.from({ length: columnCount }, () => 0);
  const positions = [];

  for (const item of items) {
    let column = 0;
    for (let index = 1; index < columnCount; index += 1) {
      if (columnHeights[index] < columnHeights[column]) {
        column = index;
      }
    }

    const aspectRatio = item.aspectRatio > 0 ? item.aspectRatio : 1;
    const height = columnWidth / aspectRatio;
    const top = columnHeights[column];
    const left = column * (columnWidth + gap);

    positions.push({
      key: item.key,
      top,
      left,
      width: columnWidth,
      height,
      column,
    });

    columnHeights[column] += height + gap;
  }

  const height = Math.max(0, Math.max(...columnHeights) - gap);

  return { positions, height, columnWidth };
}

/** Regroupe les tuiles masonry par jour (ordre source = tri date). */
export function computeMasonryDayGroups(items, positionByKey, { getDayKey, getDayLabel }) {
  const groups = [];
  let currentDayKey = null;
  let currentGroup = null;

  for (const item of items) {
    const position = positionByKey.get(item.key);
    if (!position) continue;

    const dayKey = getDayKey(item);
    const bottom = position.top + position.height;

    if (dayKey !== currentDayKey) {
      if (currentGroup) groups.push(currentGroup);
      currentDayKey = dayKey;
      currentGroup = {
        dayKey,
        label: getDayLabel(item),
        top: position.top,
        bottom,
      };
      continue;
    }

    if (currentGroup) {
      currentGroup.top = Math.min(currentGroup.top, position.top);
      currentGroup.bottom = Math.max(currentGroup.bottom, bottom);
    }
  }

  if (currentGroup) groups.push(currentGroup);
  return groups;
}
