import bcrypt from "bcryptjs";

import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySessionToken,
} from "@/lib/auth-session";

export function getAuthUsername() {
  return String(process.env.AUTH_USERNAME || "").trim();
}

export function getAuthPasswordHash() {
  const raw = String(process.env.AUTH_PASSWORD_HASH || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!raw) return "";

  // Bcrypt déjà en clair (ex. injecté par Docker sans passer par dotenv-expand)
  if (raw.startsWith("$2")) return raw;

  // Base64 : Next.js expand les `$` dans .env et casse le hash bcrypt
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8").trim();
    if (decoded.startsWith("$2")) return decoded;
  } catch {
    // ignore
  }

  return raw;
}


export function isAuthConfigured() {
  return Boolean(
    getAuthUsername() && getAuthPasswordHash() && process.env.AUTH_SECRET
  );
}

export async function verifyCredentials(username, password) {
  const expectedUser = getAuthUsername();
  const hash = getAuthPasswordHash();

  if (!expectedUser || !hash) {
    return { ok: false, error: "Authentification non configurée." };
  }

  if (String(username || "").trim() !== expectedUser) {
    return { ok: false, error: "Identifiants invalides." };
  }

  const match = await bcrypt.compare(String(password || ""), hash);
  if (!match) {
    return { ok: false, error: "Identifiants invalides." };
  }

  return { ok: true, username: expectedUser };
}

export {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySessionToken,
};
