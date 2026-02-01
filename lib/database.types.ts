export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    role: 'super_admin' | 'hod' | 'team_leader' | 'student'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    role: 'super_admin' | 'hod' | 'team_leader' | 'student'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    role?: 'super_admin' | 'hod' | 'team_leader' | 'student'
                    created_at?: string
                    updated_at?: string
                }
            }
            students: {
                Row: {
                    id: string
                    user_id: string
                    roll_no: string
                    name: string
                    department_id: string
                    year_id: string
                    section_id: string
                    batch: string | null
                    mobile: string | null
                    is_team_leader: boolean
                    created_at: string
                    updated_at: string
                    current_streak: number
                }
                Insert: {
                    id?: string
                    user_id: string
                    roll_no: string
                    name: string
                    department_id: string
                    year_id: string
                    section_id: string
                    batch?: string | null
                    mobile?: string | null
                    is_team_leader?: boolean
                    created_at?: string
                    updated_at?: string
                    current_streak?: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    roll_no?: string
                    name?: string
                    department_id?: string
                    year_id?: string
                    section_id?: string
                    batch?: string | null
                    mobile?: string | null
                    is_team_leader?: boolean
                    created_at?: string
                    updated_at?: string
                    current_streak?: number
                }
            }
            platform_accounts: {
                Row: {
                    id: string
                    student_id: string
                    platform: 'leetcode' | 'codechef' | 'codeforces' | 'hackerrank' | 'github'
                    username: string
                    connected_at: string
                    last_synced_at: string | null
                }
                Insert: {
                    id?: string
                    student_id: string
                    platform: 'leetcode' | 'codechef' | 'codeforces' | 'hackerrank' | 'github'
                    username: string
                    connected_at?: string
                    last_synced_at?: string | null
                }
                Update: {
                    id?: string
                    student_id?: string
                    platform?: 'leetcode' | 'codechef' | 'codeforces' | 'hackerrank' | 'github'
                    username?: string
                    connected_at?: string
                    last_synced_at?: string | null
                }
            }
            daily_activity: {
                Row: {
                    id: string
                    student_id: string
                    activity_date: string
                    leetcode_solved: number
                    codechef_solved: number
                    codeforces_solved: number
                    hackerrank_solved: number
                    total_solved: number
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    student_id: string
                    activity_date: string
                    leetcode_solved: number
                    codechef_solved: number
                    codeforces_solved: number
                    hackerrank_solved: number
                    total_solved: number
                    is_active: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    student_id?: string
                    activity_date?: string
                    leetcode_solved?: number
                    codechef_solved?: number
                    codeforces_solved?: number
                    hackerrank_solved?: number
                    total_solved?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            leaderboard_cache: {
                Row: {
                    id: string
                    student_id: string
                    rank_type: 'college' | 'department' | 'year' | 'section' | 'team'
                    period: 'daily' | 'weekly' | 'monthly' | 'overall'
                    rank: number | null
                    total_solved: number | null
                    streak: number
                    last_updated: string
                }
                Insert: {
                    id?: string
                    student_id: string
                    rank_type: 'college' | 'department' | 'year' | 'section' | 'team'
                    period: 'daily' | 'weekly' | 'monthly' | 'overall'
                    rank?: number | null
                    total_solved?: number | null
                    streak: number
                    last_updated: string
                }
                Update: {
                    id?: string
                    student_id?: string
                    rank_type?: 'college' | 'department' | 'year' | 'section' | 'team'
                    period?: 'daily' | 'weekly' | 'monthly' | 'overall'
                    rank?: number | null
                    total_solved?: number | null
                    streak?: number
                    last_updated?: string
                }
            }
        }
    }
}
