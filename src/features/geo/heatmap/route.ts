import { NextRequest, NextResponse } from "next/server";
import { pool, helpRequestsGeo } from "@/shared/lib/db";
import { hashData } from "@/shared/lib/utils/hash";
import { desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const geoData = await pool.query(`
      SELECT 
        region,
        COUNT(*) as count,
        ROUND(AVG(lat)::numeric, 2) as avg_lat,
        ROUND(AVG(lng)::numeric, 2) as avg_lng
      FROM help_requests_geo
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY region
      ORDER BY count DESC
      LIMIT 100
    `);

    const regions = geoData.rows.map(row => ({
      region: row.region,
      count: parseInt(row.count),
      lat: parseFloat(row.avg_lat),
      lng: parseFloat(row.avg_lng),
    }));

    return NextResponse.json({ regions });
  } catch (error) {
    console.error("Heatmap error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    );
  }
}
