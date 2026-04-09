import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "production",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
}
