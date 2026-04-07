import { NextRequest, NextResponse } from "next/server";
import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashData } from "@/lib/auth/utils";
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

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 8 caracteres" },
        { status: 400 }
      );
    }

    const emailHash = hashData(email);
    const existingUser = await db.query.users.findFirst({
      where: eq(users.emailHash, emailHash),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      );
    }

    try {
      const signUpCommand = new SignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
        ],
      });

      const result = await client.send(signUpCommand);
      
      const userHash = hashData(`${email}:${Date.now()}`);
      
      await db.insert(users).values({
        userHash,
        emailHash,
        cognitoSub: result.UserSub,
        role: "user",
        emailVerified: false,
      });

      return NextResponse.json({
        message: "Conta criada! Verifique seu email para confirmar.",
      });
    } catch (cognitoError: any) {
      console.error("Cognito SignUp Error:", cognitoError.message);
      if (cognitoError.name === "UsernameExistsException") {
        return NextResponse.json(
          { error: "Email já cadastrado no sistema" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Erro ao criar usuário no Cognito: " + cognitoError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}