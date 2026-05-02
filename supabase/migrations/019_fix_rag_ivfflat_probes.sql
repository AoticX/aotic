-- Migration 019: Fix RAG retrieval recall
-- ivfflat default probes=1 only searched 1 of 10 clusters (~7/73 docs).
-- Setting probes=10 searches all clusters for perfect recall on this small dataset.

CREATE OR REPLACE FUNCTION match_rag_documents(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.3,
  match_count     INT   DEFAULT 8
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  SET LOCAL ivfflat.probes = 10;
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
