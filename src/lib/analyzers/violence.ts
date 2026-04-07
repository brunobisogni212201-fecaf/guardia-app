import type { ParsedConversation, ViolenceAnalysis } from "@/types";
import {
  getGeminiJsonModel,
  isSafetyBlockedResponse,
} from "@/lib/gemini/model";
import { z } from "zod";

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
