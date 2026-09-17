-- Migration: 114_add_file_url_to_documents_enhanced
-- Description: Secretary "Documenti" only supported writing rich-text
-- content in-browser; there was no way to store a real uploaded file
-- against a document record.

ALTER TABLE documents_enhanced ADD COLUMN IF NOT EXISTS file_url TEXT;
