export interface ConversationMessage {
  timestamp: string;
  author: string;
  content: string;
  isGroup: boolean;
}

export interface ParsedConversation {
  messages: ConversationMessage[];
  participants: string[];
  startDate?: string;
  endDate?: string;
}

export interface IdentifiedContact {
  phone: string | null;
  name: string | null;
  cpf: string | null;
  confidence: number;
}

export interface ViolenceAnalysis {
  score: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  patterns: ViolencePattern[];
  summary: string;
  recommendations: string[];
}

export interface ViolencePattern {
  type: "control" | "threat" | "manipulation" | "isolation" | "verbal_abuse" | "stalking";
  severity: number;
  evidence: string[];
  description: string;
}

export interface JudicialSearchResult {
  source: string;
  found: boolean;
  records: JudicialRecord[];
}

export interface JudicialRecord {
  type: "process" | "mandate" | "conviction";
  caseNumber?: string;
  court?: string;
  date?: string;
  description?: string;
  severity?: "low" | "medium" | "high";
}

export interface AnalysisResult {
  conversationId: string;
  parsedConversation: ParsedConversation;
  identifiedContact: IdentifiedContact;
  violenceAnalysis: ViolenceAnalysis;
  judicialResult?: JudicialSearchResult;
  createdAt: Date;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
