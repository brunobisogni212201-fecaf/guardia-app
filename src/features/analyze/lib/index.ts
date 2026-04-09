import type { ParsedConversation, ViolenceAnalysis, ConversationMessage } from "@/shared/types";
import { getGeminiJsonModel, isSafetyBlockedResponse } from "@/shared/lib/ai/gemini";
import { z } from "zod";

const WHATSAPP_DATE_REGEX = /(\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/;
const WHATSAPP_MESSAGE_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s*[-–]?\s*([^:]+):\s*(.*)$/;
const WHATSAPP_SYSTEM_MESSAGE = /^(\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s*[-–]?\s*(.*)$/;

export function parseWhatsAppText(text: string): ParsedConversation {
  const lines = text.split("\n");
  const messages: ConversationMessage[] = [];
  const participants = new Set<string>();
  let lastTimestamp = "";

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const messageMatch = trimmedLine.match(WHATSAPP_MESSAGE_REGEX);
    if (messageMatch) {
      const [, timestamp, author, content] = messageMatch;
      const cleanAuthor = author.trim();
      
      if (cleanAuthor && content.trim()) {
        messages.push({
          timestamp: normalizeTimestamp(timestamp),
          author: cleanAuthor,
          content: content.trim(),
          isGroup: false,
        });
        participants.add(cleanAuthor);
        lastTimestamp = timestamp;
      }
      continue;
    }

    const systemMatch = trimmedLine.match(WHATSAPP_SYSTEM_MESSAGE);
    if (systemMatch) {
      const [, timestamp, content] = systemMatch;
      if (!content.includes(":") && !content.includes("–")) {
        messages.push({
          timestamp: normalizeTimestamp(timestamp),
          author: "Sistema",
          content: content.trim(),
          isGroup: false,
        });
        lastTimestamp = timestamp;
        continue;
      }
    }

    if (lastTimestamp && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.content += " " + trimmedLine;
    }
  }

  const startDate = messages.length > 0 ? messages[0].timestamp : undefined;
  const endDate = messages.length > 0 ? messages[messages.length - 1].timestamp : undefined;

  return {
    messages,
    participants: Array.from(participants),
    startDate,
    endDate,
  };
}

function normalizeTimestamp(timestamp: string): string {
  const parts = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!parts) return timestamp;
  
  let [, day, month, year] = parts;
  if (year.length === 2) {
    year = parseInt(year) > 50 ? "19" + year : "20" + year;
  }
  
  const timeMatch = timestamp.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  const time = timeMatch ? timeMatch[1] : "00:00";
  
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${time}`;
}

export function parsePlainText(text: string): ParsedConversation {
  const lines = text.split("\n").filter((l) => l.trim());
  const messages: ConversationMessage[] = [];
  const participants = new Set<string>();

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0 && colonIndex < 50) {
      const author = line.substring(0, colonIndex).trim();
      const content = line.substring(colonIndex + 1).trim();
      
      if (author && content && content.length > 0) {
        messages.push({
          timestamp: new Date().toISOString(),
          author,
          content,
          isGroup: false,
        });
        participants.add(author);
      }
    } else if (messages.length > 0) {
      messages[messages.length - 1].content += " " + line.trim();
    }
  }

  return {
    messages,
    participants: Array.from(participants),
  };
}

export function parseText(text: string): ParsedConversation {
  if (WHATSAPP_DATE_REGEX.test(text)) {
    return parseWhatsAppText(text);
  }
  return parsePlainText(text);
}

const EXTRACTION_PROMPT = `Você é um especialista em identificar informações pessoais em conversas de WhatsApp.

Analise a conversa abaixo e extraia:
1. Número de telefone do contato (formato brasileiro: +55 XX XXXXX-XXXX)
2. Nome da pessoa
3. CPF se estiver presente

Responda APENAS em JSON com este formato:
{
  "phone": "numero ou null",
  "name": "nome ou null",
  "cpf": "cpf ou null",
  "confidence": 0.0 a 1.0
}

Se não encontrar alguma informação, use null.

CONVERSA:
{messages}
`;

const extractedContactSchema = z.object({
  phone: z.string().nullable().default(null),
  name: z.string().nullable().default(null),
  cpf: z.string().nullable().default(null),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
});

export async function extractContactInfo(
  conversation: ParsedConversation
) {
  const model = getGeminiJsonModel(
    "Extraia informações de contato com precisão e retorne apenas JSON válido."
  );

  const messagesText = conversation.messages
    .slice(0, 50)
    .map((m) => `[${m.author}]: ${m.content}`)
    .join("\n");

  const prompt = EXTRACTION_PROMPT.replace("{messages}", messagesText);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    if (isSafetyBlockedResponse(response)) {
      return {
        phone: null,
        name: null,
        cpf: null,
        confidence: 0,
      };
    }

    const text = response.text();
    const parsed = extractedContactSchema.parse(JSON.parse(text));
    return {
      phone: parsed.phone,
      name: parsed.name,
      cpf: parsed.cpf,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error("Gemini extraction error:", error);
  }

  return {
    phone: null,
    name: null,
    cpf: null,
    confidence: 0,
  };
}

const VIOLENCE_ANALYSIS_PROMPT = `Você é um especialista em identificar violência psicológica e comportamento abusivo em relacionamentos.

Analise a conversa de WhatsApp abaixo e identifique:
1. Score de violência (0-10)
2. Nível de risco: low (0-3), medium (4-6), high (7-8), critical (9-10)
3. Padrões de violência identificados
4. Se há ciclo da violência (Tensão -> Explosão -> Lua de Mel)
5. Resumo da análise
6. Recomendações para a pessoa

Padrões de violência para identificar:
- controle: tentativas de controlar roupas, amizades, celular, dinheiro
- threat: ameaças explícitas ou veladas
- manipulation: manipulação psicológica, culpa, chantagem emocional
- isolation: tentativas de isolar da família/amigos
- verbal_abuse: insultos, xingamentos, humilhação
- stalking: insistência excessiva, mensagens constantes, ciúmes obsessivo
- gaslighting: distorção da realidade, fazer a vítima duvidar da própria memória/percepção
- love_bombing: excesso de afeto/idealização para controle, alternando com desvalorização

Responda APENAS em JSON com este formato:
{
  "score": 0.0 a 10.0,
  "riskLevel": "low|medium|high|critical",
  "patterns": [
    {
      "type": "control|threat|manipulation|isolation|verbal_abuse|stalking|gaslighting|love_bombing",
      "severity": 1 a 10,
      "evidence": ["citação específica da conversa"],
      "description": "descrição do padrão identificado"
    }
  ],
  "cycleOfViolence": {
    "stage": "tension|explosion|honeymoon|mixed|not_detected",
    "confidence": 0.0 a 1.0,
    "evidence": ["trechos que justificam o estágio detectado"]
  },
  "summary": "resumo da análise em 2-3 frases",
  "recommendations": ["recomendação 1", "recomendação 2"]
}

CONVERSA:
{messages}
`;

const SYSTEM_INSTRUCTION =
  "Sua missão é analisar conversas para proteção de mulheres, priorizando detecção de risco e evidências textuais. Não omita sinais de abuso psicológico. Retorne estritamente JSON válido.";

const violenceAnalysisSchema = z.object({
  score: z.coerce.number().min(0).max(10).default(0),
  riskLevel: z
    .enum(["low", "medium", "high", "critical"])
    .default("low"),
  patterns: z
    .array(
      z.object({
        type: z.enum([
          "control",
          "threat",
          "manipulation",
          "isolation",
          "verbal_abuse",
          "stalking",
          "gaslighting",
          "love_bombing",
        ]),
        severity: z.coerce.number().min(1).max(10).default(1),
        evidence: z.array(z.string()).default([]),
        description: z.string().default(""),
      })
    )
    .default([]),
  cycleOfViolence: z
    .object({
      stage: z
        .enum(["tension", "explosion", "honeymoon", "mixed", "not_detected"])
        .default("not_detected"),
      confidence: z.coerce.number().min(0).max(1).default(0),
      evidence: z.array(z.string()).default([]),
    })
    .default({
      stage: "not_detected",
      confidence: 0,
      evidence: [],
    }),
  summary: z.string().default("Análise não disponível"),
  recommendations: z.array(z.string()).default([]),
});

function emptyAnalysis(summary = "Análise não disponível"): ViolenceAnalysis {
  return {
    score: 0,
    riskLevel: "low",
    patterns: [],
    cycleOfViolence: {
      stage: "not_detected",
      confidence: 0,
      evidence: [],
    },
    summary,
    recommendations: [],
  };
}

export async function analyzeViolence(
  conversation: ParsedConversation
): Promise<ViolenceAnalysis> {
  const model = getGeminiJsonModel(SYSTEM_INSTRUCTION);

  const messagesText = conversation.messages
    .map((m) => `[${m.author}]: ${m.content}`)
    .join("\n");

  const prompt = VIOLENCE_ANALYSIS_PROMPT.replace("{messages}", messagesText);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (isSafetyBlockedResponse(response)) {
      return emptyAnalysis("Resposta bloqueada por configuração de segurança");
    }

    const text = response.text();
    const parsed = violenceAnalysisSchema.parse(JSON.parse(text));

    return {
      score: parsed.score,
      riskLevel: parsed.riskLevel,
      patterns: parsed.patterns,
      cycleOfViolence: parsed.cycleOfViolence,
      summary: parsed.summary,
      recommendations: parsed.recommendations,
    };
  } catch (error) {
    console.error("Gemini violence analysis error:", error);
    return emptyAnalysis("Análise não disponível");
  }
}

export function getRiskLevelFromScore(score: number): ViolenceAnalysis["riskLevel"] {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}
