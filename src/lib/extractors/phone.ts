import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IdentifiedContact, ParsedConversation } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

export async function extractContactInfo(
  conversation: ParsedConversation
): Promise<IdentifiedContact> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const messagesText = conversation.messages
    .slice(0, 50)
    .map((m) => `[${m.author}]: ${m.content}`)
    .join("\n");

  const prompt = EXTRACTION_PROMPT.replace("{messages}", messagesText);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        phone: parsed.phone,
        name: parsed.name,
        cpf: parsed.cpf,
        confidence: parsed.confidence || 0.5,
      };
    }
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
