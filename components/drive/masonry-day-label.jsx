"use client";

export function MasonryDayLabel({ label }) {
  if (!label) return null;

  return (
    <span className="whitespace-nowrap rounded-md bg-card px-2.5 py-0.5 text-[14px] font-medium text-muted-foreground shadow-sm">
      {label}
    </span>
  );
}
