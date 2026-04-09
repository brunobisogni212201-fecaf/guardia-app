import { NextRequest, NextResponse } from "next/server";
import { cognitoClient as client } from "@/features/auth/lib/cognito";
import { ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { db, users } from "@/shared/lib/db";
import { hashData } from "@/shared/lib/utils/hash";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email e código são obrigatórios" },
        { status: 400 }
      );
    }

    try {
      const confirmSignUpCommand = new ConfirmSignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
      });

      await client.send(confirmSignUpCommand);

      // Update local database
      const emailHash = hashData(email);
      await db.update(users)
        .set({ emailVerified: true })
        .where(eq(users.emailHash, emailHash));

      return NextResponse.json({
        message: "Email verificado com sucesso! Agora você pode fazer login.",
      });
    } catch (cognitoError: any) {
      console.error("Cognito Verify Error:", cognitoError.message);
      return NextResponse.json(
        { error: "Erro ao verificar código: " + (cognitoError.message || "Código inválido") },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Erro ao processar verificação" },
      { status: 500 }
    );
  }
}