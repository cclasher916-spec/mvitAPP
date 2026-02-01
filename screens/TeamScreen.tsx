import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

export default function TeamScreen({ navigation }: any) {
    const [team, setTeam] = useState<any>(null)
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchTeamData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Get student ID from auth ID
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('id')
                .eq('auth_id', user.id) // Note: schema says 'user_id', checking schema again... schema says user_id.
                // Wait, schema line 48: user_id UUID NOT NULL UNIQUE REFERENCES users(id)
                // Adjusting query to use user_id
                .eq('user_id', user.id)
                .single()

            if (studentError || !studentData) {
                setLoading(false)
                return
            }

            // 2. Find which team this student belongs to
            const { data: membership } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('student_id', studentData.id)
                .single()

            if (!membership) {
                setTeam(null)
                setLoading(false)
                return
            }

            // 3. Get team details
            const { data: teamInfo } = await supabase
                .from('teams')
                .select('*')
                .eq('id', membership.team_id)
                .single()

            setTeam(teamInfo)

            // 4. Get all team members
            const { data: teamMemberships } = await supabase
                .from('team_members')
                .select('student_id')
                .eq('team_id', membership.team_id)

            if (teamMemberships && teamMemberships.length > 0) {
                const memberIds = teamMemberships.map(m => m.student_id)

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
                const mergedMembers = memberDetails?.map(m => {
                    const activity = activities?.find(a => a.student_id === m.id)
                    return {
                        ...m,
                        today_solved: activity?.total_solved || 0
                    }
                }).sort((a, b) => b.today_solved - a.today_solved) || []

                setMembers(mergedMembers)
            }
        } catch (error) {
            console.error('Error fetching team:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchTeamData()
    }, [])

    const onRefresh = () => {
        setRefreshing(true)
        fetchTeamData()
    }

    const renderMember = ({ item, index }: any) => (
        <View style={styles.memberCard}>
            <View style={styles.rankContainer}>
                <Text style={styles.rank}>{index + 1}</Text>
            </View>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberRoll}>{item.roll_no}</Text>
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

    if (!team) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#333" onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>My Team</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="account-group-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>You are not in a team yet.</Text>
                    <Text style={styles.emptySubtext}>Ask your HOD or Admin to assign you to a team.</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#333" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>{team.name}</Text>
                <MaterialCommunityIcons name="trophy-outline" size={24} color="#FFB800" />
            </View>

            <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={
                    <View style={styles.teamStats}>
                        <Text style={styles.subHeader}>Team Leaderboard (Today)</Text>
                    </View>
                }
            />
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
    subHeader: {
        fontSize: 14,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1,
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
    },
})
