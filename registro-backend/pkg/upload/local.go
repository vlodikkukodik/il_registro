package upload

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalUploader stores uploads on local disk, served back out by the API
// server itself under /uploads/. Used when no external object storage
// (Supabase, S3, ...) is configured, so file attachments still work on a
// bare VPS deployment.
type LocalUploader struct {
	BaseDir      string // filesystem directory to write into, e.g. "./uploads"
	PublicBaseURL string // public URL prefix, e.g. "https://api.example.com/uploads"
}

func NewLocalUploader(baseDir, publicBaseURL string) *LocalUploader {
	return &LocalUploader{
		BaseDir:       baseDir,
		PublicBaseURL: strings.TrimRight(publicBaseURL, "/"),
	}
}

func (l *LocalUploader) UploadFile(_ context.Context, storagePath string, _ string, reader io.Reader) (string, error) {
	fullPath := filepath.Join(l.BaseDir, filepath.FromSlash(storagePath))
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return "", fmt.Errorf("impossibile creare la cartella di upload: %w", err)
	}

	out, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("impossibile creare il file di upload: %w", err)
	}
	defer func() { _ = out.Close() }()

	if _, err := io.Copy(out, reader); err != nil {
		_ = os.Remove(fullPath)
		return "", fmt.Errorf("impossibile scrivere il file di upload: %w", err)
	}

	return l.PublicBaseURL + "/" + strings.TrimLeft(filepath.ToSlash(storagePath), "/"), nil
}
