"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#100e0b] p-6 text-white">
        <h2 className="text-lg font-medium">Une erreur est survenue</h2>
        <p className="max-w-md text-center text-sm text-white/60">
          {error?.message || "Impossible d’afficher cette page."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
