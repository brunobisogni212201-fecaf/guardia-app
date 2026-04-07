import type { ParsedConversation, ConversationMessage } from "@/types";

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
