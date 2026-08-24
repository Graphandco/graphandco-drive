import { formatBytes } from "@/lib/format";

export function StoragePanel({ stats, buckets, error = null }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-base font-medium">Stockage</h2>
        <p className="text-sm text-muted-foreground">
          Utilisation globale et santé des buckets S3.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-muted-foreground">Fichiers</p>
          <p className="mt-1 text-2xl font-medium tabular-nums">
            {stats.data.fileCount}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="mt-1 text-2xl font-medium tabular-nums">
            {formatBytes(stats.data.totalBytes)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: "regis", label: "Régis (NAS)", data: buckets.regis },
          { key: "public", label: "Public", data: buckets.public },
          { key: "sixmyk", label: "Six-MyK (privé)", data: buckets.sixmyk },
        ].map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1">
              {item.data.ok
                ? `OK · ${item.data.bucket}`
                : `Erreur · ${item.data.error}`}
            </p>
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
