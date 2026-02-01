import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

export default function AnalyticsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>(null)
    const [platformBreakdown, setPlatformBreakdown] = useState<any[]>([])

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: student } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!student) return

            // Fetch weekly activity
            const today = new Date()
            const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

            const { data: weeklyActivity } = await supabase
                .from('daily_activity')
                .select('*')
                .eq('student_id', student.id)
                .gte('activity_date', sevenDaysAgo)
                .order('activity_date', { ascending: true })

            // Calculate totals
            let total = 0
            let leetcode = 0
            let codechef = 0
            let codeforces = 0
            let hackerrank = 0

            weeklyActivity?.forEach(day => {
                total += day.total_solved
                leetcode += day.leetcode_solved
                codechef += day.codechef_solved
                codeforces += day.codeforces_solved
                hackerrank += day.hackerrank_solved
            })

            setStats({
                total,
                leetcode,
                codechef,
                codeforces,
                hackerrank,
                weeklyData: weeklyActivity || []
            })

            // Prepare breakdown for charts
            const maxVal = Math.max(leetcode, codechef, codeforces, hackerrank, 1) // Avoid div by zero
            setPlatformBreakdown([
                { name: 'LeetCode', value: leetcode, color: '#f89f1b', width: (leetcode / maxVal) * 100 },
                { name: 'CodeChef', value: codechef, color: '#5b4638', width: (codechef / maxVal) * 100 },
                { name: 'Codeforces', value: codeforces, color: '#1f8dd6', width: (codeforces / maxVal) * 100 },
                { name: 'HackerRank', value: hackerrank, color: '#2ec866', width: (hackerrank / maxVal) * 100 },
            ])

        } catch (error) {
            console.error('Analytics error:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#333" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>My Analytics</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Total Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Solved (Last 7 Days)</Text>
                    <Text style={styles.summaryValue}>{stats?.total || 0}</Text>
                    <Text style={styles.summarySub}>Questions across all platforms</Text>
                </View>

                {/* Platform Breakdown Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Platform Breakdown</Text>
                    <View style={styles.chartContainer}>
                        {platformBreakdown.map((platform) => (
                            <View key={platform.name} style={styles.barRow}>
                                <View style={styles.labelContainer}>
                                    <Text style={styles.barLabel}>{platform.name}</Text>
                                </View>
                                <View style={styles.barTrack}>
                                    <View
                                        style={[
                                            styles.barFill,
                                            { width: `${platform.width}%`, backgroundColor: platform.color }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.barValue}>{platform.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Weekly Trend (Mini List) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Daily Activity (Last 7 Days)</Text>
                    {stats?.weeklyData.length === 0 ? (
                        <Text style={styles.noData}>No data available for this week.</Text>
                    ) : (
                        stats?.weeklyData.map((day: any) => (
                            <View key={day.activity_date} style={styles.historyRow}>
                                <Text style={styles.historyDate}>{day.activity_date}</Text>
                                <View style={styles.historyCount}>
                                    <Text style={styles.countText}>{day.total_solved}</Text>
                                    <Text style={styles.countLabel}>solved</Text>
                                </View>
                            </View>
                        ))
                    )}
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
    content: {
        padding: 16,
    },
    summaryCard: {
        backgroundColor: '#007AFF',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    summaryLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    summaryValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    summarySub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    chartContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    labelContainer: {
        width: 80,
    },
    barLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    barTrack: {
        flex: 1,
        height: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 6,
    },
    barValue: {
        width: 30,
        textAlign: 'right',
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    historyDate: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    historyCount: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    countText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    countLabel: {
        fontSize: 12,
        color: '#666',
    },
    noData: {
        textAlign: 'center',
        color: '#999',
        marginTop: 16,
    },
})
