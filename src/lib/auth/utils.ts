import crypto from "crypto";

export function hashData(data: string): string {
  return crypto.createHash("sha256").update(data.toLowerCase()).digest("hex");
}

export function generateUserHash(email: string, timestamp?: string): string {
  const salt = timestamp || new Date().toISOString().split("T")[0];
  return hashData(`${email}:${salt}`);
}

export function generateToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}