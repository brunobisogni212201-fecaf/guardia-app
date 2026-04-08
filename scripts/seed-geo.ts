/**
 * Seed de dados geográficos anonimizados para demo do mapa Brasil
 * Uso: DATABASE_URL=<prod_url> npx tsx scripts/seed-geo.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createHash } from "node:crypto";
import { helpRequestsGeo } from "../src/lib/db/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

function fuzz(coord: number, range = 0.3): number {
  return Number((coord + (Math.random() * 2 - 1) * range).toFixed(4));
}

function fakeIpHash(i: number): string {
  return createHash("sha256").update(`seed-demo-${i}`).digest("hex").slice(0, 32);
}

// Centros aproximados das capitais + cidades grandes, ponderados por população
const cities: { lat: number; lng: number; region: string; weight: number }[] = [
  { lat: -23.55, lng: -46.63, region: "São Paulo",            weight: 30 },
  { lat: -22.91, lng: -43.17, region: "Rio de Janeiro",       weight: 20 },
  { lat: -19.92, lng: -43.94, region: "Minas Gerais",         weight: 12 },
  { lat: -12.97, lng: -38.51, region: "Bahia",                weight: 8  },
  { lat: -3.72,  lng: -38.54, region: "Ceará",                weight: 7  },
  { lat: -8.05,  lng: -34.88, region: "Pernambuco",           weight: 7  },
  { lat: -25.43, lng: -49.27, region: "Paraná",               weight: 8  },
  { lat: -30.03, lng: -51.23, region: "Rio Grande do Sul",    weight: 8  },
  { lat: -27.60, lng: -48.55, region: "Santa Catarina",       weight: 6  },
  { lat: -3.10,  lng: -60.02, region: "Amazonas",             weight: 3  },
  { lat: -1.46,  lng: -48.50, region: "Pará",                 weight: 4  },
  { lat: -16.67, lng: -49.25, region: "Goiás",                weight: 5  },
  { lat: -15.78, lng: -47.93, region: "Distrito Federal",     weight: 5  },
  { lat: -5.09,  lng: -42.80, region: "Piauí",                weight: 2  },
  { lat: -2.53,  lng: -44.30, region: "Maranhão",             weight: 3  },
  { lat: -9.66,  lng: -35.74, region: "Alagoas",              weight: 2  },
  { lat: -10.91, lng: -37.07, region: "Sergipe",              weight: 2  },
  { lat: -7.12,  lng: -34.86, region: "Paraíba",              weight: 2  },
  { lat: -5.79,  lng: -35.21, region: "Rio Grande do Norte",  weight: 2  },
  { lat: -20.44, lng: -54.65, region: "Mato Grosso do Sul",   weight: 2  },
  { lat: -15.60, lng: -56.10, region: "Mato Grosso",          weight: 2  },
  { lat: -10.21, lng: -48.36, region: "Tocantins",            weight: 1  },
  { lat: -8.77,  lng: -63.90, region: "Rondônia",             weight: 1  },
  { lat: -20.32, lng: -40.34, region: "Espírito Santo",       weight: 3  },
  { lat: -9.97,  lng: -67.81, region: "Acre",                 weight: 1  },
  { lat: 2.82,   lng: -60.67, region: "Roraima",              weight: 1  },
  { lat: 0.04,   lng: -51.07, region: "Amapá",                weight: 1  },
];

// Expande para lista ponderada
const weighted: typeof cities = [];
for (const city of cities) {
  for (let i = 0; i < city.weight; i++) {
    weighted.push(city);
  }
}

async function seed() {
  const TOTAL = 250;
  console.log(`Inserindo ${TOTAL} registros de demo...`);

  const records = [];
  for (let i = 0; i < TOTAL; i++) {
    const city = weighted[Math.floor(Math.random() * weighted.length)];
    const daysAgo = Math.floor(Math.random() * 60); // últimos 60 dias
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    records.push({
      ipHash: fakeIpHash(i),
      lat: fuzz(city.lat, 0.5),
      lng: fuzz(city.lng, 0.5),
      region: city.region,
      country: "BR",
      cookieConsent: true,
      createdAt,
    });
  }

  // Insere em batches de 50
  for (let i = 0; i < records.length; i += 50) {
    await db.insert(helpRequestsGeo).values(records.slice(i, i + 50));
    console.log(`  ✅ ${Math.min(i + 50, records.length)}/${TOTAL}`);
  }

  console.log("\nSeed concluído!");
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  pool.end();
  process.exit(1);
});
