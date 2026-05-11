export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export { DEMO_USER } from "./data";
