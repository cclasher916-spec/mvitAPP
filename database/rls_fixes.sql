-- MVIT Coding Tracker - RLS Fixes for Phase 2
-- Run this script in the Supabase SQL Editor to fix permission errors during team creation and platform setup.

-- 1. Fixes for Platform Setup UI
CREATE POLICY "Students can insert own platforms" ON platform_accounts
FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);

CREATE POLICY "Students can update own platforms" ON platform_accounts
FOR UPDATE USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);

CREATE POLICY "Students can delete own platforms" ON platform_accounts
FOR DELETE USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);

-- 2. Fixes for Team Management UI
CREATE POLICY "Anyone can view teams" ON teams
FOR SELECT USING (true);

CREATE POLICY "Team leaders can create teams" ON teams
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM students 
    WHERE id = team_leader_id 
    AND user_id = auth.uid() 
    AND is_team_leader = true
  )
);

CREATE POLICY "Team leaders can update own team" ON teams
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE id = team_leader_id 
    AND user_id = auth.uid() 
    AND is_team_leader = true
  )
);

CREATE POLICY "Team leaders can delete own team" ON teams
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE id = team_leader_id 
    AND user_id = auth.uid() 
    AND is_team_leader = true
  )
);

-- 3. Fixes for Team Members
CREATE POLICY "Anyone can view team members" ON team_members
FOR SELECT USING (true);

CREATE POLICY "Team leaders can insert members" ON team_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams 
    JOIN students ON teams.team_leader_id = students.id 
    WHERE teams.id = team_id 
    AND students.user_id = auth.uid() 
    AND students.is_team_leader = true
  )
);

CREATE POLICY "Team leaders can delete members" ON team_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM teams 
    JOIN students ON teams.team_leader_id = students.id 
    WHERE teams.id = team_id 
    AND students.user_id = auth.uid() 
    AND students.is_team_leader = true
  )
);

-- 4. Fixes for Student Visibility
-- Needed for team leaders to search members and for leaderboards to show names
CREATE POLICY "Anyone can view students" ON students
FOR SELECT USING (true);

-- 5. Fixes for Departments Visibility
CREATE POLICY "Anyone can view departments" ON departments
FOR SELECT USING (true);
