import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    TouchableOpacity,
    Alert,
    Modal
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

export default function TeamScreen({ navigation, route, student: propStudent }: any) {
    const [team, setTeam] = useState<any>(null)
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [stats, setStats] = useState({
        totalSolved: 0,
        avgStreak: 0,
        activeMembers: 0
    })

    const student = propStudent || route.params?.student

    // Team Leader Actions
    const [isCreating, setIsCreating] = useState(false)
    const [teamName, setTeamName] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [addRollNo, setAddRollNo] = useState('')
    const [addingMember, setAddingMember] = useState(false)

    useEffect(() => {
        fetchTeamData()
    }, [student?.id])

    const fetchTeamData = async () => {
        if (!student?.id) {
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true)

            // Get team membership
            const { data: membership, error: memberError } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('student_id', student.id)
                .maybeSingle()

            if (memberError) throw memberError

            if (!membership) {
                setTeam(null)
                setMembers([])
                setLoading(false)
                return
            }

            // 3. Get team details
            const { data: teamInfo } = await supabase
                .from('teams')
                .select('*')
                .eq('id', (membership as any).team_id)
                .single()

            setTeam(teamInfo)

            // 4. Get all team members
            const { data: teamMemberships } = await supabase
                .from('team_members')
                .select('student_id')
                .eq('team_id', (membership as any).team_id)

            if (teamMemberships && teamMemberships.length > 0) {
                const memberIds = teamMemberships.map((m: any) => m.student_id)

                // Fetch member details
                const { data: memberDetails } = await supabase
                    .from('students')
                    .select('id, name, roll_no, current_streak')
                    .in('id', memberIds)

                // Fetch their daily activity for today
                const today = new Date().toISOString().split('T')[0]
                const { data: activities } = await supabase
                    .from('daily_activity')
                    .select('student_id, total_solved')
                    .in('student_id', memberIds)
                    .eq('activity_date', today)

                // Merge data
                const mergedMembers = memberDetails?.map((m: any) => {
                    const activity = activities?.find((a: any) => a.student_id === m.id)
                    return {
                        ...m,
                        today_solved: (activity as any)?.total_solved || 0
                    }
                }).sort((a: any, b: any) => b.today_solved - a.today_solved) || []

                setMembers(mergedMembers)
            }
        } catch (error) {
            console.error('Error fetching team:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const onRefresh = () => {
        setRefreshing(true)
        fetchTeamData()
    }

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            Alert.alert('Error', 'Team name is required')
            return
        }

        setIsCreating(true)
        try {
            // Create team
            const { data: newTeam, error: createError } = await (supabase
                .from('teams') as any)
                .insert({
                   name: teamName.trim(),
                   section_id: student.section_id,
                   team_leader_id: student.id,
                   max_members: 5
                })
                .select()
                .single()

            if (createError) throw createError

            // 4. Add self as first member
            const { error: joinError } = await (supabase
                .from('team_members') as any)
                .insert({
                    team_id: (newTeam as any).id,
                    student_id: student.id
                })

            if (joinError) throw joinError

            Alert.alert('Success', 'Team created successfully!')
            fetchTeamData()
        } catch (error: any) {
            console.error('Create team error:', error)
            Alert.alert('Error', error.message || 'Failed to create team')
        } finally {
            setIsCreating(false)
        }
    }

    const handleAddMember = async () => {
        if (!addRollNo.trim()) return

        setAddingMember(true)
        try {
            // Check if student exists in our DB
            const { data: newMember, error: searchError } = await (supabase
                .from('students') as any)
                .select('*')
                .eq('roll_no', addRollNo.trim().toUpperCase())
                .eq('section_id', (student as any).section_id)
                .maybeSingle()

            if (searchError) throw searchError
            if (!newMember) {
                Alert.alert('Error', 'Student not found in your section.')
                return
            }

            // check if they are already in a team
            const { data: existing, error: checkError } = await (supabase
                .from('team_members') as any)
                .select('id')
                .eq('student_id', (newMember as any).id)
                .maybeSingle()

            if (checkError) throw checkError
            if (existing) {
                Alert.alert('Error', 'Student is already in a team.')
                return
            }

            // 4. Check team capacity
            if (members.length >= 5) {
                Alert.alert('Error', 'Team is full (Max 5 members).')
                return
            }

            // Add to team
            const { error: joinError } = await (supabase
                .from('team_members') as any)
                .insert({
                    team_id: team.id,
                    student_id: (newMember as any).id
                })

            if (joinError) throw joinError

            Alert.alert('Success', 'Member added!')
            setAddRollNo('')
            setShowAddModal(false)
            fetchTeamData()

        } catch (error: any) {
            console.error('Add member error:', error)
            Alert.alert('Error', 'Failed to add member')
        } finally {
            setAddingMember(false)
        }
    }

    const renderMember = ({ item, index }: any) => (
        <View style={styles.memberCard}>
            <View style={styles.rankContainer}>
                <Text style={styles.rank}>{index + 1}</Text>
            </View>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberRoll}>{item.roll_no}</Text>
                {team?.team_leader_id === item.id && (
                    <Text style={styles.leaderBadge}>Team Leader</Text>
                )}
            </View>
            <View style={styles.statsContainer}>
                <View style={styles.statBadge}>
                    <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FFB800" />
                    <Text style={styles.statText}>{item.today_solved}</Text>
                </View>
                <View style={[styles.statBadge, styles.streakBadge]}>
                    <MaterialCommunityIcons name="fire" size={16} color="#FF6B6B" />
                    <Text style={[styles.statText, { color: '#FF6B6B' }]}>{item.current_streak}</Text>
                </View>
            </View>
        </View>
    )

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        )
    }

    // SCENARIO 1: NO TEAM
    if (!team) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#333" onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>My Team</Text>
                    <View style={{ width: 24 }} />
                </View>

                {student?.is_team_leader ? (
                    // IS TEAM LEADER -> CREATE TEAM
                    <View style={styles.createContainer}>
                        <MaterialCommunityIcons name="account-group-outline" size={64} color="#007AFF" />
                        <Text style={styles.createTitle}>Create a Team</Text>
                        <Text style={styles.createSub}>
                            As a Team Leader, you can create a team and add members from your section.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter Team Name"
                            value={teamName}
                            onChangeText={setTeamName}
                        />

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleCreateTeam}
                            disabled={isCreating}
                        >
                            {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Team</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    // REGULAR STUDENT -> BLOCKED
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="account-lock-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>You are not in a team yet</Text>
                        <Text style={styles.emptySubtext}>
                            Only Team Leaders can formulate and manage Teams. Please reach out to your designated Team Leader, and they will add you using your Roll Number!
                        </Text>
                    </View>
                )}
            </SafeAreaView>
        )
    }

    // SCENARIO 2: HAS TEAM (VIEW + MANAGE IF LEADER)
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#333" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>{team.name}</Text>
                {student?.is_team_leader && student.id === team.team_leader_id ? (
                    <TouchableOpacity onPress={() => setShowAddModal(true)}>
                        <MaterialCommunityIcons name="account-plus" size={24} color="#007AFF" />
                    </TouchableOpacity>
                ) : (
                    <MaterialCommunityIcons name="trophy-outline" size={24} color="#FFB800" />
                )}
            </View>

            <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={
                    <View style={styles.teamStats}>
                        <View style={styles.infoRow}>
                            <Text style={styles.subHeader}>Students: {members.length}/{team.max_members}</Text>
                            <Text style={styles.subHeader}>Section: {student?.section_id ? 'Same' : 'Mixed'}</Text>
                        </View>
                    </View>
                }
            />

            {/* ADD MEMBER MODAL */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Team Member</Text>
                        <Text style={styles.modalSub}>Enter the Roll Number of the student.</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Roll No (e.g. CS2024001)"
                            value={addRollNo}
                            onChangeText={setAddRollNo}
                            autoCapitalize="characters"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={handleAddMember}
                                disabled={addingMember}
                            >
                                {addingMember ? <ActivityIndicator color="#fff" /> : <Text style={styles.addText}>Add</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    listContent: {
        padding: 16,
    },
    teamStats: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    subHeader: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    rankContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rank: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    memberRoll: {
        fontSize: 12,
        color: '#999',
    },
    leaderBadge: {
        fontSize: 10,
        color: '#007AFF',
        fontWeight: 'bold',
        marginTop: 2
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    streakBadge: {
        backgroundColor: '#FFEBEE',
    },
    statText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F57C00',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20
    },
    createContainer: {
        flex: 1,
        padding: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8
    },
    createSub: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 32
    },
    input: {
        width: '100%',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 16,
        fontSize: 16
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 16,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333'
    },
    modalSub: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16
    },
    modalInput: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 24
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cancelText: {
        color: '#666',
        fontWeight: '600'
    },
    addBtn: {
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8
    },
    addText: {
        color: '#fff',
        fontWeight: '600'
    }
})
