import { NextRequest, NextResponse } from "next/server";
import { db, sessions } from "@/shared/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  const response = NextResponse.json({ message: "Saiu com sucesso" });
  response.cookies.delete("auth_token");

  return response;
}