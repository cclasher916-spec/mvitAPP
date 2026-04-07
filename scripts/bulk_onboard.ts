// @ts-nocheck
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';

config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Create a Supabase client with the SERVICE_ROLE Auth bypass Key
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const DEFAULT_PASSWORD = 'Password@123';

// URL Parsing Helpers
function extractUsername(url: string, platform: string): string | null {
    if (!url || url.trim() === '' || url.includes('share.google') || url.toLowerCase() === 'nil') return null;

    try {
        const cleanUrl = url.trim().replace(/\/$/, ''); // Remove trailing slash

        switch (platform) {
            case 'leetcode':
                // https://leetcode.com/u/Username or https://leetcode.com/Username
                const lcMatch = cleanUrl.match(/leetcode\.com\/(u\/)?([a-zA-Z0-9_-]+)/i);
                return lcMatch ? lcMatch[2] : null;

            case 'codechef':
                // https://www.codechef.com/users/Username
                const ccMatch = cleanUrl.match(/codechef\.com\/users\/([a-zA-Z0-9_-]+)/i);
                return ccMatch ? ccMatch[1] : null;

            case 'hackerrank':
                // https://www.hackerrank.com/profile/Username
                const hrMatch = cleanUrl.match(/hackerrank\.com\/(profile\/)?([a-zA-Z0-9_-]+)/i);
                return hrMatch ? hrMatch[2] : null;

            case 'github':
                // https://github.com/Username
                const ghMatch = cleanUrl.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
                return ghMatch ? ghMatch[1] : null;

            default:
                return null;
        }
    } catch (e) {
        return null;
    }
}

async function getOrCreateDepartment(deptCode: string): Promise<string> {
    const { data: dept } = await supabaseAdmin.from('departments').select('id').eq('code', deptCode).maybeSingle();
    if (dept) return dept.id;

    // Create if not exists
    const { data: newDept, error } = await supabaseAdmin.from('departments').insert({
        name: deptCode,
        code: deptCode,
    }).select('id').single();

    if (error) throw error;
    return newDept.id;
}

async function getOrCreateYear(deptId: string, batchLabel: string): Promise<string> {
    // Determine year based on batch (e.g. 2023-2027 -> Year 2 in 2024/2025)
    // We'll hardcode to year 2 for 2023 batch dynamically, or default to 1
    let yearNum = 1;
    if (batchLabel.includes('2023')) yearNum = 2; // Rough estimation for now
    if (batchLabel.includes('2022')) yearNum = 3;
    if (batchLabel.includes('2021')) yearNum = 4;

    const { data: yr } = await supabaseAdmin.from('years').select('id').eq('department_id', deptId).eq('year_number', yearNum).maybeSingle();
    if (yr) return yr.id;

    const { data: newYr, error } = await supabaseAdmin.from('years').insert({
        department_id: deptId,
        year_number: yearNum,
    }).select('id').single();

    if (error) throw error;
    return newYr.id;
}

async function getOrCreateSection(yearId: string, sectionName: string): Promise<string> {
    const { data: sec } = await supabaseAdmin.from('sections').select('id').eq('year_id', yearId).eq('name', sectionName).maybeSingle();
    if (sec) return sec.id;

    const { data: newSec, error } = await supabaseAdmin.from('sections').insert({
        year_id: yearId,
        name: sectionName,
    }).select('id').single();

    if (error) throw error;
    return newSec.id;
}

