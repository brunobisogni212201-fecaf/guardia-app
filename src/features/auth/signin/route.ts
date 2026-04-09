import { NextRequest, NextResponse } from "next/server";
import { cognitoClient } from "@/features/auth/lib/cognito";
import { InitiateAuthCommand, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { db, users, sessions } from "@/shared/lib/db";
import { hashData, generateToken } from "@/shared/lib/utils/hash";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
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

      const authResult = await cognitoClient.send(initiateAuthCommand);

      const emailHash = hashData(email);
      let user = await db.query.users.findFirst({
        where: eq(users.emailHash, emailHash),
      });

      if (!user) {
        const getUserCommand = new GetUserCommand({
          AccessToken: authResult.AuthenticationResult?.AccessToken,
        });
        const cognitoUser = await cognitoClient.send(getUserCommand);
        
        const userHash = hashData(`${email}:${Date.now()}`);
        const result = await db.insert(users).values({
          userHash,
          emailHash,
          cognitoSub: cognitoUser.UserAttributes?.find(a => a.Name === "sub")?.Value,
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
      
      if (cognitoError.name === "UserNotConfirmedException") {
        return NextResponse.json(
          { error: "Email não verificado", code: "USER_NOT_CONFIRMED" },
          { status: 401 }
        );
      }

      if (cognitoError.name === "NotAuthorizedException") {
        return NextResponse.json(
          { error: "Email ou senha incorretos" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Erro ao fazer login: " + (cognitoError.message || "Erro desconhecido") },
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
