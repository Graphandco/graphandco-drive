import { CheckCircle2, CircleX } from "lucide-react";

import { formatBytes } from "@/lib/format";

const BUCKETS = [
  { key: "regis", label: "Régis (NAS)" },
  { key: "public", label: "Public" },
  { key: "sixmyk", label: "Six-MyK (privé)" },
];

export function StoragePanel({ stats, buckets, spaceStats = {}, error = null }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-medium">Stockage</h2>
          <p className="text-sm text-muted-foreground">
            Utilisation par espace et santé des buckets S3.
          </p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {stats.data.fileCount} fichier{stats.data.fileCount > 1 ? "s" : ""}
          <span className="mx-1.5 text-white/20">·</span>
          {formatBytes(stats.data.totalBytes)} au total
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
        {BUCKETS.map((item) => {
          const health = buckets[item.key];
          const usage = spaceStats[item.key]?.data || {
            fileCount: 0,
            totalBytes: 0,
          };
          const healthy = health?.ok;
          const statusTitle = healthy
            ? `Bucket accessible · ${health.bucket}`
            : health?.error || "Bucket indisponible";

          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5"
              title={statusTitle}
            >
              <div className="flex min-w-0 items-center gap-2">
                {healthy ? (
                  <CheckCircle2
                    className="size-4 shrink-0 text-emerald-400"
                    aria-label="Bucket accessible"
                  />
                ) : (
                  <CircleX
                    className="size-4 shrink-0 text-destructive"
                    aria-label="Bucket indisponible"
                  />
                )}
                <p className="truncate text-sm font-medium">{item.label}</p>
              </div>

              <div className="shrink-0 text-right tabular-nums">
                <p className="text-sm leading-tight">
                  {usage.fileCount} fichier{usage.fileCount > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(usage.totalBytes)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
