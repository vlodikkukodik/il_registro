-- Migration: 112_create_signatures_table
-- Description: internal/signatures/repository.go (the legacy FEA signature
-- module, distinct from qualified_signatures) reads/writes a "signatures"
-- table that no prior migration ever created.

CREATE TABLE IF NOT EXISTS signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    signer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    signature_hash TEXT NOT NULL,
    ip_address VARCHAR(64),
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_signatures_document_id ON signatures(document_id);
