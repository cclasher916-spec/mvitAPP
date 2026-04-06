import React, { useState, useEffect, useMemo } from 'react'
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/Skeleton'

const RANK_TABS = [
    { id: 'college', label: 'College' },
    { id: 'department', label: 'Dept' },
    { id: 'year', label: 'Year' },
    { id: 'section', label: 'Section' },
    { id: 'team', label: 'Team' },
];

// UI label -> DB period mapping
// IMPORTANT: 'college' has both 'overall' and 'all_time' in DB.
// All other rank_types ONLY have 'all_time'. We normalize 'all-time' UI tab to the
// correct DB period based on the active rank_type to avoid empty results.
const TIME_TABS = [
    { id: 'all_time', label: 'All-Time' },
    { id: 'weekly', label: 'This Week' },
    { id: 'daily', label: 'Today' },
];

// Map activeTab + timeTab to the actual DB period value
const getDbPeriod = (rankType: string, uiTime: string): string => {
    if (uiTime === 'all_time') {
        // 'college' has both 'overall' and 'all_time'. Use 'all_time' for consistency.
        // All other rank_types only have 'all_time'.
        return 'all_time';
    }
    return uiTime; // 'weekly' and 'daily' are the same in both UI and DB
};

export default function LeaderboardScreen({ navigation, route, student: propStudent }: any) {
    const student = propStudent || route.params?.student || {};

    // Smart default tab selection
    const initialTab = student.team_id ? 'team' :
        student.section_id ? 'section' :
            student.department_id ? 'department' : 'college';

    const [activeTab, setActiveTab] = useState(initialTab)
    const [timeTab, setTimeTab] = useState('daily')
    const [viewMode, setViewMode] = useState<'top' | 'near_me'>('top')

    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [leaderboard, setLeaderboard] = useState<any[]>([])

    useEffect(() => {
        fetchLeaderboard()
    }, [activeTab, timeTab])

    const fetchLeaderboard = async () => {
        setLoading(true)
        setFetchError(null)
        try {
            const dbPeriod = getDbPeriod(activeTab, timeTab);

            let query = supabase
                .from('leaderboard_cache')
                .select(`
                    rank,
                    previous_rank,
                    total_solved,
                    streak,
                    student_id,
                    student:students (
                        name,
                        roll_no,
                        department_id,
                        year_id,
                        section_id,
                        department:departments(code)
                    )
                `)
                .eq('rank_type', activeTab)
                .eq('period', dbPeriod)
                .order('rank', { ascending: true });

            const { data: rawData, error } = await query;
            if (error) throw error;

            // Cast to any[] — Supabase can't infer deeply nested join shapes without generated DB types
            const data = (rawData || []) as any[];
            let filteredData: any[] = [...data];

            // Server returns all entries for a rank_type; filter client-side to
            // the logged-in student's context. These UUIDs come from the `students`
            // table join and must match what was stored during profile creation.
            if (activeTab === 'department' && student.department_id) {
                filteredData = filteredData.filter(d => (d.student as any)?.department_id === student.department_id);
            } else if (activeTab === 'year' && student.year_id) {
                filteredData = filteredData.filter(d => (d.student as any)?.year_id === student.year_id);
            } else if (activeTab === 'section' && student.section_id) {
                filteredData = filteredData.filter(d => (d.student as any)?.section_id === student.section_id);
            } else if (activeTab === 'team') {
                // team leaderboard: look up student's team, then filter by team roster
                if (student.id) {
                    const { data: tmData, error: tmError } = await supabase
                        .from('team_members')
                        .select('team_id')
                        .eq('student_id', student.id)
                        .maybeSingle();

                    if (tmError) throw tmError;
                    const tm = tmData as any;

                    if (tm?.team_id) {
                        const { data: rosterData, error: rosterError } = await supabase
                            .from('team_members')
                            .select('student_id')
                            .eq('team_id', tm.team_id);

                        if (rosterError) throw rosterError;
                        const validIds = new Set((rosterData as any[]).map(r => r.student_id));
                        filteredData = filteredData.filter(d => validIds.has(d.student_id));
                    } else {
                        filteredData = []; // Student is not in any team
                    }
                }
            }

            setLeaderboard(filteredData);
        } catch (error: any) {
            console.error('Leaderboard fetch error:', error?.message || error)
            setFetchError('Could not load rankings. Check your connection.')
        } finally {
            setLoading(false)
        }
    }

    // --- Computed Values ---

    const myEntry = useMemo(() => {
        return leaderboard.find(item => item.student_id === student.id);
    }, [leaderboard, student.id]);

    const displayData = useMemo(() => {
        if (viewMode === 'top') {
            return leaderboard.slice(0, 50);
        } else {
            if (!myEntry) return leaderboard.slice(0, 50);
            const myIndex = leaderboard.findIndex(item => item.student_id === myEntry.student_id);
            const start = Math.max(0, myIndex - 4);
            const end = Math.min(leaderboard.length, myIndex + 6);
            return leaderboard.slice(start, end);
        }
    }, [leaderboard, viewMode, myEntry]);

    const insights = useMemo(() => {
        if (leaderboard.length === 0) return null;
        const totalParticipants = leaderboard.length;
        const topScore = leaderboard[0]?.total_solved || 0;
        const avgScore = Math.round(leaderboard.reduce((sum, item) => sum + (item.total_solved || 0), 0) / totalParticipants);
        return { totalParticipants, topScore, avgScore };
    }, [leaderboard]);

    // --- Renderers ---

    const renderMovement = (currentRank: number, previousRank: number | null) => {
        if (previousRank === null) return <Text style={styles.moveNew}>⭐ New</Text>;
        const diff = previousRank - currentRank;
        if (diff > 0) return <Text style={styles.moveUp}>🔺 +{diff}</Text>;
        if (diff < 0) return <Text style={styles.moveDown}>🔻 {diff}</Text>;
        return <Text style={styles.moveSame}>➖</Text>;
    };

    const renderEmptyState = () => {
        // Show error state if fetch failed
        if (fetchError) {
            return (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="wifi-off" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>{fetchError}</Text>
                    <TouchableOpacity onPress={fetchLeaderboard} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Tap to Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        let msg = "No rankings available yet.";
        let sub = "Wait for the sync or start practicing.";
        let icon: any = "trophy-broken";

        if (activeTab === 'team') {
            msg = "You are not in a team.";
            sub = "Join a team to see your team rankings here.";
            icon = "account-group";
        } else if (activeTab === 'department' && !student.department_id) {
            msg = "Department not set.";
            sub = "Your profile may be missing a department. Contact your admin.";
            icon = "alert-circle-outline";
        } else if (activeTab === 'section' && !student.section_id) {
            msg = "Section not set.";
            sub = "Your profile may be missing section info. Contact your admin.";
            icon = "alert-circle-outline";
        } else if (timeTab === 'daily') {
            msg = "No activity today yet.";
            sub = "Be the first to solve a problem today!";
        }

        return (
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name={icon} size={48} color="#ccc" />
                <Text style={styles.emptyText}>{msg}</Text>
                <Text style={styles.emptySub}>{sub}</Text>
            </View>
        );
    };

    const renderMyRankCard = () => {
        if (!myEntry) return null;

        const percentile = Math.round((myEntry.rank / leaderboard.length) * 100);
        let percentileMsg = `Top ${percentile}%`;
        if (myEntry.rank === 1) percentileMsg = "Rank 1! 🏆";
        else if (percentile > 50) percentileMsg = `Bottom ${100 - percentile}%`;

        return (
            <View style={styles.myRankCard}>
                <View style={styles.myRankHeader}>
                    <Text style={styles.myRankTitle}>Your Standing</Text>
                    <View style={styles.percentileBadge}>
                        <Text style={styles.percentileText}>{percentileMsg}</Text>
                    </View>
                </View>
                <View style={styles.myRankContent}>
                    <View style={styles.myRankStat}>
                        <Text style={styles.myRankLabel}>Rank</Text>
                        <Text style={styles.myRankValue}>#{myEntry.rank}</Text>
                        <View style={{ marginTop: 4 }}>{renderMovement(myEntry.rank, myEntry.previous_rank)}</View>
                    </View>
                    <View style={styles.myRankStat}>
                        <Text style={styles.myRankLabel}>Points</Text>
                        <Text style={styles.myRankValue}>{myEntry.total_solved || 0}</Text>
                    </View>
                    <View style={styles.myRankStat}>
                        <Text style={styles.myRankLabel}>Streak</Text>
                        <Text style={styles.myRankValue}>🔥 {myEntry.streak || 0}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderInsights = () => {
        if (!insights) return null;
        return (
            <View style={styles.insightsPanel}>
                <View style={styles.insightBox}>
                    <Text style={styles.insightLabel}>Competitors</Text>
                    <Text style={styles.insightVal}>{insights.totalParticipants}</Text>
                </View>
                <View style={styles.insightDiv} />
                <View style={styles.insightBox}>
                    <Text style={styles.insightLabel}>Avg Score</Text>
                    <Text style={styles.insightVal}>{insights.avgScore}</Text>
                </View>
                <View style={styles.insightDiv} />
                <View style={styles.insightBox}>
                    <Text style={styles.insightLabel}>Top Score</Text>
                    <Text style={styles.insightVal}>{insights.topScore}</Text>
                </View>
            </View>
        );
    };

    const renderItem = ({ item }: any) => {
        const isMe = item.student_id === student.id;
        const diff = item.previous_rank ? item.previous_rank - item.rank : null;

        return (
            <View style={[styles.rankRow, isMe && styles.myRankRow]}>
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{item.rank}</Text>
                </View>
                <View style={styles.studentInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.name, isMe && { color: '#007AFF' }]}>{item.student?.name}</Text>
                        {item.rank <= 3 && <Text>🥇</Text>}
                        {diff !== null && diff >= 5 && <Text>🚀</Text>}
                        {item.streak >= 7 && <Text>⭐</Text>}
                    </View>
                    <Text style={styles.details}>
                        {item.student?.department?.code} • {item.student?.roll_no}
                    </Text>
                </View>
                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFB800" />
                        <Text style={styles.statValue}>{item.total_solved || 0}</Text>
                    </View>
                    <View style={[styles.statItem, styles.streakItem]}>
                        <MaterialCommunityIcons name="fire" size={14} color="#FF6B6B" />
                        <Text style={[styles.statValue, { color: '#FF6B6B' }]}>{item.streak || 0}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#333" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Leaderboard</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Time Tabs */}
            <View style={styles.timeTabContainer}>
                {TIME_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.timeTab, timeTab === tab.id && styles.activeTimeTab]}
                        onPress={() => setTimeTab(tab.id)}
                    >
                        <Text style={[styles.timeTabText, timeTab === tab.id && styles.activeTimeTabText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Rank Group Tabs */}
            <View style={styles.tabContainer}>
                {RANK_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'top' && styles.toggleBtnActive]}
                    onPress={() => setViewMode('top')}
                >
                    <Text style={[styles.toggleText, viewMode === 'top' && styles.toggleTextActive]}>Top 50</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'near_me' && styles.toggleBtnActive]}
                    onPress={() => setViewMode('near_me')}
                >
                    <Text style={[styles.toggleText, viewMode === 'near_me' && styles.toggleTextActive]}>Near Me</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
                <View style={{ padding: 16 }}>
                    {/* Fake My Rank Card */}
                    <Skeleton width="100%" height={120} borderRadius={16} style={{ marginBottom: 16 }} />
                    {/* Fake List Items */}
                    {[1, 2, 3, 4, 5].map(key => (
                        <View key={key} style={[styles.rankRow, { backgroundColor: '#fff' }]}>
                            <Skeleton width={36} height={36} borderRadius={18} style={{ marginRight: 16 }} />
                            <View style={{ flex: 1 }}>
                                <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
                                <Skeleton width={80} height={12} />
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                <Skeleton width={60} height={20} borderRadius={10} />
                                <Skeleton width={40} height={20} borderRadius={10} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : leaderboard.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={displayData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.student_id}-${index}`}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={() => (
                        <View style={{ marginBottom: 16 }}>
                            {renderInsights()}
                            {renderMyRankCard()}
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    timeTabContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 8 },
    timeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8 },
    activeTimeTab: { backgroundColor: '#007AFF' },
    timeTabText: { fontSize: 13, fontWeight: '600', color: '#666' },
    activeTimeTabText: { color: '#fff' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 4, paddingBottom: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#007AFF' },
    tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
    activeTabText: { color: '#007AFF' },
    toggleContainer: { flexDirection: 'row', padding: 16, paddingBottom: 0, gap: 12 },
    toggleBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
    toggleBtnActive: { backgroundColor: '#e3f2fd', borderColor: '#007AFF' },
    toggleText: { fontSize: 12, fontWeight: '600', color: '#666' },
    toggleTextActive: { color: '#007AFF' },
    list: { padding: 16, paddingBottom: 40 },

    // Insights Panel
    insightsPanel: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    insightBox: { flex: 1, alignItems: 'center' },
    insightDiv: { width: 1, backgroundColor: '#eee' },
    insightLabel: { fontSize: 11, color: '#666', marginBottom: 4 },
    insightVal: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },

    // My Rank Card
    myRankCard: { backgroundColor: '#1A237E', padding: 16, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
    myRankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    myRankTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    percentileBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    percentileText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    myRankContent: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12 },
    myRankStat: { alignItems: 'center' },
    myRankLabel: { color: '#BBDEFB', fontSize: 11, marginBottom: 4 },
    myRankValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

    // Movement
    moveUp: { color: '#4CAF50', fontSize: 11, fontWeight: 'bold' },
    moveDown: { color: '#F44336', fontSize: 11, fontWeight: 'bold' },
    moveSame: { color: '#9E9E9E', fontSize: 11, fontWeight: 'bold' },
    moveNew: { color: '#FFB800', fontSize: 11, fontWeight: 'bold' },

    // Rows
    rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    myRankRow: { borderColor: '#007AFF', borderWidth: 1.5, backgroundColor: '#F8FAFC' },
    rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    rankText: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
    studentInfo: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
    details: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    stats: { alignItems: 'flex-end', gap: 6 },
    statItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    streakItem: { backgroundColor: '#FEF2F2' },
    statValue: { fontSize: 12, fontWeight: 'bold', color: '#B45309' },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'center' },
    emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
    retryBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#007AFF', borderRadius: 20 },
    retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
