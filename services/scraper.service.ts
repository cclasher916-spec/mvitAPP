import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'

type StudentRow = Database['public']['Tables']['students']['Row']
type PlatformAccountRow = Database['public']['Tables']['platform_accounts']['Row']

export interface PlatformStats {
    leetcode: number
    codechef: number
    codeforces: number
    hackerrank: number
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

            if (!response.ok) {
                console.warn(`CodeChef HTTP error for ${username}: ${response.status}`)
                return 0
            }

            const text = await response.text()

            // Guard against non-JSON responses
            if (!text.startsWith('{')) {
                console.warn(`CodeChef non-JSON response for ${username}:`, text)
                return 0
            }

            const data = JSON.parse(text)
            return data.totalSolved || 0
        } catch (error) {
            console.error('CodeChef scrape error:', error)
            return 0
        }
    }

    /**
    * Fetch solved count from Codeforces API (Unique accepted problems)
    */
    static async fetchCodeforcesStats(username: string): Promise<number> {
        try {
            const response = await fetch(
                `https://codeforces.com/api/user.status?handle=${username}`
            )
            const data = await response.json()
            if (data.status === 'OK') {
                const solved = new Set(
                    data.result
                        .filter((s: any) => s.verdict === 'OK')
                        .map((s: any) => `${s.problem.contestId}-${s.problem.index}`)
                )
                return solved.size
            }
            return 0
        } catch (error) {
            console.error('Codeforces scrape error:', error)
            return 0
        }
    }

    /**
    * Fetch solved count from HackerRank API
    * NOTE: HackerRank does not expose solved count cleanly anymore.
    * This currently returns badges count as an activity indicator.
    */
    static async fetchHackerRankStats(username: string): Promise<number> {
        try {
            const response = await fetch(
                `https://www.hackerrank.com/rest/hackers/${username}`
            )
            const data = await response.json()
            // In Phase 1, we use badges as a proxy for activity, or 0 if unreliable
            return data.badges?.length || 0
        } catch (error) {
            console.error('HackerRank scrape error:', error)
            return 0
        }
    }

    /**
    * Sync a single student's platform data and update their streak
    */
    static async syncStudent(studentId: string, today: string, yesterday: string): Promise<void> {
        try {
            // Fetch platform accounts
            const { data: platforms, error: platformsError } = await supabase
                .from('platform_accounts')
                .select('*')
                .eq('student_id', studentId)

            if (platformsError) throw platformsError

            let stats = {
                leetcode_solved: 0,
                codechef_solved: 0,
                codeforces_solved: 0,
                hackerrank_solved: 0,
            }

            const platformUpdates: Database['public']['Tables']['platform_accounts']['Update'][] = []

            // Fetch stats from each platform in parallel
            await Promise.all(
                ((platforms as PlatformAccountRow[]) || []).map(async platform => {
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

                        // Collect update for platform_accounts
                        platformUpdates.push({
                            id: platform.id,
                            last_synced_at: new Date().toISOString()
                        })
                    } catch (error) {
                        console.error(`Error syncing ${platform.platform} for ${studentId}:`, error)
                    }
                })
            )

            // Batch update platform accounts
            if (platformUpdates.length > 0) {
                // Perform updates
                for (const update of platformUpdates) {
                    if (update.id) {
                        await (supabase
                            .from('platform_accounts') as any)
                            .update({ last_synced_at: update.last_synced_at })
                            .eq('id', update.id)
                    }
                }
            }

            const totalSolved =
                stats.leetcode_solved +
                stats.codechef_solved +
                stats.codeforces_solved +
                stats.hackerrank_solved

            // --- STREAK CALCULATION LOGIC ---
            // 1. Get student's previous streak and yesterday's activity
            const [{ data: studentData }, { data: yesterdayActivity }] = await Promise.all([
                supabase.from('students').select('current_streak').eq('id', studentId).maybeSingle(),
                supabase.from('daily_activity').select('is_active').eq('student_id', studentId).eq('activity_date', yesterday).maybeSingle()
            ])

            let newStreak = (studentData as any)?.current_streak || 0

            if (totalSolved > 0) {
                // Active today
                if ((yesterdayActivity as any)?.is_active) {
                    // Active yesterday + Active today = Increment
                    newStreak += 1
                } else {
                    // Not active yesterday (or first activity) -> Start new streak
                    newStreak = 1
                }
            } else {
                // Inactive today
                if (yesterdayActivity && !(yesterdayActivity as any).is_active) {
                    // Inactive yesterday AND Inactive today -> Break streak
                    newStreak = 0
                }
            }

            // Update student's streak
            await (supabase
                .from('students') as any)
                .update({ current_streak: newStreak })
                .eq('id', studentId)

            // Upsert daily activity
            await (supabase
                .from('daily_activity') as any)
                .upsert({
                    student_id: studentId,
                    activity_date: today,
                    leetcode_solved: stats.leetcode_solved,
                    codechef_solved: stats.codechef_solved,
                    codeforces_solved: stats.codeforces_solved,
                    hackerrank_solved: stats.hackerrank_solved,
                    total_solved: totalSolved,
                    is_active: totalSolved > 0,
                    updated_at: new Date().toISOString(),
                })

        } catch (error) {
            console.error(`Unexpected error in syncStudent for ${studentId}:`, error)
        }
    }

    /**
    * Daily scraper job - Run this every day to update activity
    * Uses batching to avoid API rate limits and improve performance
    */
    static async runDailySync(): Promise<void> {
        try {
            console.log('Starting daily sync...')

            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id')

            if (studentsError) throw studentsError
            if (!students || students.length === 0) return

            const today = new Date().toISOString().split('T')[0]
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

            const BATCH_SIZE = 10
            for (let i = 0; i < (students as any[]).length; i += BATCH_SIZE) {
                const batch = (students as any[]).slice(i, i + BATCH_SIZE)
                console.log(`Syncing batch ${i / BATCH_SIZE + 1} (${batch.length} students)...`)

                await Promise.all(
                    batch.map(student => this.syncStudent(student.id, today, yesterday))
                )

                // Safety sleep between batches
                if (i + BATCH_SIZE < (students as any[]).length) {
                    await sleep(500)
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
    * Pre-fetches streaks to avoid N+1 query problem
    */
    static async updateLeaderboards(): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0]

            // 1. Get all daily activity for today
            const { data: activities, error: activityError } = await supabase
                .from('daily_activity')
                .select('student_id, total_solved')
                .eq('activity_date', today)
                .order('total_solved', { ascending: false })

            if (activityError) throw activityError
            if (!activities || (activities as any[]).length === 0) return

            // 2. Pre-fetch streaks for all students in this leaderboard
            const studentIds = (activities as any[]).map(a => a.student_id)
            const { data: students, error: streakError } = await supabase
                .from('students')
                .select('id, current_streak')
                .in('id', studentIds)

            if (streakError) throw streakError

            // Map student IDs to streaks for quick lookup
            const streakMap = new Map((students as any[])?.map(s => [s.id, s.current_streak]) || [])

            // 3. Prepare leaderboard cache updates
            const cacheUpdates = (activities as any[]).map((activity, index) => ({
                student_id: activity.student_id,
                rank_type: 'college',
                period: 'daily',
                rank: index + 1,
                total_solved: activity.total_solved,
                streak: streakMap.get(activity.student_id) || 0,
                last_updated: new Date().toISOString()
            }))

            // 4. Batch upsert leaderboard cache
            const { error: upsertError } = await (supabase
                .from('leaderboard_cache') as any)
                .upsert(cacheUpdates)

            if (upsertError) throw upsertError

            console.log('Leaderboard updated!')
        } catch (error) {
            console.error('Leaderboard update error:', error)
        }
    }

    // Helper to get streak (kept for backwards compatibility if needed elsewhere)
    static async getStudentStreak(studentId: string): Promise<number> {
        const { data } = await supabase.from('students').select('current_streak').eq('id', studentId).maybeSingle()
        return (data as any)?.current_streak || 0
    }
}

export default ScraperService
