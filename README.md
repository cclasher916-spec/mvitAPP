# MVIT Coding Team Tracker 💻💎

A powerful mobile application designed for Manakula Vinayagar Institute of Technology (MVIT) to track and analyze student performance across multiple coding platforms.

## 🚀 Overview

The MVIT Coding Team Tracker automatically aggregates coding statistics from **LeetCode**, **CodeChef**, **Codeforces**, and **HackerRank**. It provides students, faculty, and administrators with real-time insights into student progress, team rankings, and overall competitive programming health at the college.

## ✨ Features

- **Multi-Platform Sync**: Daily automatic synchronization with 4 major coding platforms.
- **Student Dashboard**: Personalized performance metrics, daily solve counts, and progress tracking.
- **Leaderboards**: Competitive rankings at college, department, and team levels.
- **Secure Authentication**: Simple and secure login using Roll Number and Password.
- **Team Management**: Organize students into teams for collaborative growth and competition.

## 🛠️ Tech Stack

- **Frontend**: React Native (Expo SDK 54) & TypeScript
- **Backend/Database**: Supabase (PostgreSQL)
- **Scraper Engine**: Custom Node.js/TypeScript scraping logic
- **Automation**: GitHub Actions (Daily Sync)

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js (Latest LTS)
- Expo Go app on your mobile device (for testing)
- A Supabase account and project

### 2. Environment Configuration
Clone the repository and create a `.env` file in the root directory by copying the template:

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:
- `SUPABASE_URL`: Your project URL found in Settings > API.
- `SUPABASE_ANON_KEY`: Your project's anonymous public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your project's service role key (required for backend tasks).

### 3. Database Setup
Follow the instructions in `database/schema.sql` to set up your Supabase database tables and Row Level Security (RLS) policies.

### 4. Installation
```bash
npm install
```

### 5. Running the App
```bash
# Start the Expo development server
npx expo start
```

## 📂 Project Structure

- `screens/`: React Native screen components.
- `services/`: Logic for authentication and platform scraping.
- `lib/`: Shared utilities and client initializations.
- `database/`: SQL schema and database scripts.
- `scripts/`: Helper scripts for seeding data.

## 📄 Documentation

For more detailed information, please refer to:
- [DATABASE_SETUP.md](DATABASE_SETUP.md)
- [SCHEDULER_SETUP.md](SCHEDULER_SETUP.md)
- [PROJECT_SUMMARY.txt](PROJECT_SUMMARY.txt)

---

Developed for **MVIT Coding Team**
