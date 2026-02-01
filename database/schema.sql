-- MVIT Coding Tracker - Database Schema
-- Apply this via Supabase Dashboard SQL Editor

DROP TABLE IF EXISTS daily_activity CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS platform_accounts CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS years CASCADE;
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

CREATE TABLE years (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
year_number INT NOT NULL CHECK (year_number BETWEEN 1 AND 4),
department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
created_at TIMESTAMP DEFAULT now(),
UNIQUE(year_number, department_id)
);

CREATE TABLE sections (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
year_id UUID NOT NULL REFERENCES years(id) ON DELETE CASCADE,
created_at TIMESTAMP DEFAULT now(),
UNIQUE(name, year_id)
);

CREATE TABLE students (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
roll_no TEXT UNIQUE NOT NULL,
name TEXT NOT NULL,
department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
year_id UUID NOT NULL REFERENCES years(id) ON DELETE CASCADE,
section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
batch TEXT,
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
