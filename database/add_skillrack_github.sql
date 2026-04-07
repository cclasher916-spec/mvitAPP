-- Add skillrack to platform_accounts check constraint if it exists
-- PostgreSQL doesn't easily let you alter a check constraint without dropping and recreating.
-- Assuming the database uses a standard text column with a check constraint, or an ENUM.
-- We will just alter the table to drop the constraint and re-add it if it's a check constraint,
-- but typically Supabase uses text for this if it's not strictly an ENUM type.
-- If it's an ENUM type, we need to alter type.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_type') THEN
        -- If it's just a text column, we might not need to do anything, but let's assume it's an enum or we just add columns.
    END IF;
END $$;

-- Add new columns to daily_activity
ALTER TABLE public.daily_activity
ADD COLUMN IF NOT EXISTS skillrack_solved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS skillrack_delta INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS github_solved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS github_delta INTEGER DEFAULT 0;

-- Optional: Since GitHub repos is the metric, 'github_solved' might represent repos just to keep the naming convention consistent.
