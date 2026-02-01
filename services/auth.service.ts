import { supabase } from '../lib/supabase'

export interface LoginCredentials {
    rollNo: string
    password: string
}

export interface SignupData extends LoginCredentials {
    name: string
    email: string
    departmentId: string
    yearId: string
    sectionId: string
    batch?: string
    mobile?: string
}

export class AuthService {
    /**
     * Login student using Roll No + Password
     * Roll No is used as username for authentication
     */
    static async login(rollNo: string, password: string) {
        try {
            // Normalize roll number to email
            const email = `${rollNo.toLowerCase()}@mvit.student`

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            console.log('LOGIN EMAIL:', email) // Debug log

            // Fetch student profile using user_id (more robust than roll_no)
            // This prevents issues with duplicate roll numbers across sections
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select(
                    `
          id,
          roll_no,
          name,
          department_id,
          year_id,
          section_id,
          batch,
          mobile,
          is_team_leader
        `
                )
                .eq('user_id', data.user.id)
                .single()

            if (studentError) throw studentError

            return {
                user: data.user,
                student,
                session: data.session,
            }
        } catch (error) {
            throw error
        }
    }

    /**
     * Check if student needs to change password on first login
     * NOTE: For MVP, always returns true to prompt password change
     * In production, implement this logic in a backend API with proper admin access
     */
    static async needsPasswordChange(userId: string) {
        // ⚠️ SECURITY: Cannot use auth.admin in frontend/Expo
        // auth.admin requires SERVICE_ROLE_KEY which must NEVER be in mobile apps
        // For MVP: always prompt password change on first login
        return true
    }

    /**
     * Update password
     */
    static async updatePassword(newPassword: string) {
        try {
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword,
            })

            if (error) throw error
            return data
        } catch (error) {
            throw error
        }
    }

    /**
     * Logout
     */
    static async logout() {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
        } catch (error) {
            throw error
        }
    }

    /**
     * Get current session
     */
    static async getSession() {
        try {
            const { data, error } = await supabase.auth.getSession()
            if (error) throw error
            return data.session
        } catch (error) {
            throw error
        }
    }

    /**
     * Get current user
     */
    static async getCurrentUser() {
        try {
            const { data, error } = await supabase.auth.getUser()
            if (error) throw error
            return data.user
        } catch (error) {
            throw error
        }
    }
}

export default AuthService
