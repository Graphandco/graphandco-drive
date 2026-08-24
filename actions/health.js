"use server";

import { pingDatabase } from "@/lib/db";

export async function checkDatabaseHealth() {
  if (!process.env.DB_DATABASE || !process.env.DB_USER) {
    return {
      ok: false,
      error: "Configuration MySQL incomplète (DB_DATABASE, DB_USER).",
    };
  }

  try {
    await pingDatabase();
    return { ok: true };
  } catch (error) {
    console.error("checkDatabaseHealth:", error);
    return {
      ok: false,
      error: error?.message || "Impossible de joindre la base MySQL.",
    };
  }
}
