import { pool } from "../client";
import { conversations, contacts, analyses, judicialRecords } from "../schema";
import type { conversations as ConversationsTable } from "../schema";

type ConversationInsert = typeof ConversationsTable.$inferInsert;
type ConversationSelect = typeof ConversationsTable.$inferSelect;

export async function createConversation(data: {
  userId?: string;
  sourceType: string;
  rawContent: string;
  contentHash: string;
  participantPhoneHash?: string;
  participantNameHash?: string;
}): Promise<ConversationSelect | null> {
  const result = await pool.query(
    `INSERT INTO conversations (user_id, source_type, raw_content, content_hash, participant_phone_hash, participant_name_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.userId ?? null,
      data.sourceType,
      data.rawContent,
      data.contentHash,
      data.participantPhoneHash ?? null,
      data.participantNameHash ?? null,
    ]
  );
  return result.rows[0] ?? null;
}

export async function getConversationById(id: string): Promise<ConversationSelect | null> {
  const result = await pool.query<ConversationSelect>(
    `SELECT * FROM conversations WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateConversationAnalysis(
  id: string,
  data: {
    violenceScore?: number;
    riskLevel?: string;
    analysisStatus?: string;
    rawContent?: string;
  }
): Promise<ConversationSelect | null> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.violenceScore !== undefined) {
    updates.push(`violence_score = $${paramIndex++}`);
    params.push(data.violenceScore);
  }
  if (data.riskLevel !== undefined) {
    updates.push(`risk_level = $${paramIndex++}`);
    params.push(data.riskLevel);
  }
  if (data.analysisStatus !== undefined) {
    updates.push(`analysis_status = $${paramIndex++}`);
    params.push(data.analysisStatus);
  }
  if (data.rawContent !== undefined) {
    updates.push(`raw_content = $${paramIndex++}`);
    params.push(data.rawContent);
  }

  if (updates.length === 0) return getConversationById(id);

  params.push(id);
  const result = await pool.query<ConversationSelect>(
    `UPDATE conversations SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    params
  );
  return result.rows[0] ?? null;
}

export async function listConversations(options?: {
  limit?: number;
  offset?: number;
  riskLevel?: string;
}): Promise<ConversationSelect[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options?.riskLevel) {
    conditions.push(`risk_level = $${paramIndex++}`);
    params.push(options.riskLevel);
  }

  let query = `SELECT * FROM conversations`;
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }
  query += ` ORDER BY created_at DESC`;

  if (options?.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(options.limit);
  }
  if (options?.offset) {
    query += ` OFFSET $${paramIndex++}`;
    params.push(options.offset);
  }

  const result = await pool.query<ConversationSelect>(query, params);
  return result.rows;
}

export async function createAnalysis(data: {
  conversationId: string;
  step: string;
  inputData?: unknown;
  outputData?: unknown;
  confidence?: number;
  durationMs?: number;
}) {
  const result = await pool.query(
    `INSERT INTO analyses (conversation_id, step, input_data, output_data, confidence, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.conversationId,
      data.step,
      JSON.stringify(data.inputData ?? {}),
      JSON.stringify(data.outputData ?? {}),
      data.confidence ?? null,
      data.durationMs ?? null,
    ]
  );
  return result.rows[0];
}

export async function createContact(data: {
  conversationId: string;
  phoneHash: string;
  nameHash?: string;
  cpfHash?: string;
  riskFlags?: string[];
  violencePatterns?: string[];
}) {
  const result = await pool.query(
    `INSERT INTO contacts (conversation_id, phone_hash, name_hash, cpf_hash, risk_flags, violence_patterns)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.conversationId,
      data.phoneHash,
      data.nameHash ?? null,
      data.cpfHash ?? null,
      JSON.stringify(data.riskFlags ?? []),
      JSON.stringify(data.violencePatterns ?? []),
    ]
  );
  return result.rows[0];
}

export async function createJudicialRecord(data: {
  contactId: string;
  source: string;
  recordType: string;
  details: unknown;
  severity?: string;
}) {
  const result = await pool.query(
    `INSERT INTO judicial_records (contact_id, source, record_type, details, severity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.contactId,
      data.source,
      data.recordType,
      JSON.stringify(data.details),
      data.severity ?? null,
    ]
  );
  return result.rows[0];
}
