import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

export function hashPassword(password: string) {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split("$");
  if (parts.length !== 4) return false;
  const [algo, iterStr, salt, expectedHex] = parts;
  if (algo !== "pbkdf2_sha256") return false;
  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations) || iterations < 10_000) return false;

  const actualHex = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");

  try {
    return timingSafeEqual(Buffer.from(actualHex, "hex"), Buffer.from(expectedHex, "hex"));
  } catch {
    return false;
  }
}

