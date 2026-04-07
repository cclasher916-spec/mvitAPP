-- Add push_token column to students table if it doesn't exist
ALTER TABLE students ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create an index to quickly lookup students by push token (useful if handling reverse lookups for notification receipts)
CREATE INDEX IF NOT EXISTS idx_students_push_token ON students(push_token);
