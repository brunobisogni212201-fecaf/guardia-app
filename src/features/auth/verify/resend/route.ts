import { NextRequest, NextResponse } from "next/server";
import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
      });

      await client.send(command);

      return NextResponse.json({
        message: "Código reenviado com sucesso! Verifique seu email.",
      });
    } catch (cognitoError: any) {
      console.error("Cognito Resend Error:", cognitoError.message);
      return NextResponse.json(
        { error: "Erro ao reenviar código: " + (cognitoError.message || "Erro desconhecido") },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json(
      { error: "Erro ao processar reenvio de código" },
      { status: 500 }
    );
  }
}
