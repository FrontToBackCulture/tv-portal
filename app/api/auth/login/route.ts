import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const COOKIE_NAME = "portal_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: NextRequest) {
  const secret = process.env.PORTAL_JWT_SECRET?.trim();
  const accessCode = process.env.PORTAL_ACCESS_CODE?.trim();

  if (!secret || !accessCode) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 500 }
    );
  }

  const { password } = await req.json();

  if (password !== accessCode) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  // Generate a session JWT
  const token = await new SignJWT({ access: "portal" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(new TextEncoder().encode(secret));

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
