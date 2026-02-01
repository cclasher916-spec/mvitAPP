import { supabase } from '../lib/supabase'

export interface PlatformStats {
    leetcode: number
    codechef: number
    codeforces: number
    hackerrank: number
}

export class ScraperService {
    /**
    * Fetch solved count from LeetCode GraphQL API
    */
    static async fetchLeetCodeStats(username: string): Promise<number> {
        try {
            const response = await fetch('https://leetcode.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                body: JSON.stringify({
                    query: `
            query getUserProfile($username: String!) {
              matchedUser(username: $username) {
                submitStats: submitStatsGlobal {
                  acSubmissionNum {
                    difficulty
                    count
                    submissions
                  }
                }
              }
            }
          `,
                    variables: { username },
                }),
            })

            const data = await response.json()
            // Improved error handling for LeetCode response structure
            if (data.errors) {
                console.error('LeetCode API errors:', data.errors)
                return 0
            }

            const allStats = data.data?.matchedUser?.submitStats?.acSubmissionNum?.find(
                (s: any) => s.difficulty === 'All'
            )

            return allStats?.count || 0
        } catch (error) {
            console.error('LeetCode scrape error:', error)
            return 0
        }
    }

    /**
    * Fetch solved count from CodeChef via API
    */
    static async fetchCodeChefStats(username: string): Promise<number> {
        try {
            const response = await fetch(`https://codechef-api.vercel.app/${username}`)
            const data = await response.json()
            return data.totalSolved || 0
        } catch (error) {
            console.error('CodeChef scrape error:', error)
            return 0
        }
    }

    /**
    * Fetch solved count from Codeforces API
    */
    static async fetchCodeforcesStats(username: string): Promise<number> {
        try {
            const response = await fetch(
                `https://codeforces.com/api/user.info?handles=${username}`
            )
            const data = await response.json()
            if (data.status === 'OK' && data.result?.length > 0) {
                return data.result[0].rating || 0
            }
            return 0
        } catch (error) {
            console.error('Codeforces scrape error:', error)
            return 0
        }
    }

    /**
    * Fetch solved count from HackerRank API
    */
    static async fetchHackerRankStats(username: string): Promise<number> {
        try {
            const response = await fetch(
                `https://www.hackerrank.com/rest/hackers/${username}`
            )
            const data = await response.json()
            return data.badges?.length || 0
        } catch (error) {
            console.error('HackerRank scrape error:', error)
            return 0
        }
    }

    /**
    * Daily scraper job - Run this every day to update activity
    * In production, use GitHub Actions or Supabase Cron
    */
    static async runDailySync(): Promise<void> {
        try {
            console.log('Starting daily sync...')

            // Get all students with connected platforms
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id')

            if (studentsError) throw studentsError

            const today = new Date().toISOString().split('T')[0]

            for (const student of students || []) {
                // Fetch platform accounts
                const { data: platforms } = await supabase
                    .from('platform_accounts')
                    .select('*')
                    .eq('student_id', student.id)

                let stats = {
                    leetcode_solved: 0,
                    codechef_solved: 0,
                    codeforces_solved: 0,
                    hackerrank_solved: 0,
                }

                // Fetch stats from each platform
                for (const platform of platforms || []) {
                    try {
                        let solvedCount = 0

                        switch (platform.platform) {
                            case 'leetcode':
                                solvedCount = await this.fetchLeetCodeStats(platform.username)
                                stats.leetcode_solved = solvedCount
                                break
                            case 'codechef':
                                solvedCount = await this.fetchCodeChefStats(platform.username)
                                stats.codechef_solved = solvedCount
                                break
                            case 'codeforces':
                                solvedCount = await this.fetchCodeforcesStats(platform.username)
                                stats.codeforces_solved = solvedCount
                                break
                            case 'hackerrank':
                                solvedCount = await this.fetchHackerRankStats(platform.username)
                                stats.hackerrank_solved = solvedCount
                                break
                        }

                        // Update last_synced_at
                        await supabase
                            .from('platform_accounts')
                            .update({ last_synced_at: new Date().toISOString() })
                            .eq('id', platform.id)
                    } catch (error) {
                        console.error(
                            `Error syncing ${platform.platform} for ${student.id}:`,
                            error
                        )
                    }
                }

                // Calculate total solved
                const totalSolved =
                    stats.leetcode_solved +
                    stats.codechef_solved +
                    stats.codeforces_solved +
                    stats.hackerrank_solved

                // --- STREAK CALCULATION LOGIC ---
                // 1. Get yesterday's activity
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
                let newStreak = 0

                // Check if student was active yesterday
                if (totalSolved > 0) {
                    const { data: yesterdayActivity } = await supabase
                        .from('daily_activity')
                        .select('is_active')
                        .eq('student_id', student.id)
                        .eq('activity_date', yesterday)
                        .single()

                    // Get current streak from students table
                    const { data: studentData } = await supabase
                        .from('students')
                        .select('current_streak')
                        .eq('id', student.id)
                        .single()

                    const currentStreak = studentData?.current_streak || 0

                    if (yesterdayActivity?.is_active) {
                        // Active yesterday + Active today = Increment
                        newStreak = currentStreak + 1
                    } else if (currentStreak > 0) {
                        // Not active yesterday - Reset streak?
                        newStreak = 1
                    } else {
                        newStreak = 1
                    }
                } else {
                    newStreak = 0
                }

                // Update student's streak
                await supabase
                    .from('students')
                    .update({ current_streak: newStreak })
                    .eq('id', student.id)

                // Upsert daily activity
                const { error: activityError } = await supabase
                    .from('daily_activity')
                    .upsert({
                        student_id: student.id,
                        activity_date: today,
                        ...stats,
                        total_solved: totalSolved,
                        is_active: totalSolved > 0,
                        updated_at: new Date().toISOString(),
                    })

                if (activityError) {
                    console.error('Error updating activity for', student.id, activityError)
                }
            }

            // Update leaderboard cache
            await this.updateLeaderboards()

            console.log('Daily sync completed!')
        } catch (error) {
            console.error('Daily sync error:', error)
        }
    }

    /**
    * Update leaderboard rankings
    */
    static async updateLeaderboards(): Promise<void> {
        try {
            // Get all daily activity for today
            const today = new Date().toISOString().split('T')[0]
            const { data: activities } = await supabase
                .from('daily_activity')
                .select('*')
                .eq('activity_date', today)
                .order('total_solved', { ascending: false })

            if (!activities || activities.length === 0) return

            // Update college leaderboard
            for (let i = 0; i < activities.length; i++) {
                await supabase.from('leaderboard_cache').upsert({
                    student_id: activities[i].student_id,
                    rank_type: 'college',
                    period: 'daily',
                    rank: i + 1,
                    total_solved: activities[i].total_solved,
                    // Add streak to cache
                    streak: (await this.getStudentStreak(activities[i].student_id)),
                    last_updated: new Date().toISOString()
                })
            }

            console.log('Leaderboard updated!')
        } catch (error) {
            console.error('Leaderboard update error:', error)
        }
    }

    // Helper to get streak
    static async getStudentStreak(studentId: string): Promise<number> {
        const { data } = await supabase.from('students').select('current_streak').eq('id', studentId).single()
        return data?.current_streak || 0
    }
}

export default ScraperService
