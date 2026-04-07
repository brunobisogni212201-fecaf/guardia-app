import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ViolenceAnalysis,
  ViolencePattern,
  ParsedConversation,
} from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const VIOLENCE_ANALYSIS_PROMPT = `Você é um especialista em identificar violência psicológica e comportamento abusivo em relacionamentos.

Analise a conversa de WhatsApp abaixo e identifique:
1. Score de violência (0-10)
2. Nível de risco: low (0-3), medium (4-6), high (7-8), critical (9-10)
3. Padrões de violência identificados
4. Resumo da análise
5. Recomendações para a pessoa

Padrões de violência para identificar:
- controle: tentativas de controlar roupas, amizades, celular, dinheiro
- threat: ameaças explícitas ou veladas
- manipulation: manipulação psicológica, culpa, chantagem emocional
- isolation: attempts to isolate from family/friends
- verbal_abuse: insultos, xingamentos, humilhação
- stalking: insistência excessiva, mensagens constantes, ciúmes патологический

Responda APENAS em JSON com este formato:
{
  "score": 0.0 a 10.0,
  "riskLevel": "low|medium|high|critical",
  "patterns": [
    {
      "type": "control|threat|manipulation|isolation|verbal_abuse|stalking",
      "severity": 1 a 10,
      "evidence": ["citação específica da conversa"],
      "description": "descrição do padrão identificado"
    }
  ],
  "summary": "resumo da análise em 2-3 frases",
  "recommendations": ["recomendação 1", "recomendação 2"]
}

CONVERSA:
{messages}
`;

export async function analyzeViolence(
  conversation: ParsedConversation
): Promise<ViolenceAnalysis> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const messagesText = conversation.messages
    .map((m) => `[${m.author}]: ${m.content}`)
    .join("\n");

  const prompt = VIOLENCE_ANALYSIS_PROMPT.replace("{messages}", messagesText);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: parsed.score,
        riskLevel: parsed.riskLevel,
        patterns: parsed.patterns || [],
        summary: parsed.summary,
        recommendations: parsed.recommendations || [],
      };
    }
  } catch (error) {
    console.error("Gemini violence analysis error:", error);
  }

  return {
    score: 0,
    riskLevel: "low",
    patterns: [],
    summary: "Análise não disponível",
    recommendations: [],
  };
}

export function getRiskLevelFromScore(score: number): ViolenceAnalysis["riskLevel"] {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}
