-- Migration 018: RAG document store for AOTIC Assistant
-- Embedding model: Xenova/all-MiniLM-L6-v2 (local, via @xenova/transformers) → 384-dim
-- LLM: Groq llama-3.3-70b-versatile
-- No paid embedding API required.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT,
  content     TEXT        NOT NULL,
  section     TEXT,
  chunk_index INT,
  fts         TSVECTOR,
  metadata    JSONB       DEFAULT '{}',
  embedding   vector(384),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rag_documents
  ADD COLUMN IF NOT EXISTS metadata  JSONB DEFAULT '{}';

-- Drop and recreate embedding column at correct dimension (384)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rag_documents' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE rag_documents DROP COLUMN embedding;
  END IF;
END $$;
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding vector(384);

DROP INDEX IF EXISTS rag_documents_embedding_idx;
CREATE INDEX rag_documents_embedding_idx
  ON rag_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE OR REPLACE FUNCTION match_rag_documents(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.4,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.content,
    COALESCE(d.metadata, '{}'::jsonb),
    (1 - (d.embedding <=> query_embedding))::FLOAT
  FROM rag_documents d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
