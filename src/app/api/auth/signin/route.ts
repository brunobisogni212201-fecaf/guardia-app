import { NextResponse } from "next/server";
import { db, users, sessions } from "@/shared/lib/db";
import { hashData, generateToken } from "@/shared/lib/utils/hash";
import { eq } from "drizzle-orm";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "guardial-app.us.auth0.com";
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const loginResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "http://auth0.com/oauth/grant-type/password-realm",
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        scope: "openid profile email",
        realm: "Username-Password-Authentication",
        username: email,
        password,
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error("Auth0 login failed:", JSON.stringify(loginData));
      return NextResponse.json(
        { error: loginData.error_description || "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    const userInfoResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${loginData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error("Auth0 userinfo failed:", userInfoResponse.status);
      return NextResponse.json(
        { error: "Erro ao buscar informações do usuário" },
        { status: 500 }
      );
    }

    const userInfo = await userInfoResponse.json();
    console.log("Auth0 userinfo success:", userInfo.sub);

    const emailHash = hashData(email);
    let user = await db.query.users.findFirst({
      where: eq(users.emailHash, emailHash),
    });

    if (!user) {
      const userHash = hashData(`${email}:${Date.now()}`);
      const result = await db.insert(users).values({
        userHash,
        emailHash,
        auth0Sub: userInfo.sub,
        role: "user",
        emailVerified: userInfo.email_verified || true,
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

    const response = NextResponse.json({
      token: sessionToken,
      user: {
        id: user.id,
        email: email,
        role: user.role,
      },
    });

    response.cookies.set("auth_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth0 Auth Error:", error);
    return NextResponse.json(
      { error: "Erro ao processar autenticação" },
      { status: 500 }
    );
  }
}
