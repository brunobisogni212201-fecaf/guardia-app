import "dotenv/config";
import { Pool } from "pg";
import { faker } from "@faker-js/faker";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://guardia:Guardia2024!@guardia-db.catawsu2siuo.us-east-1.rds.amazonaws.com:5432/guardia";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CONVERSATION_TEMPLATES = [
  {
    messages: `12/03/2024 14:30 - João: Oi amor, onde você está?
12/03/2024 14:31 - Maria: No trabalho ainda
12/03/2024 14:32 - João: Já falou com aquele amigo seu de novo?
12/03/2024 14:33 - Maria: Que amigo? João, você sabe que não tem nada.
12/03/2024 14:35 - João: Não confio nesse cara. Me manda print da conversa.
12/03/2024 14:36 - Maria: João, isso é controlling. Não preciso te mostrar minhas conversas.
12/03/2024 14:38 - João: Se você não tem nada pra esconder, não tem problema.
12/03/2024 14:40 - Maria: Isso é meu direito. Para de ser assim.`,
    risk: "high",
  },
  {
    messages: `10/03/2024 20:15 - Pedro: Oi amor
10/03/2024 20:16 - Pedro: Quando você vai me responder?
10/03/2024 20:25 - Pedro: Oi
10/03/2024 20:30 - Pedro: Você está aí?
10/03/2024 20:45 - Pedro: Fala comigo
10/03/2024 21:00 - Pedro: Não vou parar de mandar mensagem até você responder
10/03/2024 21:15 - Pedro: Você está me ignorando? Isso é muito desrespeitoso
10/03/2024 21:30 - Pedro: Eu vou te encontrar em qualquer lugar que você estiver`,
    risk: "critical",
  },
  {
    messages: `08/03/2024 09:00 - Carlos: Bom dia querida
08/03/2024 09:05 - Carlos: Saiu de casa?
08/03/2024 09:10 - Ana: Sim, fui ao mercado
08/03/2024 09:15 - Carlos: Sozinha?
08/03/2024 09:16 - Ana: Sim, por quê?
08/03/2024 09:18 - Carlos: Não gosto de você sair sozinha, as pessoas vão pensar coisas
08/03/2024 09:20 - Ana: Carlos, eu preciso ter minha vida social
08/03/2024 09:22 - Carlos: Sua vida social é comigo. Quem são esses amigos que você valoriza mais que eu?`,
    risk: "high",
  },
  {
    messages: `15/03/2024 18:00 - Lucas: Oi
15/03/2024 18:05 - Julia: Oi Lucas, tudo bem?
15/03/2024 18:10 - Lucas: Tudo. Você saiu com suas amigas hoje né?
15/03/2024 18:12 - Julia: Sim, fomos no cinema
15/03/2024 18:15 - Lucas: Legal. Qual filme?
15/03/2024 18:20 - Julia: Um terror, bem bom!
15/03/2024 18:25 - Lucas: Legal, quero ver com você depois
15/03/2024 18:30 - Julia: Claro! Beijos`,
    risk: "low",
  },
  {
    messages: `20/03/2024 22:00 - Roberto: Vem cá agora
20/03/2024 22:05 - Fernanda: Roberto, é tarde. Não posso
20/03/2024 22:10 - Roberto: Ou você vem ou não vai mais sair de casa
20/03/2024 22:12 - Fernanda: Que isso Roberto, você está bem?
20/03/2024 22:15 - Roberto: Você sabe o que acontece com mulher que me abandona
20/03/2024 22:18 - Fernanda: Roberto, isso é uma ameaça?
20/03/2024 22:20 - Roberto: É uma promessa. Anda logo.`,
    risk: "critical",
  },
];

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

async function seed() {
  console.log("🌱 Seeding Guardiã database...\n");

  let inserted = 0;

  for (const template of CONVERSATION_TEMPLATES) {
    const contentHash = hashString(template.messages);
    const phoneHash = hashString(faker.phone.number());

    try {
      const result = await pool.query(
        `INSERT INTO conversations (source_type, raw_content, content_hash, participant_phone_hash, violence_score, risk_level, analysis_status, is_training_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          "text",
          template.messages,
          contentHash,
          phoneHash,
          template.risk === "critical" ? 8.5 : template.risk === "high" ? 6.5 : 2.5,
          template.risk,
          "completed",
          true,
        ]
      );

      const conversationId = result.rows[0].id;

      await pool.query(
        `INSERT INTO analyses (conversation_id, step, input_data, output_data, confidence, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          conversationId,
          "extraction",
          JSON.stringify({ textLength: template.messages.length }),
          JSON.stringify({ messageCount: template.messages.split("\n").length }),
          0.95,
          150,
        ]
      );

      await pool.query(
        `INSERT INTO analyses (conversation_id, step, output_data, confidence, duration_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          conversationId,
          "violence_analysis",
          JSON.stringify({
            patterns: [
              { type: "control", severity: 7 },
              { type: "manipulation", severity: 6 },
            ],
          }),
          0.85,
          2000,
        ]
      );

      await pool.query(
        `INSERT INTO contacts (conversation_id, phone_hash, risk_flags, violence_patterns)
         VALUES ($1, $2, $3, $4)`,
        [
          conversationId,
          phoneHash,
          JSON.stringify(template.risk === "critical" ? ["threat", "stalking"] : ["control"]),
          JSON.stringify(["excessive jealousy", "isolation attempts"]),
        ]
      );

      console.log(`✅ Conversation ${inserted + 1}: ${template.risk} risk`);
      inserted++;
    } catch (error) {
      console.error(`❌ Error inserting conversation:`, error);
    }
  }

  console.log(`\n✅ Seed completed! ${inserted} conversations inserted.`);
  await pool.end();
}

seed().catch(console.error);
