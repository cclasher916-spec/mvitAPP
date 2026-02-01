import { createClient } from '@supabase/supabase-js'
import { Database } from '../lib/database.types'
import 'dotenv/config'

// Re-using config from lib/supabase.ts (for anon client)
const supabaseUrl = process.env.SUPABASE_URL || 'https://rwrmcovajrgcqwyrztqz.supabase.co'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3cm1jb3ZhanJnY3F3eXJ6dHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzIxNDMsImV4cCI6MjA4NTI0ODE0M30.maf_ZnhHOmP8SaTrPvM_-mZiHtGunO4D_rvWyYhEM9I'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceRoleKey) {
    console.error('SERVER_ROLE_KEY is missing in .env')
    process.exit(1)
}

// Create untyped clients since database.types.ts is incomplete
// (missing departments, years, sections, teams, team_members tables)
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

async function seedUser() {
    console.log('Starting seed for Agilesh S...')

    const rollNo = '1' // Roll number for Agilesh S
    const email = `${rollNo.toLowerCase()}@mvit.student` // Roll-based email for college app
    const password = 'TempPassword123!' // Setting a default password
    const name = 'Agilesh S'

    // 1. Create/Get User via Admin API (no rate limits, no emails)
    console.log('Checking/creating user via Admin API...')
    console.log('SEEDED EMAIL:', email) // Debug log
    let userId: string | null = null

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
        console.error('Failed to list users:', listError.message)
        return
    }

    // Find user by email OR by roll number pattern (handles migration from old emails like Gmail)
    const existingUser = existingUsers.users.find(
        u => u.email === email || u.email?.startsWith(`${rollNo}@`)
    )

    if (existingUser) {
        userId = existingUser.id
        console.log('User already exists:', userId)
    } else {
        // Create new user via admin API (bypasses rate limits and email confirmation)
        const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true // Skip email confirmation
        })

        if (createError) {
            console.error('Admin user creation failed:', createError.message)
            return
        }

        userId = data.user.id
        console.log('User created via admin API:', userId)
    }

    if (!userId) {
        console.error('Failed to obtain User ID')
        return
    }

    // 2. Create corresponding entry in users table (for foreign key constraint)
    console.log('Ensuring user exists in users table...')
    const { error: userTableError } = await supabaseAdmin.from('users').upsert({
        id: userId,
        email: email,
        role: 'student'
    }, { onConflict: 'id' })

    if (userTableError) {
        console.error('Failed to create users table entry:', userTableError.message)
        return
    }

    // 3. Resolve Foreign Keys
    console.log('Resolving IDs...')

    // Department
    let departmentId: string | undefined
    const { data: dept, error: deptError } = await supabaseAdmin.from('departments').select('id').eq('code', 'AIML').maybeSingle()

    if (deptError) console.error('Error fetching department:', deptError.message)

    if (dept) {
        departmentId = dept.id
        console.log('Department AIML found:', departmentId)
    } else {
        // Try creating
        console.log('Department AIML not found. Attempting creation...')
        const { data: newDept, error } = await supabaseAdmin.from('departments').insert({
            name: 'Artificial Intelligence and Machine Learning',
            code: 'AIML'
        }).select().single()
        if (error) console.error('Failed to create department:', error.message)
        else {
            departmentId = newDept.id
            console.log('Department created:', departmentId)
        }
    }

    // Year (3rd Year for 2026 current date and 2023-2027 batch)
    let yearId: string | undefined
    // Need to find year corresponding to year_number 3 and this department
    if (departmentId) {
        const { data: yearData } = await supabaseAdmin.from('years').select('id').eq('department_id', departmentId).eq('year_number', 3).maybeSingle()
        yearId = yearData?.id
        if (!yearId) {
            // Attempt create
            const { data: newYear, error } = await supabaseAdmin.from('years').insert({
                year_number: 3,
                department_id: departmentId
            }).select().single()
            if (newYear) yearId = newYear.id
            if (error) console.error('Failed to create year:', error.message)
        }
    }

    // Section (A)
    let sectionId: string | undefined
    if (yearId) {
        const { data: secData } = await supabaseAdmin.from('sections').select('id').eq('year_id', yearId).eq('name', 'A').maybeSingle()
        sectionId = secData?.id
        if (!sectionId) {
            const { data: newSec, error } = await supabaseAdmin.from('sections').insert({
                name: 'A',
                year_id: yearId
            }).select().single()
            if (newSec) sectionId = newSec.id
            if (error) console.error('Failed to create section:', error.message)
        }
    }

    if (!departmentId || !yearId || !sectionId) {
        console.error('Missing foreign keys:', { departmentId, yearId, sectionId })
        console.log('Cannot proceed with Student creation due to missing Reference Data.')
        // We might want to just dump what we have if we can't create relationships.
        return
    }

    // 3. Upsert Student (using admin to bypass RLS)
    console.log('Upserting Student Profile...')
    const { data: student, error: studentError } = await supabaseAdmin.from('students').upsert({
        user_id: userId,
        roll_no: rollNo,
        name: name,
        department_id: departmentId,
        year_id: yearId,
        section_id: sectionId,
        batch: '2023-2027',
        is_team_leader: true // "Team Lead: Agilesh S" implies self
    }, { onConflict: 'user_id' }).select().single()

    if (studentError) {
        console.error('Student upsert failed:', studentError.message)
        return
    }

    if (!student) {
        console.error('Student upsert returned no data')
        return
    }

    console.log('Student created:', student.id)

    // 4. Team (Bytebreakers)
    // Check if team exists
    let teamId: string | undefined
    const { data: existingTeam } = await supabaseAdmin.from('teams').select('id').eq('name', 'Bytebreakers').eq('section_id', sectionId).maybeSingle()

    if (existingTeam) {
        teamId = existingTeam.id
    } else {
        console.log('Creating Team Bytebreakers...')
        const { data: newTeam, error: teamError } = await supabaseAdmin.from('teams').insert({
            name: 'Bytebreakers',
            section_id: sectionId,
            team_leader_id: student.id,
            max_members: 5
        }).select().single()

        if (teamError) {
            console.error('Team creation failed:', teamError.message)
        } else {
            teamId = newTeam.id
        }
    }

    if (teamId) {
        // Add member (using admin to bypass RLS)
        await supabaseAdmin.from('team_members').upsert({
            team_id: teamId,
            student_id: student.id
        })
        console.log('Added to team.')
    }

    // 5. Platforms (using admin to bypass RLS)
    console.log('Linking Platforms...')
    const platforms = [
        { platform: 'leetcode', username: 'agilesh304', url: 'https://leetcode.com/u/agilesh304/' },
        { platform: 'codechef', username: 'agilesh304', url: 'https://www.codechef.com/users/agilesh304' },
        { platform: 'hackerrank', username: 'agilesh304', url: 'https://www.hackerrank.com/profile/agilesh304' },
        { platform: 'github', username: 'agilesh304', url: 'https://github.com/agilesh304/' },
        // SkillRack ignored
    ]

    for (const p of platforms) {
        const { error: pError } = await supabaseAdmin.from('platform_accounts').upsert({
            student_id: student.id,
            platform: p.platform as any,
            username: p.username,
            connected_at: new Date().toISOString()
        }, { onConflict: 'student_id,platform' })

        if (pError) console.error(`Failed to link ${p.platform}:`, pError.message)
        else console.log(`Linked ${p.platform}`)
    }

    console.log('Seeding successful!')
}

seedUser().catch(console.error)
