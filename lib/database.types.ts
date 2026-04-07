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
                    platform: 'leetcode' | 'codechef' | 'codeforces' | 'hackerrank' | 'github' | 'skillrack'
                    username: string
                    connected_at: string
                    last_synced_at: string | null
                }
                Insert: {
                    id?: string
                    student_id: string
                    platform: 'leetcode' | 'codechef' | 'codeforces' | 'hackerrank' | 'github' | 'skillrack'
                    username: string
                    connected_at?: string
                    last_synced_at?: string | null
                }
                Update: {
                    id?: string
                    student_id?: string
                    platform?: 'leetcode' | 'codechef' | 'codeforces' | 'hackerrank' | 'github' | 'skillrack'
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
                    github_solved: number
                    skillrack_solved: number
                    total_solved: number
                    daily_delta: number
                    leetcode_delta: number
                    codechef_delta: number
                    codeforces_delta: number
                    hackerrank_delta: number
                    github_delta: number
                    skillrack_delta: number
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    student_id: string
                    activity_date: string
                    leetcode_solved?: number
                    codechef_solved?: number
                    codeforces_solved?: number
                    hackerrank_solved?: number
                    github_solved?: number
                    skillrack_solved?: number
                    total_solved?: number
                    daily_delta?: number
                    leetcode_delta?: number
                    codechef_delta?: number
                    codeforces_delta?: number
                    hackerrank_delta?: number
                    github_delta?: number
                    skillrack_delta?: number
                    is_active?: boolean
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
                    github_solved?: number
                    skillrack_solved?: number
                    total_solved?: number
                    daily_delta?: number
                    leetcode_delta?: number
                    codechef_delta?: number
                    codeforces_delta?: number
                    hackerrank_delta?: number
                    github_delta?: number
                    skillrack_delta?: number
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
            teams: {
                Row: {
                    id: string
                    name: string
                    section_id: string
                    team_leader_id: string
                    max_members: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    section_id: string
                    team_leader_id: string
                    max_members?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    section_id?: string
                    team_leader_id?: string
                    max_members?: number
                    created_at?: string
                }
            }
            team_members: {
                Row: {
                    id: string
                    team_id: string
                    student_id: string
                    joined_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    student_id: string
                    joined_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    student_id?: string
                    joined_at?: string
                }
            }
            departments: {
                Row: {
                    id: string
                    name: string
                    code: string
                    hod_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    code: string
                    hod_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    code?: string
                    hod_id?: string | null
                    created_at?: string
                }
            }
            years: {
                Row: {
                    id: string
                    year_number: number
                    department_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    year_number: number
                    department_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    year_number?: number
                    department_id?: string
                    created_at?: string
                }
            }
            sections: {
                Row: {
                    id: string
                    name: string
                    year_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    year_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    year_id?: string
                    created_at?: string
                }
            }
        }
    }
}
