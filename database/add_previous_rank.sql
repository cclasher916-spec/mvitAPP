-- Phase 2 Gamification: Add previous rank column
ALTER TABLE leaderboard_cache
ADD COLUMN previous_rank INT DEFAULT NULL;
