-- Migration: 113_make_class_lessons_subject_optional
-- Description: substitution lessons ("supplenza") can be logged without a
-- subject (internal/lessons/service.go only requires subject_id when
-- is_substitution is false), but the column was NOT NULL, so every such
-- save failed at the database level even if application validation passed.

ALTER TABLE class_lessons ALTER COLUMN subject_id DROP NOT NULL;
