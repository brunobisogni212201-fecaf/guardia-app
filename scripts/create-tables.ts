import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const schema = `
-- Tabela de conversas (anonimizada)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  source_type TEXT NOT NULL,
  raw_content TEXT,
  content_hash TEXT NOT NULL,
  participant_phone_hash TEXT,
  participant_name_hash TEXT,
  violence_score REAL,
  risk_level TEXT,
  analysis_status TEXT DEFAULT 'pending',
  is_training_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  phone_hash TEXT NOT NULL,
  name_hash TEXT,
  cpf_hash TEXT,
  risk_flags JSONB DEFAULT '[]',
  violence_patterns JSONB DEFAULT '[]',
  training_embedding_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de análises
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  step TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  confidence REAL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de registros judiciais
CREATE TABLE IF NOT EXISTS judicial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  source TEXT,
  record_type TEXT,
  details JSONB,
  severity TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de treinamento de modelo
CREATE TABLE IF NOT EXISTS model_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL,
  training_date TIMESTAMPTZ DEFAULT now(),
  metrics JSONB,
  training_samples INTEGER,
  dataset_hash TEXT,
  notes TEXT
);

-- Tabela de logs LGPD
CREATE TABLE IF NOT EXISTS lgpd_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_hash TEXT,
  user_id UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_risk_level ON conversations(risk_level);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_conversation_id ON contacts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analyses_conversation_id ON analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_judicial_records_contact_id ON judicial_records(contact_id);
`;

async function createTables() {
  try {
    console.log("Conectando ao banco...");
    await pool.query(schema);
    console.log("Tabelas criadas com sucesso!");
  } catch (error) {
    console.error("Erro ao criar tabelas:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTables();
