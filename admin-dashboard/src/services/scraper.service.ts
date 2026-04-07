import { supabaseAdmin } from '../lib/supabase'

export class ScraperService {
    static extractUsername(url: string, domain: string): string {
        if (!url) return ''
        let username = url.trim()
        if (username.includes(domain)) {
            let match;
            if (domain === 'leetcode.com') match = username.match(/\/u\/([^\/]+)/);
            else match = username.match(new RegExp(`${domain}\\/([^\\/]+)`));
            if (match && match[1]) return match[1];
            const parts = username.replace(/\/$/, '').split('/')
            username = parts[parts.length - 1]
        }
        return username
    }

    static async fetchLeetCodeStats(usernameOrUrl: string): Promise<number> {
        const username = this.extractUsername(usernameOrUrl, 'leetcode.com');
        if (!username) return 0;
        try {
            const response = await fetch('https://leetcode.com/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                body: JSON.stringify({
                    query: `query getUserProfile($username: String!) { matchedUser(username: $username) { submitStats: submitStatsGlobal { acSubmissionNum { difficulty count } } } }`,
                    variables: { username },
                }),
            })
            const data = await response.json()
            return data.data?.matchedUser?.submitStats?.acSubmissionNum?.find((s: any) => s.difficulty === 'All')?.count || 0
        } catch (e) { return 0 }
    }

    static async fetchCodeChefStats(usernameOrUrl: string): Promise<number> {
        const username = this.extractUsername(usernameOrUrl, 'codechef.com');
        if (!username) return 0;
        try {
            const response = await fetch(`https://codechef-api.vercel.app/${username}`)
            if (!response.ok) return 0
            const data = await response.json()
            return data.totalSolved || 0
        } catch (e) { return 0 }
    }

    static async fetchSkillRackStats(url: string): Promise<number> {
        if (!url || !url.startsWith('http')) return 0;
        try {
            const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const text = await response.text();
            const regex = /class=["'][^"']*value["'][^>]*>\s*([\d,]+)\s*<\/div>[\s\S]{0,100}PROGRAMS SOLVED/i;
            const match = text.match(regex);
            if (match && match[1]) return parseInt(match[1].replace(/,/g, ''), 10);
        } catch (e) {}
        return 0;
    }

    static async syncStudent(studentId: string, today: string, yesterday: string): Promise<void> {
        const { data: platforms } = await supabaseAdmin.from('platform_accounts').select('*').eq('student_id', studentId)
        if (!platforms) return

        let stats: any = { leetcode: 0, codechef: 0, skillrack: 0 }
        await Promise.all(platforms.map(async (p: any) => {
            if (p.platform === 'leetcode') stats.leetcode = await this.fetchLeetCodeStats(p.username)
            if (p.platform === 'codechef') stats.codechef = await this.fetchCodeChefStats(p.username)
            if (p.platform === 'skillrack') stats.skillrack = await this.fetchSkillRackStats(p.username)
        }))

        const totalSolved = stats.leetcode + stats.codechef + stats.skillrack

        const { data: previousActivity } = await supabaseAdmin
            .from('daily_activity')
            .select('*')
            .eq('student_id', studentId)
            .lt('activity_date', today)
            .order('activity_date', { ascending: false })
            .limit(1)
            .maybeSingle()

        const prevTotal = (previousActivity as any)?.total_solved || 0
        const dailyDelta = Math.max(0, totalSolved - prevTotal)

        const { data: yesterdayAct } = await supabaseAdmin.from('daily_activity').select('is_active').eq('student_id', studentId).eq('activity_date', yesterday).maybeSingle()
        const { data: studentData } = await supabaseAdmin.from('students').select('current_streak').eq('id', studentId).single()
        
        let newStreak = (studentData as any).current_streak
        if (dailyDelta > 0) {
            newStreak = (yesterdayAct as any)?.is_active ? newStreak + 1 : 1
        } else if (!(yesterdayAct as any)?.is_active) {
            newStreak = 0
        }

        await supabaseAdmin.from('students').update({ current_streak: newStreak }).eq('id', studentId)
        await supabaseAdmin.from('daily_activity').upsert({
            student_id: studentId, activity_date: today,
            leetcode_solved: stats.leetcode, codechef_solved: stats.codechef, skillrack_solved: stats.skillrack,
            total_solved: totalSolved, daily_delta: dailyDelta, is_active: dailyDelta > 0, updated_at: new Date().toISOString()
        })
    }

    static async runDailySync(): Promise<void> {
        const { data: students } = await supabaseAdmin.from('students').select('id')
        if (!students) return
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

        // Concurrent batching
        const BATCH_SIZE = 5
        for (let i = 0; i < students.length; i += BATCH_SIZE) {
            const batch = students.slice(i, i + BATCH_SIZE)
            await Promise.all(batch.map(s => this.syncStudent(s.id, today, yesterday)))
        }
        
        await this.updateLeaderboards()
    }

    static async updateLeaderboards(): Promise<void> {
        const { data: students } = await supabaseAdmin.from('students').select('id, current_streak, department_id, year_id, section_id')
        if (!students) return

        const { data: activities } = await supabaseAdmin.from('daily_activity').select('*').order('activity_date', { ascending: false })
        const statsMap = new Map<string, any>()
        students.forEach(s => statsMap.set(s.id, { allTime: 0, weekly: 0, daily: 0 }))

        const today = new Date().toISOString().split('T')[0]
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

        activities?.forEach(act => {
            const s = statsMap.get(act.student_id)
            if (!s) return
            if (s.allTime === 0) s.allTime = act.total_solved || 0
            if (act.activity_date >= sevenDaysAgo) s.weekly += (act.daily_delta || 0)
            if (act.activity_date === today) s.daily += (act.daily_delta || 0)
        })

        const periods = ['all_time', 'weekly', 'daily']
        const now = new Date().toISOString()
        let cacheUpdates: any[] = []

        for (const period of periods) {
            const ranked = students.map(s => ({
                id: s.id, streak: s.current_streak,
                score: period === 'all_time' ? statsMap.get(s.id).allTime : (period === 'weekly' ? statsMap.get(s.id).weekly : statsMap.get(s.id).daily)
            })).sort((a,b) => b.score - a.score || b.streak - a.streak)

            ranked.forEach((r, idx) => {
                cacheUpdates.push({
                    student_id: r.id, rank_type: 'college', period, rank: idx + 1,
                    total_solved: r.score, streak: r.streak, last_updated: now
                })
            })
        }

        await supabaseAdmin.from('leaderboard_cache').delete().neq('period', 'none')
        await (supabaseAdmin.from('leaderboard_cache') as any).insert(cacheUpdates)
    }
}
