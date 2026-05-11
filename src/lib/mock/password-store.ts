// File-based password override for demo mode only.
// Allows the reset-password flow to work end-to-end without NetSuite.
// Next.js runs each API route in its own module so in-memory state is not shared.
import fs from "fs";
import path from "path";

const STORE_PATH = path.join(process.cwd(), ".demo-password.json");

export function getDemoPasswordHash(): string | null {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return (JSON.parse(raw) as { hash: string }).hash ?? null;
  } catch {
    return null;
  }
}

export function setDemoPasswordHash(hash: string): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify({ hash }), "utf-8");
}
