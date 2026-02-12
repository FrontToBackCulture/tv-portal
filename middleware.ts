import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "portal_session";

function getSecret() {
  const secret = process.env.PORTAL_JWT_SECRET?.trim();
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page, API routes, and static assets through
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Extract domain from path (e.g., /lag → "lag")
  const domainMatch = pathname.match(/^\/([a-z0-9]+)$/);
  const domain = domainMatch?.[1];

  // No auth configured — allow everything
  const secret = getSecret();
  if (!secret) {
    return addFrameHeaders(NextResponse.next(), domain);
  }

  // Check how the page is being accessed
  const fetchDest = req.headers.get("sec-fetch-dest");
  const isIframe = fetchDest === "iframe";

  if (isIframe) {
    // Iframe request — allow it.
    // frame-ancestors header ensures only the correct domain can embed it.
    return addFrameHeaders(NextResponse.next(), domain);
  }

  // Direct navigation — require auth
  const sessionCookie = req.cookies.get(COOKIE_NAME);
  if (sessionCookie?.value) {
    try {
      await jwtVerify(sessionCookie.value, secret);
      return addFrameHeaders(NextResponse.next(), domain);
    } catch {
      // Expired or invalid — clear and redirect
      const response = redirectToLogin(req);
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  return redirectToLogin(req);
}

/**
 * Add Content-Security-Policy frame-ancestors header.
 * /lag → only lag.thinkval.io can iframe it.
 */
function addFrameHeaders(response: NextResponse, domain: string | undefined) {
  if (domain) {
    response.headers.set(
      "Content-Security-Policy",
      `frame-ancestors 'self' https://${domain}.thinkval.io`
    );
  } else {
    // Non-domain pages (home, etc) — no iframe allowed
    response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  }
  return response;
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
