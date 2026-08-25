const encoder = new TextEncoder();

export const SESSION_COOKIE = "drive-session";
export const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

function getAuthSecret() {
  return String(process.env.AUTH_SECRET || "").trim();
}

function toBase64Url(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signPayload(payloadB64, secret) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadB64)
  );
  return toBase64Url(signature);
}

/** Crée un token de session signé (username + expiration). */
export async function createSessionToken(username, { maxAge = SESSION_MAX_AGE } = {}) {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET manquant.");
  }

  const payload = {
    u: String(username || "").trim(),
    exp: Math.floor(Date.now() / 1000) + maxAge,
  };
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signPayload(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/** Vérifie le token ; retourne { username, exp } ou null. */
export async function verifySessionToken(token) {
  try {
    const secret = getAuthSecret();
    if (!secret) return null;

    const raw = String(token || "");
    const dot = raw.lastIndexOf(".");
    if (dot <= 0) return null;

    const payloadB64 = raw.slice(0, dot);
    const signature = raw.slice(dot + 1);
    if (!payloadB64 || !signature) return null;

    const expected = await signPayload(payloadB64, secret);
    if (!timingSafeEqual(signature, expected)) return null;

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadJson);
    if (!payload?.u || !payload?.exp) return null;
    if (Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;

    return { username: String(payload.u), exp: Number(payload.exp) };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions({ maxAge = SESSION_MAX_AGE } = {}) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
