import { createHash, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "ct_auth";

function expectedCookieValue(appPassword: string) {
  return createHash("sha256")
    .update(`${appPassword}|case-tracker`)
    .digest("hex");
}

export function isAuthCookieValid(cookieValue: string | undefined, appPassword: string) {
  if (!cookieValue) return false;
  const expected = expectedCookieValue(appPassword);
  if (cookieValue.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function authCookieValue(appPassword: string) {
  return expectedCookieValue(appPassword);
}

export function passwordsMatch(provided: string, expected: string) {
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

