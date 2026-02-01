# MVIT Coding Tracker - Database Setup

## Step 1: Apply the Database Schema

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to https://app.supabase.com
2. Log in and select your project: `rwrmcovajrgcqwyrztqz`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the entire contents of `/project/database/schema.sql`
6. Click **Run**

**Option B: Via Supabase CLI**

```bash
supabase db push
```

## Step 2: Copy the Schema File

The complete schema is in `/project/database/schema.sql`

## Database Structure Overview

### Core Tables:
- **users** - Authentication users (super_admin, hod, team_leader, student)
- **departments** - Department info with HOD assignment
- **years** - Academic years (1st-4th)
- **sections** - Class sections (A, B, C, etc.)
- **students** - Student profiles linked to users
- **teams** - Team groupings by section
- **team_members** - Team membership tracking
- **platform_accounts** - LeetCode, CodeChef, Codeforces, HackerRank, GitHub connections
- **daily_activity** - Solved count tracking per day
- **leaderboard_cache** - Cached rankings for fast queries

### Key Features:
✅ Row Level Security (RLS) enabled
✅ Indexes on frequently queried columns
✅ Unique constraints to prevent duplicates
✅ Cascade deletes for data consistency

## Next Steps:

1. Apply the schema above
2. Configure authentication in the React Native app
3. Build the login flow
4. Set up the daily scraper job
