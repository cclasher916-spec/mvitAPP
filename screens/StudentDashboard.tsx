import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import AuthService from '../services/auth.service'

interface StudentDashboardProps {
    student: any
    onLogout: () => void
    navigation: any
}

export default function StudentDashboard({
    student,
    onLogout,
    navigation,
}: StudentDashboardProps) {
    const [dailyActivity, setDailyActivity] = useState<any>(null)
    const [platforms, setPlatforms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [rank, setRank] = useState<any>(null)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // Fetch today's activity
            const today = new Date().toISOString().split('T')[0]
            const { data: activityData } = await supabase
                .from('daily_activity')
                .select('*')
                .eq('student_id', student.id)
                .eq('activity_date', today)
                .single()

            setDailyActivity(activityData)

            // Fetch connected platforms
            const { data: platformData } = await supabase
                .from('platform_accounts')
                .select('*')
                .eq('student_id', student.id)

            setPlatforms(platformData || [])

            // Fetch rank
            const { data: rankData } = await supabase
                .from('leaderboard_cache')
                .select('*')
                .eq('student_id', student.id)
                .eq('period', 'overall')
                .eq('rank_type', 'college')
                .single()

            setRank(rankData)
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await AuthService.logout()
            onLogout()
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            </SafeAreaView>
        )
    }

    const todaysSolved = dailyActivity?.total_solved || 0

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.name}>{student.name}</Text>
                        <Text style={styles.rollNo}>{student.roll_no}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={24} color="#d32f2f" />
                    </TouchableOpacity>
                </View>

                {/* Today's Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today's Progress</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <MaterialCommunityIcons
                                name="code-braces"
                                size={32}
                                color="#007AFF"
                            />
                            <Text style={styles.statValue}>{todaysSolved}</Text>
                            <Text style={styles.statLabel}>Solved Today</Text>
                        </View>

                        {rank && (
                            <View style={styles.statCard}>
                                <MaterialCommunityIcons
                                    name="medal"
                                    size={32}
                                    color="#FFB800"
                                />
                                <Text style={styles.statValue}>#{rank.rank}</Text>
                                <Text style={styles.statLabel}>College Rank</Text>
                            </View>
                        )}

                        <View style={styles.statCard}>
                            <MaterialCommunityIcons
                                name="fire"
                                size={32}
                                color="#FF6B6B"
                            />
                            <Text style={styles.statValue}>{rank?.streak || 0}</Text>
                            <Text style={styles.statLabel}>Day Streak</Text>
                        </View>
                    </View>
                </View>

                {/* Connected Platforms */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Connected Platforms</Text>
                        <TouchableOpacity>
                            <MaterialCommunityIcons name="plus" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {platforms.length > 0 ? (
                        <View style={styles.platformList}>
                            {platforms.map((platform) => (
                                <View key={platform.id} style={styles.platformItem}>
                                    <View style={styles.platformInfo}>
                                        <Text style={styles.platformName}>{platform.platform}</Text>
                                        <Text style={styles.platformUser}>{platform.username}</Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="check-circle"
                                        size={20}
                                        color="#4CAF50"
                                    />
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                No platforms connected yet
                            </Text>
                            <Text style={styles.emptyHint}>
                                Connect your coding platforms to start tracking
                            </Text>
                        </View>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Analytics')}
                        >
                            <MaterialCommunityIcons
                                name="chart-line"
                                size={20}
                                color="#007AFF"
                            />
                            <Text style={styles.actionText}>View Stats</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <MaterialCommunityIcons
                                name="format-list-bulleted"
                                size={20}
                                color="#007AFF"
                            />
                            <Text style={styles.actionText}>Leaderboard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Team')}
                        >
                            <MaterialCommunityIcons
                                name="account-group"
                                size={20}
                                color="#007AFF"
                            />
                            <Text style={styles.actionText}>My Team</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scroll: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    greeting: {
        fontSize: 14,
        color: '#666',
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    rollNo: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        gap: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    platformList: {
        gap: 8,
    },
    platformItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    platformInfo: {
        flex: 1,
    },
    platformName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        textTransform: 'capitalize',
    },
    platformUser: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    emptyState: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    emptyHint: {
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600',
    },
})
