-- Change RAG embeddings from 1536 dimensions to 384
-- Required for all-MiniLM-L6-v2 embeddings

DROP INDEX IF EXISTS idx_rag_documents_embedding;

ALTER TABLE rag_documents
ALTER COLUMN embedding TYPE VECTOR(384);

CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding
    ON rag_documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);
