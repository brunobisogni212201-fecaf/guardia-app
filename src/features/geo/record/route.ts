import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/shared/lib/db";
import { hashData } from "@/shared/lib/utils/hash";

function fuzz(coord: number, range = 0.3): number {
  return Number((coord + (Math.random() * 2 - 1) * range).toFixed(4));
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] 
    || request.headers.get("x-real-ip") 
    || "unknown";

  if (
    ip === "unknown" ||
    ip.startsWith("127.") ||
    ip.startsWith("::1") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.")
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const ipHash = hashData(ip);
  let lat = fuzz(-14.235, 3);
  let lng = fuzz(-51.925, 5);
  let region = "Desconhecido";
  const country = "BR";

  try {
    const geoRes = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,regionName,lat,lon,countryCode`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (geoRes.ok) {
      const geo = await geoRes.json();
      if (geo.status === "success") {
        lat = fuzz(geo.lat);
        lng = fuzz(geo.lon);
        region = geo.regionName ?? "Desconhecido";
      }
    }
  } catch {
    // Geolocalização falhou — usa fallback
  }

  try {
    await pool.query(
      `INSERT INTO help_requests_geo (ip_hash, lat, lng, region, country, cookie_consent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ipHash, lat, lng, region, country, true]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Geo record error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
