-- MVIT Coding Tracker - Add Delta Columns to daily_activity
-- Run this script in the Supabase SQL Editor to support normalized daily metrics.

-- Add new columns to track the daily difference (delta)
ALTER TABLE daily_activity
ADD COLUMN daily_delta INT DEFAULT 0,
ADD COLUMN leetcode_delta INT DEFAULT 0,
ADD COLUMN codechef_delta INT DEFAULT 0,
ADD COLUMN codeforces_delta INT DEFAULT 0,
ADD COLUMN hackerrank_delta INT DEFAULT 0;

-- Optional: If you want to backfill data for existing rows (assuming those rows represent a single day's activity), you could run:
-- UPDATE daily_activity SET daily_delta = total_solved;
