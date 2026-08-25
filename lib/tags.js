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

/** Remplace un tag par un autre dans une chaîne CSV. */
export function replaceTag(tags, fromTag, toTag) {
  const fromKey = String(fromTag || "").trim().toLowerCase();
  const to = String(toTag || "").trim();
  if (!fromKey || !to) return parseTags(tags);

  const result = [];
  const seen = new Set();

  for (const tag of parseTags(tags)) {
    const next = tag.toLowerCase() === fromKey ? to : tag;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(next);
  }

  return result;
}

/** Retire un ou plusieurs tags d’une chaîne CSV. */
export function removeTags(tags, tagsToRemove) {
  const removeKeys = new Set(
    parseTags(tagsToRemove).map((tag) => tag.toLowerCase())
  );
  if (!removeKeys.size) return parseTags(tags);

  return parseTags(tags).filter((tag) => !removeKeys.has(tag.toLowerCase()));
}

export function formatTags(tags) {
  const list = parseTags(tags);
  return list.length ? list.join(", ") : null;
}

export function itemSelectionKey(item) {
  return `${item.kind}:${item.id}`;
}
