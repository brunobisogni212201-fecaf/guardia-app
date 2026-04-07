import { NextRequest, NextResponse } from "next/server";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { db } from "@/lib/db/client";
import { users, sessions } from "@/lib/db/schema";
import { hashData, generateToken } from "@/lib/auth/utils";
import { eq } from "drizzle-orm";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const emailHash = hashData(email);
    const user = await db.query.users.findFirst({
      where: eq(users.emailHash, emailHash),
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 }
      );
    }

    try {
      const initiateAuthCommand = new InitiateAuthCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const authResult = await client.send(initiateAuthCommand);

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
    } catch (cognitoError: any) {
      console.error("Cognito SignIn Error:", cognitoError.message);
      if (cognitoError.name === "NotAuthorizedException") {
        return NextResponse.json(
          { error: "Email ou senha incorretos" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Erro ao fazer login: " + cognitoError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    );
  }
}