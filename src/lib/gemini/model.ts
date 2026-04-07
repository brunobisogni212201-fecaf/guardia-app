import {
  FinishReason,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

export function getGeminiJsonModel(systemInstruction: string) {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
}

export function isSafetyBlockedResponse(response: {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string }>;
}): boolean {
  if (response.promptFeedback?.blockReason === "SAFETY") {
    return true;
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  return finishReason === FinishReason.SAFETY;
}
