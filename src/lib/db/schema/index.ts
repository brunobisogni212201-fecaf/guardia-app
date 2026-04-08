import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  real,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  userHash: text("user_hash").unique().notNull(),
  emailHash: text("email_hash").unique().notNull(),
  nameHash: text("name_hash"),
  phoneHash: text("phone_hash"),
  cpfHash: text("cpf_hash"),
  cognitoSub: text("cognito_sub").unique(),
  emailVerified: boolean("email_verified").default(false),
  role: text("role").default("user"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  sourceType: text("source_type").notNull(),
  rawContent: text("raw_content"),
  contentHash: text("content_hash").notNull(),
  participantPhoneHash: text("participant_phone_hash"),
  participantNameHash: text("participant_name_hash"),
  violenceScore: real("violence_score"),
  riskLevel: text("risk_level"),
  analysisStatus: text("analysis_status").default("pending"),
  isTrainingData: boolean("is_training_data").default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  phoneHash: text("phone_hash").notNull(),
  nameHash: text("name_hash"),
  cpfHash: text("cpf_hash"),
  riskFlags: jsonb("risk_flags").default([]),
  violencePatterns: jsonb("violence_patterns").default([]),
  trainingEmbeddingId: text("training_embedding_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  step: text("step").notNull(),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  confidence: real("confidence"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const judicialRecords = pgTable("judicial_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id),
  source: text("source"),
  recordType: text("record_type"),
  details: jsonb("details"),
  severity: text("severity"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Tabela para mapa de pedidos de ajuda (dados anonimizados — LGPD)
// IP nunca é armazenado; apenas hash SHA-256 + coords com ruído ±0.3°
export const helpRequestsGeo = pgTable(
  "help_requests_geo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipHash: text("ip_hash").notNull(),       // sha256(ip) — sem IP raw
    lat: real("lat").notNull(),              // lat com ruído ±0.3° (~33 km)
    lng: real("lng").notNull(),              // lng com ruído ±0.3°
    region: text("region"),                  // nome do estado (sem cidade)
    country: text("country").default("BR"),
    cookieConsent: boolean("cookie_consent").default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("help_requests_geo_created_idx").on(t.createdAt),
    index("help_requests_geo_ip_hash_idx").on(t.ipHash),
  ]
);

export const modelTraining = pgTable("model_training", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelVersion: text("model_version").notNull(),
  trainingDate: timestamp("training_date", { withTimezone: true }).defaultNow(),
  metrics: jsonb("metrics"),
  trainingSamples: integer("training_samples"),
  datasetHash: text("dataset_hash"),
  notes: text("notes"),
});

export const lgpdLogs = pgTable("lgpd_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityHash: text("entity_hash"),
  userId: uuid("user_id"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
