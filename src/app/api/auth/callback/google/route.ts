import { NextRequest, NextResponse } from "next/server";
import { db, users, sessions } from "@/shared/lib/db";
import { hashData, generateToken } from "@/shared/lib/utils/hash";
import { eq } from "drizzle-orm";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "guardial-app.us.auth0.com";
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

async function getAccessToken(code: string) {
  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: "https://irisregistro.qzz.io/api/auth/callback/google",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get access token");
  }

  return response.json();
}

async function getUserInfo(accessToken: string) {
  const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    const tokenData = await getAccessToken(code);
    const userInfo = await getUserInfo(tokenData.access_token);

    const email = userInfo.email;
    const name = userInfo.name;
    const auth0Id = userInfo.sub;

    const emailHash = hashData(email);
    let user = await db.query.users.findFirst({
      where: eq(users.emailHash, emailHash),
    });

    if (!user) {
      const userHash = hashData(`${email}:${Date.now()}`);
      const nameHash = name ? hashData(name) : null;

      const result = await db.insert(users).values({
        userHash,
        emailHash,
        nameHash,
        auth0Sub: auth0Id,
        auth0Provider: "google",
        role: "user",
        emailVerified: true,
      }).returning();

      user = result[0];
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const sessionToken = generateToken();

    await db.insert(sessions).values({
      userId: user.id,
      token: sessionToken,
      expiresAt,
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set("auth_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
