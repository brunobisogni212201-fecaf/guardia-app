import type { IdentifiedContact, ParsedConversation } from "@/types";
import {
  getGeminiJsonModel,
  isSafetyBlockedResponse,
} from "@/lib/gemini/model";
import { z } from "zod";

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
): Promise<IdentifiedContact> {
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
