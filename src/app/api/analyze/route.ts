import { NextRequest, NextResponse } from "next/server";
import { createConversation, updateConversationAnalysis, createAnalysis, createContact } from "@/lib/db/queries";
import { parseText } from "@/lib/extractors/conversation";
import { extractContactInfo } from "@/lib/extractors/phone";
import { analyzeViolence } from "@/lib/analyzers/violence";
import { Anonymizer } from "@/lib/anonymizer";

export async function POST(request: NextRequest) {
  try {
    const { text, sourceType = "text" } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Texto da conversa é obrigatório" },
        { status: 400 }
      );
    }

    const contentHash = Anonymizer.generateContentHash(text);

    const conversation = await createConversation({
      sourceType,
      rawContent: text,
      contentHash,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Erro ao criar conversa" },
        { status: 500 }
      );
    }

    const conversationId = conversation.id;

    const startTime = Date.now();
    const parsedConversation = parseText(text);
    await createAnalysis({
      conversationId,
      step: "extraction",
      inputData: { textLength: text.length },
      outputData: parsedConversation,
      durationMs: Date.now() - startTime,
    });

    const contactInfo = await extractContactInfo(parsedConversation);
    const { phoneHashes, cpfHash } = Anonymizer.anonymizeConversation(text);
    
    const phoneHash = phoneHashes[0] || null;
    
    if (phoneHash) {
      await createContact({
        conversationId,
        phoneHash,
        cpfHash: cpfHash || undefined,
      });
    }

    await createAnalysis({
      conversationId,
      step: "phone_detection",
      inputData: { parsedConversation },
      outputData: contactInfo,
      confidence: contactInfo.confidence,
    });

    const violenceAnalysis = await analyzeViolence(parsedConversation);
    await createAnalysis({
      conversationId,
      step: "violence_analysis",
      inputData: { messageCount: parsedConversation.messages.length },
      outputData: violenceAnalysis,
      confidence: 0.9,
    });

    const anonymizedContent = Anonymizer.removePII(text);
    
    await updateConversationAnalysis(conversationId, {
      violenceScore: violenceAnalysis.score,
      riskLevel: violenceAnalysis.riskLevel,
      analysisStatus: "completed",
      rawContent: anonymizedContent,
    });

    return NextResponse.json({
      conversationId,
      violenceScore: violenceAnalysis.score,
      riskLevel: violenceAnalysis.riskLevel,
      patterns: violenceAnalysis.patterns,
      summary: violenceAnalysis.summary,
      recommendations: violenceAnalysis.recommendations,
      contactFound: {
        phone: contactInfo.phone ? "encontrado" : "não encontrado",
        name: contactInfo.name,
        cpf: contactInfo.cpf ? "encontrado" : "não encontrado",
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Erro ao processar análise" },
      { status: 500 }
    );
  }
}
