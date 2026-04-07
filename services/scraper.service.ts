import { supabase } from '../lib/supabase'
import { Database } from '../lib/database.types'

type StudentRow = Database['public']['Tables']['students']['Row']
type PlatformAccountRow = Database['public']['Tables']['platform_accounts']['Row']

export interface PlatformStats {
    leetcode: number
    codechef: number
    codeforces: number
    hackerrank: number
    skillrack: number
    github: number
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export class ScraperService {
    static extractUsername(url: string, domain: string): string {
        if (!url) return ''
        let username = url.trim()
        if (username.includes(domain)) {
            // e.g. https://leetcode.com/u/user/ or https://github.com/user
            let match;
            if (domain === 'leetcode.com') match = username.match(/\/u\/([^\/]+)/);
            else match = username.match(new RegExp(`${domain}\\/([^\\/]+)`));

            if (match && match[1]) return match[1];

            const parts = username.replace(/\/$/, '').split('/')
            username = parts[parts.length - 1]
        }
        return username
    }

    /**
    * Fetch solved count from LeetCode GraphQL API
    */
    static async fetchLeetCodeStats(usernameOrUrl: string): Promise<number> {
        const username = this.extractUsername(usernameOrUrl, 'leetcode.com');
        if (!username) return 0;
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
    static async fetchCodeChefStats(usernameOrUrl: string): Promise<number> {
        const username = this.extractUsername(usernameOrUrl, 'codechef.com');
        if (!username) return 0;
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
    static async fetchCodeforcesStats(usernameOrUrl: string): Promise<number> {
        const username = this.extractUsername(usernameOrUrl, 'codeforces.com');
        if (!username) return 0;
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
    static async fetchHackerRankStats(usernameOrUrl: string): Promise<number> {
        const username = this.extractUsername(usernameOrUrl, 'hackerrank.com');
        if (!username) return 0;
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
     * Fetch programs solved from SkillRack
     */
    static async fetchSkillRackStats(url: string): Promise<number> {
        if (!url || !url.startsWith('http')) return 0;
        try {
            const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const text = await response.text();

            // Try to find the PROGRAMS SOLVED block
            const regex = /class=["'][^"']*value["'][^>]*>\s*([\d,]+)\s*<\/div>\s*<div[^>]*class=["'][^"']*label["'][^>]*>\s*PROGRAMS SOLVED\s*<\/div>/i;
            const match = text.match(regex);
            if (match && match[1]) return parseInt(match[1].replace(/,/g, ''), 10);

            const regex2 = /<div[^>]*class=["'][^"']*label["'][^>]*>\s*PROGRAMS SOLVED\s*<\/div>\s*<div[^>]*class=["'][^"']*value["'][^>]*>\s*([\d,]+)\s*<\/div>/i;
            const match2 = text.match(regex2);
            if (match2 && match2[1]) return parseInt(match2[1].replace(/,/g, ''), 10);

            const wideRegex = /class=["'][^"']*value["'][^>]*>\s*([\d,]+)\s*<\/div>[\s\S]{0,100}PROGRAMS SOLVED/i;
            const match3 = text.match(wideRegex);
            if (match3 && match3[1]) return parseInt(match3[1].replace(/,/g, ''), 10);

        } catch (e) {
            console.error('SkillRack scrape error:', e);
        }
        return 0;
    }

    /**
     * Fetch GitHub repos count
     */
    static async fetchGitHubStats(usernameOrUrl: string): Promise<number> {
        const username = this.extractUsername(usernameOrUrl, 'github.com');
        if (!username) return 0;
        try {
            const response = await fetch(`https://api.github.com/users/${username}`);
            if (response.ok) {
                const data = await response.json();
                return data.public_repos || 0;
            }
        } catch (error) {
            console.error('GitHub scrape error:', error);
        }
        return 0;
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
                skillrack_solved: 0,
                github_solved: 0,
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
                            case 'skillrack':
                                solvedCount = await this.fetchSkillRackStats(platform.username)
                                stats.skillrack_solved = solvedCount
                                break
                            case 'github':
                                solvedCount = await this.fetchGitHubStats(platform.username)
                                stats.github_solved = solvedCount
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
                stats.hackerrank_solved +
                stats.skillrack_solved +
                stats.github_solved

            // --- DELTA AND STREAK CALCULATION LOGIC ---
            // 1. Get student's previous activity BEFORE today to calculate deltas
            const { data: previousActivity } = await supabase
                .from('daily_activity')
                .select('*')
                .eq('student_id', studentId)
                .lt('activity_date', today)
                .order('activity_date', { ascending: false })
                .limit(1)
                .maybeSingle()

            const prevAct = previousActivity as any;
            const prevTotals = {
                leetcode: prevAct?.leetcode_solved || 0,
                codechef: prevAct?.codechef_solved || 0,
                codeforces: prevAct?.codeforces_solved || 0,
                hackerrank: prevAct?.hackerrank_solved || 0,
                skillrack: prevAct?.skillrack_solved || 0,
                github: prevAct?.github_solved || 0,
            }

            // Calculate Deltas natively (prevent negative deltas if platforms glitch)
            const deltas = {
                leetcode: Math.max(0, stats.leetcode_solved - prevTotals.leetcode),
                codechef: Math.max(0, stats.codechef_solved - prevTotals.codechef),
                codeforces: Math.max(0, stats.codeforces_solved - prevTotals.codeforces),
                hackerrank: Math.max(0, stats.hackerrank_solved - prevTotals.hackerrank),
                skillrack: Math.max(0, stats.skillrack_solved - prevTotals.skillrack),
                github: Math.max(0, stats.github_solved - prevTotals.github),
            }

            const dailyDelta = deltas.leetcode + deltas.codechef + deltas.codeforces + deltas.hackerrank + deltas.skillrack + deltas.github;

            // 2. Get today's activity (if exists) and yesterday's to manage streak idempotency
            const [{ data: studentData }, { data: todayActivity }, { data: yesterdayActivity }] = await Promise.all([
                supabase.from('students').select('current_streak').eq('id', studentId).maybeSingle(),
                supabase.from('daily_activity').select('is_active').eq('student_id', studentId).eq('activity_date', today).maybeSingle(),
                supabase.from('daily_activity').select('is_active').eq('student_id', studentId).eq('activity_date', yesterday).maybeSingle()
            ])

            let currentStreak = (studentData as any)?.current_streak || 0
            const wasActiveToday = (todayActivity as any)?.is_active || false
            const isActiveToday = dailyDelta > 0

            let newStreak = currentStreak;

            // Idempotent streak resolution:
            if (isActiveToday && !wasActiveToday) {
                // Newly active today
                if ((yesterdayActivity as any)?.is_active) {
                    newStreak = currentStreak + 1; // Increment ongoing streak
                } else {
                    newStreak = 1; // Start a new streak
                }
            } else if (!isActiveToday && !wasActiveToday) {
                // Not active today
                // Check if streak should be broken (if changing from yesterday to today)
                if (!(yesterdayActivity as any)?.is_active) {
                    newStreak = 0; // Break streak if inactive yesterday too
                }
            }

            // Update student's streak
            if (newStreak !== currentStreak) {
                await (supabase
                    .from('students') as any)
                    .update({ current_streak: newStreak })
                    .eq('id', studentId)
            }

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
                    skillrack_solved: stats.skillrack_solved,
                    github_solved: stats.github_solved,
                    total_solved: totalSolved,
                    daily_delta: dailyDelta,
                    leetcode_delta: deltas.leetcode,
                    codechef_delta: deltas.codechef,
                    codeforces_delta: deltas.codeforces,
                    hackerrank_delta: deltas.hackerrank,
                    skillrack_delta: deltas.skillrack,
                    github_delta: deltas.github,
                    is_active: isActiveToday,
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
    /**
    * Update leaderboard rankings
    * Pre-fetches streaks to avoid N+1 query problem
    */
    /**
    * Update leaderboard rankings for all time periods (daily, weekly, all_time)
    * Pre-fetches streaks and existing ranks to track movement
    */
    static async updateLeaderboards(): Promise<void> {
        try {
            console.log('Updating leaderboard rankings...');
            // 1. Get all students with their grouping info
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id, current_streak, department_id, year_id, section_id');

            if (studentsError) throw studentsError;
            if (!students || students.length === 0) return;

            // 1b. Get team mappings
            const { data: teamMembers } = await supabase.from('team_members').select('student_id, team_id');
            const teamMap = new Map<string, string>();
            if (teamMembers) {
                for (const tm of teamMembers as any[]) teamMap.set(tm.student_id, tm.team_id);
            }

            // 1c. Get existing leaderboard cache to lookup previous ranks
            const { data: oldCache } = await supabase.from('leaderboard_cache').select('student_id, rank_type, period, rank');
            const oldRankMap = new Map<string, number>(); // Key: `${student_id}-${rank_type}-${period}`
            if (oldCache) {
                for (const row of oldCache as any[]) {
                    oldRankMap.set(`${row.student_id}-${row.rank_type}-${row.period}`, row.rank);
                }
            }

            // 2. Fetch daily_activity records to compute aggregates
            const todayDate = new Date();
            const todayStr = todayDate.toISOString().split('T')[0];

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(todayDate.getDate() - 7);
            const weeklyStr = sevenDaysAgo.toISOString().split('T')[0];

            // Fetch all activity from the last 7 days for weekly/daily logic OR all the latest row for all_time
            const { data: activities, error: activityError } = await supabase
                .from('daily_activity')
                .select('student_id, total_solved, daily_delta, activity_date')
                .order('activity_date', { ascending: false });

            if (activityError) throw activityError;

            // Map data aggregations per student
            const statsMap = new Map<string, { allTime: number, weekly: number, daily: number }>();

            for (const student of students as any[]) {
                statsMap.set(student.id, { allTime: 0, weekly: 0, daily: 0 });
            }

            if (activities) {
                for (const act of activities as any[]) {
                    const s = statsMap.get(act.student_id);
                    if (!s) continue;

                    // All-Time: use MAX total_solved across ALL records.
                    // Do NOT use latest-date row only — it can be lower due to data spikes/resets.
                    // Problems are cumulative (never un-solved), so MAX is the true lifetime count.
                    const actTotal = act.total_solved || 0;
                    if (actTotal > s.allTime) {
                        s.allTime = actTotal;
                    }

                    // Weekly: sum all daily_deltas from the last 7 days
                    if (act.activity_date >= weeklyStr) {
                        s.weekly += (act.daily_delta || 0);
                    }

                    // Daily: only today's delta
                    if (act.activity_date === todayStr) {
                        s.daily += (act.daily_delta || 0);
                    }
                }
            }

            // 3. Helper to generate cache updates for a specific period
            const cacheUpdates: any[] = [];
            const now = new Date().toISOString();

            const processPeriodRanks = (period: string) => {
                const baseData = (students as any[]).map(student => ({
                    student_id: student.id,
                    streak: student.current_streak || 0,
                    score: period === 'all_time' ? statsMap.get(student.id)!.allTime :
                        period === 'weekly' ? statsMap.get(student.id)!.weekly :
                            statsMap.get(student.id)!.daily, // daily
                    department_id: student.department_id,
                    year_id: student.year_id,
                    section_id: student.section_id,
                    team_id: teamMap.get(student.id) || null
                }));

                const generateRanks = (groupMap: Map<string, any[]>, rankType: string) => {
                    for (const [_, members] of groupMap.entries()) {
                        // Sort descending by score, then streak, then UUID
                        members.sort((a, b) => {
                            if (b.score !== a.score) return b.score - a.score;
                            if (b.streak !== a.streak) return b.streak - a.streak;
                            return a.student_id.localeCompare(b.student_id);
                        });

                        // Assign ranks
                        members.forEach((member, index) => {
                            const currentRank = index + 1;
                            const cacheKey = `${member.student_id}-${rankType}-${period}`;
                            // The new previous_rank is whatever rank they held *before* we ran this update
                            const previousRank = oldRankMap.get(cacheKey) || null;

                            cacheUpdates.push({
                                student_id: member.student_id,
                                rank_type: rankType,
                                period: period,
                                rank: currentRank,
                                previous_rank: previousRank,
                                total_solved: member.score,
                                streak: member.streak,
                                last_updated: now
                            });
                        });
                    }
                };

                // Group Data
                const collegeGroup = new Map<string, any[]>([['college', [...baseData]]]);
                const deptGroup = new Map<string, any[]>();
                const yearGroup = new Map<string, any[]>();
                const sectionGroup = new Map<string, any[]>();
                const teamGroup = new Map<string, any[]>();

                baseData.forEach(d => {
                    if (d.department_id) {
                        if (!deptGroup.has(d.department_id)) deptGroup.set(d.department_id, []);
                        deptGroup.get(d.department_id)!.push({ ...d });
                    }
                    if (d.year_id) {
                        if (!yearGroup.has(d.year_id)) yearGroup.set(d.year_id, []);
                        yearGroup.get(d.year_id)!.push({ ...d });
                    }
                    if (d.section_id) {
                        if (!sectionGroup.has(d.section_id)) sectionGroup.set(d.section_id, []);
                        sectionGroup.get(d.section_id)!.push({ ...d });
                    }
                    if (d.team_id) {
                        if (!teamGroup.has(d.team_id)) teamGroup.set(d.team_id, []);
                        teamGroup.get(d.team_id)!.push({ ...d });
                    }
                });

                generateRanks(collegeGroup, 'college');
                generateRanks(deptGroup, 'department');
                generateRanks(yearGroup, 'year');
                generateRanks(sectionGroup, 'section');
                generateRanks(teamGroup, 'team');
            };

            // Calculate for all periods
            processPeriodRanks('all_time');
            processPeriodRanks('weekly');
            processPeriodRanks('daily');

            // 4. Clear old cache completely
            await supabase.from('leaderboard_cache').delete().neq('period', 'none'); // Deletes all realistically

            // 5. Batch insert
            const BATCH_SIZE = 900;
            for (let i = 0; i < cacheUpdates.length; i += BATCH_SIZE) {
                const chunk = cacheUpdates.slice(i, i + BATCH_SIZE);
                const { error: insertError } = await (supabase.from('leaderboard_cache') as any).insert(chunk);
                if (insertError) throw insertError;
            }

            console.log(`Leaderboard updated with ${cacheUpdates.length} total ranking entries across all periods!`);
        } catch (error) {
            console.error('Leaderboard update error:', error);
        }
    }

    // Helper to get streak (kept for backwards compatibility if needed elsewhere)
    static async getStudentStreak(studentId: string): Promise<number> {
        const { data } = await supabase.from('students').select('current_streak').eq('id', studentId).maybeSingle()
        return (data as any)?.current_streak || 0
    }
}

export default ScraperService
