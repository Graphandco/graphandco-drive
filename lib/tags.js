/** Parse une chaîne de tags (virgules / points-virgules). */
export function parseTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/[,;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Fusionne des tags en préservant l’ordre, sans doublon (insensible à la casse). */
export function mergeTags(existing, toAdd) {
  const result = [];
  const seen = new Set();

  for (const tag of [...parseTags(existing), ...parseTags(toAdd)]) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }

  return result;
}

export function formatTags(tags) {
  const list = parseTags(tags);
  return list.length ? list.join(", ") : null;
}

export function itemSelectionKey(item) {
  return `${item.kind}:${item.id}`;
}
