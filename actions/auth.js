"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifyCredentials,
} from "@/lib/auth";

export async function loginAction(_prevState, formData) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/").trim() || "/";

  const result = await verifyCredentials(username, password);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const token = await createSessionToken(result.username, {
    maxAge: SESSION_MAX_AGE,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, getSessionCookieOptions());

  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    ...getSessionCookieOptions({ maxAge: 0 }),
    maxAge: 0,
  });
  redirect("/login");
}
