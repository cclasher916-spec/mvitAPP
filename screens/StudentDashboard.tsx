import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import AuthService from '../services/auth.service';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { Skeleton } from '../components/Skeleton';
import { SmartStartModal } from '../components/SmartStartModal';

interface StudentDashboardProps {
    student: any;
    onLogout: () => void;
    navigation: any;
}

export default function StudentDashboard({ student, onLogout, navigation }: StudentDashboardProps) {
    const [smartStartVisible, setSmartStartVisible] = useState(false);

    const { data: dashboardData, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard_full', student.id],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const [activityRes, platformRes, rankRes, tasksRes] = await Promise.all([
                supabase.from('daily_activity').select('*').eq('student_id', student.id).order('activity_date', { ascending: false }).limit(1).maybeSingle(),
                supabase.from('platform_accounts').select('*').eq('student_id', student.id),
                supabase.from('leaderboard_cache').select('*').eq('student_id', student.id).eq('period', 'daily').eq('rank_type', 'college').maybeSingle(),
                supabase.from('agent_tasks').select('*').eq('student_id', student.id).eq('status', 'pending').order('assigned_at', { ascending: false }).limit(1).maybeSingle()
            ]);
            return {
                dailyActivity: activityRes.data,
                platforms: platformRes.data || [],
                rank: rankRes.data,
                nextTask: tasksRes.data
            };
        }
    });

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    useEffect(() => {
        if (student?.id) {
            registerForPushNotificationsAsync(student.id).catch(console.error);
        }
    }, [student?.id]);

    const handleLogout = async () => {
        try {
            await AuthService.logout();
            onLogout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const xpData = useMemo(() => {
        const totalSolved = (dashboardData?.dailyActivity as any)?.total_solved || 0;
        const streak = student?.current_streak || 0;
        const xp = (totalSolved * 10) + (streak * 50);
        
        let level = 'Beginner';
        let nextLevelXP = 500;
        let progress = 0;

        if (xp >= 10000) { level = 'Legend'; nextLevelXP = xp; progress = 1; }
        else if (xp >= 5000) { level = 'Expert'; nextLevelXP = 10000; progress = (xp - 5000) / 5000; }
        else if (xp >= 2000) { level = 'Pro'; nextLevelXP = 5000; progress = (xp - 2000) / 3000; }
        else if (xp >= 500) { level = 'Coder'; nextLevelXP = 2000; progress = (xp - 500) / 1500; }
        else { progress = xp / 500; }

        return { xp, level, nextLevelXP, progress };
    }, [dashboardData, student]);


    if (isLoading && !dashboardData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ padding: 24, alignItems: 'center' }}>
                    <Skeleton width={120} height={120} borderRadius={60} style={{ marginBottom: 24 }} />
                    <Skeleton width={200} height={40} style={{ marginBottom: 12 }} />
                    <Skeleton width={150} height={20} style={{ marginBottom: 40 }} />
                    <Skeleton width="100%" height={200} borderRadius={24} />
                </View>
            </SafeAreaView>
        );
    }

    const todaysSolved = (dashboardData?.dailyActivity as any)?.daily_delta || 0;
    const isGoalMet = todaysSolved > 0;
    const streak = student?.current_streak || 0;
    const currentHour = new Date().getHours();
    const streakAtRisk = !isGoalMet && streak > 0 && currentHour >= 18; // Past 6 PM without coding

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {/* Header Actions */}
                <View style={styles.header}>
                    <View style={styles.levelBadge}>
                        <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
                        <Text style={styles.levelText}>{xpData.level}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <MaterialCommunityIcons name="logout" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Hero Streak Section */}
                <View style={styles.heroSection}>
                    <View style={styles.streakCircle}>
                        <MaterialCommunityIcons 
                            name="fire" 
                            size={72} 
                            color={isGoalMet ? "#F97316" : (streak > 0 ? "#FFB800" : "#cbd5e1")} 
                        />
                    </View>
                    <Text style={styles.streakCount}>{streak}</Text>
                    <Text style={styles.streakLabel}>Day Streak</Text>
                    
                    {streakAtRisk && (
                        <View style={styles.riskBadge}>
                            <MaterialCommunityIcons name="alert-circle" size={16} color="#ef4444" />
                            <Text style={styles.riskText}>Streak at risk! Code now.</Text>
                        </View>
                    )}
                </View>

                {/* XP Progress */}
                <View style={styles.xpSection}>
                    <View style={styles.xpHeader}>
                        <Text style={styles.xpLabel}>Total XP: {xpData.xp}</Text>
                        <Text style={styles.xpLabel}>{xpData.nextLevelXP} XP</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.max(5, xpData.progress * 100)}%` }]} />
                    </View>
                    <Text style={styles.xpHint}>Earn XP by maintaining streaks and solving problems.</Text>
                </View>

                {/* Daily Goal Card */}
                <View style={styles.goalCard}>
                    <View style={styles.goalInfo}>
                        <View style={[styles.checkCircle, isGoalMet && styles.checkCircleDone]}>
                            {isGoalMet && <MaterialCommunityIcons name="check" size={20} color="#fff" />}
                        </View>
                        <View>
                            <Text style={styles.goalTitle}>
                                {isGoalMet ? "Daily Goal Completed!" : "Today's Goal"}
                            </Text>
                            <Text style={styles.goalSub}>
                                {isGoalMet ? `Solved ${todaysSolved} problems` : "Solve 1 problem"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Primary Action */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity 
                        style={styles.startCodingBtn}
                        onPress={() => setSmartStartVisible(true)}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="play-circle" size={28} color="#fff" />
                        <Text style={styles.startCodingText}>Start Coding</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            <SmartStartModal 
                visible={smartStartVisible}
                onClose={() => setSmartStartVisible(false)}
                pendingTask={dashboardData?.nextTask}
                platforms={dashboardData?.platforms || []}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
    levelText: { fontSize: 13, fontWeight: 'bold', color: '#B45309', textTransform: 'uppercase' },
    logoutBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 },
    
    heroSection: { alignItems: 'center', marginTop: 24, marginBottom: 40 },
    streakCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8, marginBottom: -16, zIndex: 2 },
    streakCount: { fontSize: 64, fontWeight: 'bold', color: '#1e293b', marginTop: 24, lineHeight: 72 },
    streakLabel: { fontSize: 16, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
    riskBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12, gap: 4 },
    riskText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

    xpSection: { paddingHorizontal: 24, marginBottom: 32 },
    xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    xpLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    progressBarBg: { height: 12, backgroundColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 6 },
    xpHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 },

    goalCard: { backgroundColor: '#fff', marginHorizontal: 24, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    goalInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    checkCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
    checkCircleDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
    goalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    goalSub: { fontSize: 14, color: '#64748b', marginTop: 2 },

    actionContainer: { paddingHorizontal: 24 },
    startCodingBtn: { backgroundColor: '#0f172a', borderRadius: 20, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
    startCodingText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
});
