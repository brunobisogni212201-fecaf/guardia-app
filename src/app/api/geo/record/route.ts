import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";
import { helpRequestsGeo } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";

// Adiciona ruído aleatório ±range aos coords para anonimização
function fuzz(coord: number, range = 0.3): number {
  const noise = (Math.random() * 2 - 1) * range;
  return Number((coord + noise).toFixed(4));
}

function hashIp(ip: string): string {
  // Salt estático por instância — impede rainbow tables mas não varia por usuário
  const salt = process.env.IP_HASH_SALT ?? "guardia-geo-salt-2025";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 32);
}

function getRealIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRealIp(req);

    // Ignora IPs privados/localhost — sem dados úteis de geolocalização
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

    const ipHash = hashIp(ip);

    // Deduplicação: mesmo IP (hash) só registra 1x por dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await db
      .select({ id: helpRequestsGeo.id })
      .from(helpRequestsGeo)
      .where(
        and(
          eq(helpRequestsGeo.ipHash, ipHash),
          gte(helpRequestsGeo.createdAt, today)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // Geolocalização via ip-api.com (gratuito, server-side)
    let lat = 0;
    let lng = 0;
    let region = "Desconhecido";
    let country = "BR";

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
          country = geo.countryCode ?? "BR";
        }
      }
    } catch {
      // Geolocalização falhou — não bloqueia o registro
      lat = fuzz(-14.235, 3);   // Centro aproximado do Brasil com ruído maior
      lng = fuzz(-51.925, 5);
    }

    await db.insert(helpRequestsGeo).values({
      ipHash,
      lat,
      lng,
      region,
      country,
      cookieConsent: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[geo/record]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
