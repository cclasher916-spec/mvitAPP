-- MVIT Coding Tracker - Database Schema
-- Apply this via Supabase Dashboard SQL Editor

DROP TABLE IF EXISTS daily_activity CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS platform_accounts CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email TEXT UNIQUE NOT NULL,
role TEXT NOT NULL CHECK (role IN ('super_admin', 'hod', 'team_leader', 'student')),
created_at TIMESTAMP DEFAULT now(),
updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE departments (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT UNIQUE NOT NULL,
code TEXT UNIQUE NOT NULL,
hod_id UUID REFERENCES users(id) ON DELETE SET NULL,
created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE sections (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
batch TEXT NOT NULL,
created_at TIMESTAMP DEFAULT now(),
UNIQUE(name, department_id, batch)
);

CREATE TABLE students (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
roll_no TEXT UNIQUE NOT NULL,
name TEXT NOT NULL,
department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
batch TEXT NOT NULL,
mobile TEXT,
is_team_leader BOOLEAN DEFAULT false,
current_streak INT DEFAULT 0,
created_at TIMESTAMP DEFAULT now(),
updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE teams (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
team_leader_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
max_members INT DEFAULT 5,
created_at TIMESTAMP DEFAULT now(),
UNIQUE(name, section_id)
);

CREATE TABLE team_members (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
joined_at TIMESTAMP DEFAULT now(),
UNIQUE(team_id, student_id)
);

CREATE TABLE platform_accounts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codechef', 'codeforces', 'hackerrank', 'github')),
username TEXT NOT NULL,
connected_at TIMESTAMP DEFAULT now(),
last_synced_at TIMESTAMP,
UNIQUE(student_id, platform)
);

CREATE TABLE daily_activity (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
activity_date DATE NOT NULL,
leetcode_solved INT DEFAULT 0,
codechef_solved INT DEFAULT 0,
codeforces_solved INT DEFAULT 0,
hackerrank_solved INT DEFAULT 0,
total_solved INT DEFAULT 0,
is_active BOOLEAN DEFAULT false,
created_at TIMESTAMP DEFAULT now(),
updated_at TIMESTAMP DEFAULT now(),
UNIQUE(student_id, activity_date)
);

CREATE TABLE leaderboard_cache (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
rank_type TEXT NOT NULL CHECK (rank_type IN ('college', 'department', 'year', 'section', 'team')),
period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'overall')),
rank INT,
total_solved INT,
streak INT DEFAULT 0,
last_updated TIMESTAMP DEFAULT now(),
UNIQUE(student_id, rank_type, period)
);

CREATE INDEX idx_daily_activity_date ON daily_activity(activity_date);
CREATE INDEX idx_daily_activity_student ON daily_activity(student_id);
CREATE INDEX idx_platform_accounts_student ON platform_accounts(student_id);
CREATE INDEX idx_students_dept ON students(department_id);
CREATE INDEX idx_students_section ON students(section_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_leaderboard_rank ON leaderboard_cache(rank_type, period);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own data" ON students
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Students can update own data" ON students
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Students can view own activity" ON daily_activity
FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Students can view own platforms" ON platform_accounts
FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "HOD can view department students" ON students
FOR SELECT USING (
department_id IN (
SELECT id FROM departments WHERE hod_id = auth.uid()
)
);

CREATE POLICY "Leaderboards are public" ON leaderboard_cache
FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────────
-- AI AGENT ARCHITECTURE (Zero-Budget Optimization)
-- ──────────────────────────────────────────────────────────────

-- 1. The Immutable Interaction Ledger
CREATE TABLE public.student_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    problem_id VARCHAR(255) NOT NULL,
    submission_code TEXT,
    is_correct BOOLEAN NOT NULL,
    execution_time_ms INTEGER,
    ast_structural_complexity NUMERIC(5,2), -- Derived from AST parsing
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_student_history ON public.student_interactions(student_id, created_at DESC);

-- 2. Cognitive State Repository (ReKT Hidden States)
CREATE TABLE public.knowledge_states (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    current_hidden_state JSONB NOT NULL, -- Serialized tensor from the FRU framework
    concept_mastery_scores JSONB, -- Key-value pairs (e.g., {"recursion": 0.85})
    frustration_index NUMERIC(3,2),
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- 3. The Autonomous Recommendation Queue
CREATE TABLE public.learning_paths (
    path_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    recommended_problem_id VARCHAR(255) NOT NULL,
    predicted_success_probability NUMERIC(4,3), 
    justification_text TEXT, -- TurboQuant LLM-generated explanation
    is_completed BOOLEAN DEFAULT false,
    queued_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pending_paths ON public.learning_paths(student_id) WHERE is_completed = false;

-- 4. Batching Strategy (Unlogged for performance)
CREATE UNLOGGED TABLE public.pending_inference (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id UUID NOT NULL,
    problem_id VARCHAR(255) NOT NULL,
    is_correct BOOLEAN,
    ast_structural_complexity NUMERIC(5,2),
    queued_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- DISPATCHER LOGIC (Supabase -> GitHub Actions via pg_net)
-- ──────────────────────────────────────────────────────────────

-- Trigger function to populate the unlogged queue
CREATE OR REPLACE FUNCTION public.queue_for_inference()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pending_inference (student_id, problem_id, is_correct, ast_structural_complexity)
    VALUES (NEW.student_id, NEW.problem_id, NEW.is_correct, NEW.ast_structural_complexity);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_student_interaction
AFTER INSERT ON public.student_interactions
FOR EACH ROW EXECUTE FUNCTION public.queue_for_inference();

-- Dispatcher (To be called by Cron or manually)
CREATE OR REPLACE FUNCTION public.dispatch_inference_batch()
RETURNS void AS $$
DECLARE
    payload_body JSONB;
    request_id BIGINT;
BEGIN
    SELECT jsonb_agg(row_to_json(p)) INTO payload_body
    FROM public.pending_inference p;

    IF payload_body IS NOT NULL THEN
        SELECT net.http_post(
            url := 'https://api.github.com/repos/<YOUR_GITHUB_OWNER>/<YOUR_REPO>/dispatches',
            headers := '{"Authorization": "Bearer <YOUR_GITHUB_PAT>", "Accept": "application/vnd.github+json"}'::jsonb,
            body := jsonb_build_object(
                'event_type', 'process_inference_batch',
                'client_payload', jsonb_build_object('batch_data', payload_body)
            )
        ) INTO request_id;

        DELETE FROM public.pending_inference;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────
-- agent_tasks
-- Written by the Autonomous Python Agent (supabase_bridge.py)
-- Readable by students directly inside the Mobile App
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_tasks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT,
    platform     TEXT NOT NULL DEFAULT 'leetcode',
    problem_url  TEXT,
    difficulty   TEXT,
    status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    assigned_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deadline_at  TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_student ON agent_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status  ON agent_tasks(status);

ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- Students can only see their own tasks
CREATE POLICY "Students can view their AI tasks" ON agent_tasks
FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

-- Only the service role (Python Agent) can insert/update tasks — no user can write directly
CREATE POLICY "Service role manages agent tasks" ON agent_tasks
FOR ALL USING (auth.role() = 'service_role');

-- Allow students to mark their tasks as completed
CREATE POLICY "Students can complete their own tasks" ON agent_tasks
FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
) WITH CHECK (
    status = 'completed'
);
