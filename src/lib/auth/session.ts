import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "@/types";

const COOKIE_NAME = "portal_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

const SECURE = process.env.NODE_ENV === "production" ? "; Secure" : "";

export function setSessionCookie(token: string, response: Response): void {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly${SECURE}; SameSite=Lax; Path=/; Max-Age=28800`
  );
}

export function clearSessionCookie(response: Response): void {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly${SECURE}; SameSite=Lax; Path=/; Max-Age=0`
  );
}
