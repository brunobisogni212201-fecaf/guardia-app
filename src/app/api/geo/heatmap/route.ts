import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { helpRequestsGeo } from "@/lib/db/schema";
import { gte, sql } from "drizzle-orm";

export const revalidate = 300; // cache 5 minutos no Edge

export async function GET() {
  try {
    // Apenas últimos 90 dias, max 800 pontos, sem dados identificáveis
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const rows = await db
      .select({
        lat: helpRequestsGeo.lat,
        lng: helpRequestsGeo.lng,
        region: helpRequestsGeo.region,
      })
      .from(helpRequestsGeo)
      .where(gte(helpRequestsGeo.createdAt, since))
      .orderBy(sql`random()`)
      .limit(800);

    // Agrega por região para estatísticas (sem expor pontos individuais além do necessário)
    const regionCounts: Record<string, number> = {};
    for (const r of rows) {
      const key = r.region ?? "Desconhecido";
      regionCounts[key] = (regionCounts[key] ?? 0) + 1;
    }

    const total = rows.length;

    return NextResponse.json(
      {
        points: rows.map((r) => ({ lat: r.lat, lng: r.lng })),
        regions: Object.entries(regionCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count })),
        total,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("[geo/heatmap]", err);
    return NextResponse.json({ points: [], regions: [], total: 0 });
  }
}
