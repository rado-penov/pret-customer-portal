import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "portal_session";
const SECURE = process.env.NODE_ENV === "production" ? "; Secure" : "";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/invite",
  "/reset-password",
  "/api/auth/reset-password",
  "/api/smtpcheck",
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  // Redirect authenticated users away from /login so the NavBar never appears there
  if (path.startsWith("/login")) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      try {
        await jwtVerify(token, secret);
        return NextResponse.redirect(new URL("/dashboard", req.url));
      } catch {
        // Token invalid — fall through to show the login page
      }
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    const { payload } = await jwtVerify(token, secret);

    // Slide the session: reissue a fresh 30-min token on every authenticated request
    const { exp: _exp, iat: _iat, ...user } = payload;
    const newToken = await new SignJWT(user)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30m")
      .sign(secret);

    const res = NextResponse.next();
    res.headers.append(
      "Set-Cookie",
      `${COOKIE_NAME}=${newToken}; HttpOnly${SECURE}; SameSite=Lax; Path=/; Max-Age=1800`
    );
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};
