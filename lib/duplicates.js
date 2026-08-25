export function duplicateGroupKey(file) {
  return `${file.space}|${file.name}|${file.size_bytes}`;
}

export function groupDuplicateFiles(files = []) {
  const groups = new Map();

  for (const file of files) {
    const key = duplicateGroupKey(file);
    const list = groups.get(key);
    if (list) list.push(file);
    else groups.set(key, [file]);
  }

  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      items: items.sort(
        (a, b) =>
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
      ),
    }))
    .sort((a, b) => {
      const nameCmp = a.items[0].name.localeCompare(b.items[0].name, "fr");
      if (nameCmp !== 0) return nameCmp;
      return String(a.items[0].space).localeCompare(String(b.items[0].space));
    });
}

export function spaceLabel(space) {
  if (space === "public") return "Public";
  if (space === "sixmyk") return "6-MyK";
  if (space === "regis") return "Régis";
  return space || "—";
}
