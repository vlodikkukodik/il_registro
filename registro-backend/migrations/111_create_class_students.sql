-- Migration: 111_create_class_students
-- Description: many repository queries (grades, attendance, timetables,
-- fascicolo) join/OR-EXISTS against class_students as a fallback alongside
-- the direct students.class_id column, but the table was never created by
-- any prior migration, causing "relation \"class_students\" does not exist"
-- errors. No code currently inserts into it, so create it empty; it exists
-- purely as a redundant membership table those queries already tolerate
-- being empty for.

CREATE TABLE IF NOT EXISTS class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
