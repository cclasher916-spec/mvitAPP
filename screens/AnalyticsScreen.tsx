import React, { useState, useEffect, useMemo } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    Dimensions
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase, Database } from '../lib/supabase'
import { Skeleton } from '../components/Skeleton'

const { width } = Dimensions.get('window')

type Timeframe = '7D' | 'OVERALL'

interface PlatformStats {
    total: number
    leetcode: number
    codechef: number
    codeforces: number
    hackerrank: number
    skillrack: number
    github: number
}

interface AnalyticsStats {
    stats7D: PlatformStats
    statsOverall: PlatformStats
    weeklyData: any[]
}

interface PlatformBreakdownItem {
    name: keyof PlatformStats
    displayName: string
    value: number
    color: string
    width: number
    username?: string
    icon: keyof typeof MaterialCommunityIcons.glyphMap
}

export default function AnalyticsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true)
    const [timeframe, setTimeframe] = useState<Timeframe>('7D')
    const [stats, setStats] = useState<AnalyticsStats | null>(null)
    const [platformAccounts, setPlatformAccounts] = useState<Record<string, string>>({})

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: student } = await (supabase
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle() as any)

            if (!student) return

            // 1. Fetch 7 days data
            const today = new Date()
            const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

            const { data: rawActivity } = await supabase
                .from('daily_activity')
                .select('*')
                .eq('student_id', student.id)
                .gte('activity_date', sevenDaysAgo)
                .order('activity_date', { ascending: true })

            const activities = (rawActivity as any[]) || []

            let t7 = 0, lc7 = 0, cc7 = 0, cf7 = 0, hr7 = 0, sr7 = 0, gh7 = 0
            const dailyDeltas = activities.map(current => {
                const dTotal = current.daily_delta || 0
                const dLeetcode = current.leetcode_delta || 0
                const dCodechef = current.codechef_delta || 0
                const dCodeforces = current.codeforces_delta || 0
                const dHackerrank = current.hackerrank_delta || 0
                const dSkillrack = current.skillrack_delta || 0
                const dGithub = current.github_delta || 0

                t7 += dTotal
                lc7 += dLeetcode
                cc7 += dCodechef
                cf7 += dCodeforces
                hr7 += dHackerrank
                sr7 += dSkillrack
                gh7 += dGithub

                return {
                    activity_date: current.activity_date,
                    total_solved: dTotal,
                    leetcode_solved: dLeetcode,
                    codechef_solved: dCodechef,
                    codeforces_solved: dCodeforces,
                    hackerrank_solved: dHackerrank,
                    skillrack_solved: dSkillrack,
                    github_solved: dGithub
                }
            })

            // 2. Fetch latest row for overall
            const { data: latestRawData } = await supabase
                .from('daily_activity')
                .select('*')
                .eq('student_id', student.id)
                .order('activity_date', { ascending: false })
                .limit(1)

            const latestRaw = latestRawData as any[] || [];

            let tO = 0, lcO = 0, ccO = 0, cfO = 0, hrO = 0, srO = 0, ghO = 0
            if (latestRaw && latestRaw.length > 0) {
                const latest = latestRaw[0]
                tO = latest.total_solved || 0
                lcO = latest.leetcode_solved || 0
                ccO = latest.codechef_solved || 0
                cfO = latest.codeforces_solved || 0
                hrO = latest.hackerrank_solved || 0
                srO = latest.skillrack_solved || 0
                ghO = latest.github_solved || 0
            }

            // 3. Fetch Platform Accounts
            const { data: accountsData } = await supabase
                .from('platform_accounts')
                .select('platform, username')
                .eq('student_id', student.id)

            const accounts = accountsData as any[] || [];
            const accMap: Record<string, string> = {}
            if (accounts.length > 0) {
                accounts.forEach(acc => {
                    accMap[acc.platform] = acc.username
                })
            }
            setPlatformAccounts(accMap)

            setStats({
                stats7D: { total: t7, leetcode: lc7, codechef: cc7, codeforces: cf7, hackerrank: hr7, skillrack: sr7, github: gh7 },
                statsOverall: { total: tO, leetcode: lcO, codechef: ccO, codeforces: cfO, hackerrank: hrO, skillrack: srO, github: ghO },
                weeklyData: dailyDeltas
            })

        } catch (error) {
            console.error('Analytics error:', error)
        } finally {
            setLoading(false)
        }
    }

    const openProfile = (platform: string, username?: string) => {
        if (!username) return;
        let url = '';
        switch (platform) {
            case 'leetcode': url = `https://leetcode.com/u/${username}/`; break;
            case 'codechef': url = `https://www.codechef.com/users/${username}`; break;
            case 'codeforces': url = `https://codeforces.com/profile/${username}`; break;
            case 'hackerrank': url = `https://www.hackerrank.com/profile/${username}`; break;
            case 'github': url = `https://github.com/${username}`; break;
            case 'skillrack': url = `https://www.skillrack.com/`; break;
            default: return;
        }
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }

    const currentStats = timeframe === '7D' ? stats?.stats7D : stats?.statsOverall;

    const platformBreakdown: PlatformBreakdownItem[] = useMemo(() => {
        if (!currentStats) return [];
        const maxVal = Math.max(
            currentStats.leetcode, currentStats.codechef, currentStats.codeforces,
            currentStats.hackerrank, currentStats.skillrack, currentStats.github, 1
        );
        return [
            { name: 'leetcode' as const, displayName: 'LeetCode', icon: 'code-tags' as any, value: currentStats.leetcode, color: '#f89f1b', width: (currentStats.leetcode / maxVal) * 100, username: platformAccounts['leetcode'] },
            { name: 'skillrack' as const, displayName: 'SkillRack', icon: 'server-network' as any, value: currentStats.skillrack, color: '#e84118', width: (currentStats.skillrack / maxVal) * 100, username: platformAccounts['skillrack'] },
            { name: 'codechef' as const, displayName: 'CodeChef', icon: 'chef-hat' as any, value: currentStats.codechef, color: '#5b4638', width: (currentStats.codechef / maxVal) * 100, username: platformAccounts['codechef'] },
            { name: 'codeforces' as const, displayName: 'Codeforces', icon: 'chart-bar' as any, value: currentStats.codeforces, color: '#1f8dd6', width: (currentStats.codeforces / maxVal) * 100, username: platformAccounts['codeforces'] },
            { name: 'hackerrank' as const, displayName: 'HackerRank', icon: 'account-network' as any, value: currentStats.hackerrank, color: '#2ec866', width: (currentStats.hackerrank / maxVal) * 100, username: platformAccounts['hackerrank'] },
            { name: 'github' as const, displayName: 'GitHub', icon: 'github' as any, value: currentStats.github, color: '#333333', width: (currentStats.github / maxVal) * 100, username: platformAccounts['github'] },
        ].sort((a, b) => b.value - a.value);
    }, [currentStats, platformAccounts]);

    const renderInsights = () => {
        if (!currentStats || platformBreakdown.length === 0) return null;

        const activePlatforms = platformBreakdown.filter(p => p.username);
        if (activePlatforms.length === 0) {
            return (
                <View style={styles.insightContainerEmpty}>
                    <MaterialCommunityIcons name="rocket-launch-outline" size={28} color="#818CF8" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.insightTitleEmpty}>Ready for Liftoff?</Text>
                        <Text style={styles.insightTextEmpty}>Connect your coding accounts in Profile to unlock powerful analytics!</Text>
                    </View>
                </View>
            )
        }

        const strongest = activePlatforms[0];
        const weakest = activePlatforms.filter(p => !['github', 'skillrack'].includes(p.name)).reverse()[0];

        return (
            <View style={styles.insightCard}>
                <View style={[styles.cardBlur, { backgroundColor: 'rgba(254, 243, 199, 0.4)' }]} />
                <View style={styles.insightHeaderRow}>
                    <View style={styles.insightIconWrapper}>
                        <MaterialCommunityIcons name="lightbulb-auto-outline" size={22} color="#D97706" />
                    </View>
                    <Text style={styles.insightTitle}>AI Developer Insights</Text>
                </View>

                {strongest && strongest.value > 0 ? (
                    <View style={styles.insightRow}>
                        <Text style={styles.insightEmoji}>🔥</Text>
                        <Text style={styles.insightText}>
                            Dominating on <Text style={[styles.highlightText, { color: strongest.color }]}>{strongest.displayName}</Text> with <Text style={styles.boldText}>{strongest.value}</Text> problems solved! Keep the streak alive!
                        </Text>
                    </View>
                ) : (
                    <View style={styles.insightRow}>
                        <Text style={styles.insightEmoji}>🚀</Text>
                        <Text style={styles.insightText}>Time to get those numbers rolling! Start solving today.</Text>
                    </View>
                )}

                {weakest && weakest.value < 10 && (
                    <View style={[styles.insightRow, { marginTop: 12 }]}>
                        <Text style={styles.insightEmoji}>💡</Text>
                        <Text style={styles.insightText}>
                            <Text style={[styles.highlightText, { color: weakest.color }]}>{weakest.displayName}</Text> needs a little love. Dive into some basic problems to diversify your skills!
                        </Text>
                    </View>
                )}
            </View>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <Skeleton width={120} height={24} />
                    <View style={{ width: 40 }} />
                </View>

                <View style={[styles.content, { flex: 1 }]}>
                    <View style={styles.toggleWrapper}>
                        <Skeleton width="100%" height={44} borderRadius={12} />
                    </View>

                    <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 24 }} />

                    <Skeleton width="100%" height={180} borderRadius={20} style={{ marginBottom: 28 }} />

                    <Skeleton width="100%" height={250} borderRadius={20} />
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analytics</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Sleek Toggle Switch */}
                <View style={styles.toggleWrapper}>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, timeframe === '7D' && styles.toggleActive]}
                            onPress={() => setTimeframe('7D')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.toggleText, timeframe === '7D' && styles.toggleTextActive]}>Last 7 Days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, timeframe === 'OVERALL' && styles.toggleActive]}
                            onPress={() => setTimeframe('OVERALL')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.toggleText, timeframe === 'OVERALL' && styles.toggleTextActive]}>All Time</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Hero Total Summary Card */}
                <View style={styles.heroCard}>
                    {/* Decorative Background Elements */}
                    <View style={styles.decorativeCircle1} />
                    <View style={styles.decorativeCircle2} />

                    <View style={styles.heroContent}>
                        <Text style={styles.heroLabel}>
                            {timeframe === '7D' ? 'Problems Solved This Week' : 'Total Problems Solved'}
                        </Text>
                        <View style={styles.heroValueContainer}>
                            <Text style={styles.heroValue}>{currentStats?.total || 0}</Text>
                            <MaterialCommunityIcons name="seal" size={32} color="rgba(255,255,255,0.7)" style={{ marginLeft: 12, marginTop: 8 }} />
                        </View>
                        <Text style={styles.heroSub}>Across all connected platforms</Text>
                    </View>
                </View>

                {/* Premium Insights Module */}
                {renderInsights()}

                {/* Stunning Platform Breakdown */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Platform Breakdown</Text>
                    <View style={styles.breakdownCard}>
                        {platformBreakdown.map((platform, index) => {
                            const isLast = index === platformBreakdown.length - 1;
                            return (
                                <View key={platform.name} style={[styles.barRowContainer, !isLast && styles.barRowBorder]}>
                                    <View style={styles.platformMeta}>
                                        <View style={[styles.iconBox, { backgroundColor: platform.color + '15' }]}>
                                            <MaterialCommunityIcons name={platform.icon} size={20} color={platform.color} />
                                        </View>
                                        <TouchableOpacity
                                            style={styles.labelContainerWrapper}
                                            onPress={() => openProfile(platform.name, platform.username)}
                                            disabled={!platform.username}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.platformNameText}>
                                                {platform.displayName}
                                            </Text>
                                            {platform.username ? (
                                                <MaterialCommunityIcons name="open-in-new" size={14} color="#6366F1" style={{ marginLeft: 6 }} />
                                            ) : (
                                                <Text style={styles.unlinkedText}>(Not Linked)</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.progressRow}>
                                        <View style={styles.barTrack}>
                                            <View
                                                style={[
                                                    styles.barFill,
                                                    {
                                                        width: `${Math.max(platform.width, 2)}%`,
                                                        backgroundColor: platform.color,
                                                        opacity: platform.value === 0 ? 0.3 : 1
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.barValueText, platform.value === 0 && { color: '#94A3B8' }]}>
                                            {platform.value}
                                        </Text>
                                    </View>
                                </View>
                            )
                        })}
                    </View>
                </View>

                {/* Weekly Trend (Premium List) */}
                {timeframe === '7D' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Activity Log</Text>
                        <View style={styles.historyCard}>
                            {stats?.weeklyData.length === 0 ? (
                                <View style={styles.noDataBox}>
                                    <MaterialCommunityIcons name="calendar-blank-outline" size={32} color="#CBD5E1" />
                                    <Text style={styles.noDataText}>No activity data for this week.</Text>
                                </View>
                            ) : (
                                stats?.weeklyData.map((day: any, idx: number) => {
                                    const isLast = idx === (stats?.weeklyData.length || 0) - 1;
                                    const dateObj = new Date(day.activity_date);
                                    const displayDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                                    return (
                                        <View key={day.activity_date} style={[styles.historyRow, !isLast && styles.historyRowBorder]}>
                                            <View style={styles.historyDateWrapper}>
                                                <View style={[styles.historyDot, { backgroundColor: day.total_solved > 0 ? '#10B981' : '#E2E8F0' }]} />
                                                <Text style={styles.historyDateText}>{displayDate}</Text>
                                            </View>
                                            <View style={styles.historyCountWrapper}>
                                                <Text style={[styles.historyCountVal, day.total_solved === 0 && { color: '#94A3B8' }]}>
                                                    +{day.total_solved}
                                                </Text>
                                            </View>
                                        </View>
                                    )
                                })
                            )}
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        marginTop: 16,
        color: '#64748b',
        fontSize: 16,
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: '#F8FAFC',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    toggleWrapper: {
        marginBottom: 24,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
    toggleTextActive: {
        color: '#0F172A',
        fontWeight: '700',
    },
    heroCard: {
        backgroundColor: '#4F46E5', // Indigo 600
        borderRadius: 24,
        padding: 28,
        marginBottom: 24,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    decorativeCircle1: {
        position: 'absolute',
        top: -40,
        right: -20,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    decorativeCircle2: {
        position: 'absolute',
        bottom: -60,
        left: -40,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    heroContent: {
        position: 'relative',
        zIndex: 1,
    },
    heroLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    heroValueContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    heroValue: {
        fontSize: 64,
        fontWeight: '900',
        color: '#FFFFFF',
        lineHeight: 72,
        letterSpacing: -2,
    },
    heroSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
        fontWeight: '500',
    },
    insightCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: '#FDE68A',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
    },
    cardBlur: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    insightHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        zIndex: 1,
    },
    insightIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    insightTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#92400E',
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        zIndex: 1,
    },
    insightEmoji: {
        fontSize: 18,
        marginRight: 10,
        marginTop: 2,
    },
    insightText: {
        flex: 1,
        fontSize: 15,
        color: '#475569',
        lineHeight: 22,
        fontWeight: '500',
    },
    highlightText: {
        fontWeight: '800',
    },
    boldText: {
        fontWeight: '800',
        color: '#0F172A',
    },
    insightContainerEmpty: {
        backgroundColor: '#EEF2FF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: '#C7D2FE',
        flexDirection: 'row',
        alignItems: 'center',
    },
    insightTitleEmpty: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4338CA',
        marginBottom: 4,
    },
    insightTextEmpty: {
        fontSize: 14,
        color: '#4F46E5',
        lineHeight: 20,
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    breakdownCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 8,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 2,
    },
    barRowContainer: {
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    barRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    platformMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    labelContainerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    platformNameText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    unlinkedText: {
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 8,
        fontWeight: '500',
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    barTrack: {
        flex: 1,
        height: 10,
        backgroundColor: '#F1F5F9',
        borderRadius: 5,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 5,
    },
    barValueText: {
        width: 45,
        textAlign: 'right',
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginLeft: 12,
    },
    historyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 2,
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    historyRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    historyDateWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    historyDateText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
    },
    historyCountWrapper: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    historyCountVal: {
        fontSize: 15,
        fontWeight: '700',
        color: '#10B981',
    },
    noDataBox: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noDataText: {
        marginTop: 12,
        fontSize: 15,
        color: '#94A3B8',
        fontWeight: '500',
    },
})
