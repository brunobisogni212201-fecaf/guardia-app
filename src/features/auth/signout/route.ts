import { NextRequest, NextResponse } from "next/server";
import { db, sessions } from "@/shared/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }

    const response = NextResponse.json({ message: "Logout realizado" });
    response.cookies.delete("auth_token");

    return response;
  } catch (error) {
    console.error("Signout error:", error);
    const response = NextResponse.json({ message: "Logout realizado" });
    response.cookies.delete("auth_token");
    return response;
  }
}