async function processStudents() {
    const csvFilePath = resolve(__dirname, '../students_data.csv.csv');
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = fileContent.split('\n');

    console.log(`Found ${lines.length - 1} rows to process...`);

    // We'll store parsed data to do a 2-pass (Pass 1: Students & Leaders, Pass 2: Team Members)
    const studentsData: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV split (assuming no commas in the values themselves for this data format)
        const columns = line.split(',');

        if (columns.length < 14) continue;

        const timestamp = columns[0].trim();
        const rollNo = columns[1].trim();
        const fullName = columns[2].trim();
        const email = columns[3].trim();
        const deptCode = columns[4].trim(); // AIML
        const sectionName = columns[5].trim(); // A
        const teamName = columns[6].trim();
        const leetCodeUrl = columns[7].trim();
        const skillRackUrl = columns[8].trim(); // Ignoring for now as schema doesn't have it
        const codeChefUrl = columns[9].trim();
        const hackerRankUrl = columns[10].trim();
        const githubUrl = columns[11].trim();
        const teamLeadName = columns[12].trim().toLowerCase();
        const batch = columns[13].trim();

        if (!rollNo) continue;

        studentsData.push({
            rollNo,
            fullName,
            rawEmail: email,
            deptCode,
            sectionName,
            teamName,
            leetCodeUsername: extractUsername(leetCodeUrl, 'leetcode'),
            codeChefUsername: extractUsername(codeChefUrl, 'codechef'),
            hackerRankUsername: extractUsername(hackerRankUrl, 'hackerrank'),
            githubUsername: extractUsername(githubUrl, 'github'),
            isTeamLeader: teamLeadName === fullName.toLowerCase() || fullName.toLowerCase().includes(teamLeadName),
            batch,
            studentId: null // To be filled after insertion
        });
    }

    console.log(`Parsed ${studentsData.length} valid student records. Starting insertions...`);

    // --- PASS 1: CREATE DEPARTMENTS, USERS, STUDENTS, PLATFORMS ---
    for (const student of studentsData) {
        console.log(`Processing: ${student.rollNo} - ${student.fullName}`);

        // 1. Geography Setup
        const deptId = await getOrCreateDepartment(student.deptCode);
        const yearId = await getOrCreateYear(deptId, student.batch);
        const sectionId = await getOrCreateSection(yearId, student.sectionName);

        // 2. Auth User Setup
        const authEmail = `${student.rollNo.toLowerCase()}@mvit.student`;
        let authUserId = null;

        // Check if user exists in our tracking `users` table first
        const { data: existingAppUser } = await supabaseAdmin.from('users').select('id').eq('email', authEmail).maybeSingle();

        if (existingAppUser) {
            authUserId = existingAppUser.id;
        } else {
            // Check auth system
            const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
            let authUser = existingAuthUsers.users.find(u => u.email === authEmail);

            if (!authUser) {
                // Create auth user
                const { data: newAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: authEmail,
                    password: DEFAULT_PASSWORD,
                    email_confirm: true,
                });
                if (authError) {
                    console.error(`Auth creation failed for ${student.rollNo}:`, authError.message);
                    continue;
                }
                authUser = newAuthData.user;
            }

            // Create tracking user
            const { data: newTrackerUser, error: trackerError } = await supabaseAdmin.from('users').insert({
                id: authUser.id,
                email: authEmail,
                role: student.isTeamLeader ? 'team_leader' : 'student'
            }).select('id').single();

            if (trackerError) {
                console.error(`Tracking User insertion failed for ${student.rollNo}:`, trackerError.message);
                continue;
            }
            authUserId = newTrackerUser.id;
        }

        // 3. Student Setup
        let currentStudentId = null;
        const { data: existingStudent } = await supabaseAdmin.from('students').select('id').eq('roll_no', student.rollNo).maybeSingle();

        if (existingStudent) {
            currentStudentId = existingStudent.id;
            // Update leader status if needed
            await supabaseAdmin.from('students').update({ is_team_leader: student.isTeamLeader }).eq('id', currentStudentId);
        } else {
            const { data: newStudent, error: studError } = await supabaseAdmin.from('students').insert({
                user_id: authUserId,
                roll_no: student.rollNo,
                name: student.fullName,
                department_id: deptId,
                year_id: yearId,
                section_id: sectionId,
                batch: student.batch,
                is_team_leader: student.isTeamLeader,
            }).select('id').single();

            if (studError) {
                console.error(`Student insertion failed for ${student.rollNo}:`, studError.message);
                continue;
            }
            currentStudentId = newStudent.id;
        }

        student.studentId = currentStudentId;

        // 4. Platform Setup
        const platformsToInsert = [];
        if (student.leetCodeUsername) platformsToInsert.push({ student_id: currentStudentId, platform: 'leetcode', username: student.leetCodeUsername });
        if (student.codeChefUsername) platformsToInsert.push({ student_id: currentStudentId, platform: 'codechef', username: student.codeChefUsername });
        if (student.hackerRankUsername) platformsToInsert.push({ student_id: currentStudentId, platform: 'hackerrank', username: student.hackerRankUsername });
        if (student.githubUsername) platformsToInsert.push({ student_id: currentStudentId, platform: 'github', username: student.githubUsername });

        for (const plat of platformsToInsert) {
            // Upsert to handle existing
            await supabaseAdmin.from('platform_accounts').upsert({
                student_id: plat.student_id,
                platform: plat.platform,
                username: plat.username
            }, { onConflict: 'student_id,platform' }).select().maybeSingle();
        }
    }

    // --- PASS 2: TEAMS & TEAM MEMBERS ---
    console.log('--- Starting Team Mappings ---');

    for (const student of studentsData) {
        if (!student.teamName) continue;
        if (!student.studentId) continue; // Failed to create student previously

        let teamId = null;

        // If this student is the leader, ensure the team is created
        if (student.isTeamLeader) {
            const { data: existingTeam } = await supabaseAdmin.from('teams')
                .select('id')
                .eq('name', student.teamName)
                // Note: ignoring section restriction in search for robustness in bulk import
                .maybeSingle();

            if (existingTeam) {
                teamId = existingTeam.id;
            } else {
                // We need the section Id again
                const { data: secData } = await supabaseAdmin.from('students').select('section_id').eq('id', student.studentId).single();

                const { data: newTeam, error: teamError } = await supabaseAdmin.from('teams').insert({
                    name: student.teamName,
                    section_id: secData.section_id,
                    team_leader_id: student.studentId,
                    max_members: 6
                }).select('id').single();

                if (!teamError) teamId = newTeam.id;
                else console.error(`Error creating team ${student.teamName}:`, teamError.message);
            }
        }
    }

    // Now map everyone to their teams
    for (const student of studentsData) {
        if (!student.teamName || !student.studentId) continue;

        // Find the team
        const { data: team } = await supabaseAdmin.from('teams').select('id').eq('name', student.teamName).maybeSingle();

        if (team) {
            // Add member
            await supabaseAdmin.from('team_members').upsert({
                team_id: team.id,
                student_id: student.studentId
            }, { onConflict: 'team_id,student_id' });
        }
    }

    console.log('Bulk Onboarding Completed Successfully!');
}

processStudents().catch(console.error);
