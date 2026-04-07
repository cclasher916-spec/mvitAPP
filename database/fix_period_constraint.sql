-- Drop the existing constraint
ALTER TABLE leaderboard_cache DROP CONSTRAINT leaderboard_cache_period_check;

-- Add the new constraint with all supported periods
ALTER TABLE leaderboard_cache ADD CONSTRAINT leaderboard_cache_period_check
CHECK (period IN ('daily', 'weekly', 'all_time', 'overall', 'monthly'));
