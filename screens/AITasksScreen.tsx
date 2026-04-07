import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/Skeleton';

// Minimal AI tasks screen pulling from `agent_tasks`
export default function AITasksScreen({ student }: any) {
    const queryClient = useQueryClient();
    
    // Fetch pending and completed tasks for this student
    const { data: tasks, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['agent_tasks', student?.id],
        queryFn: async () => {
            if (!student?.id) return [];
            const { data, error } = await supabase
                .from('agent_tasks')
                .select('*')
                .eq('student_id', student.id)
                .order('assigned_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },
        enabled: !!student?.id
    });

    const pendingTasks = tasks?.filter((t: any) => t.status === 'pending') || [];
    const completedTasks = tasks?.filter((t: any) => t.status === 'completed') || [];

    // Complete task mutation
    const completeTask = useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase
                .from('agent_tasks')
                // @ts-ignore
                .update({ 
                    status: 'completed', 
                    completed_at: new Date().toISOString() 
                })
                .eq('id', taskId);
                
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent_tasks'] });
        }
    });

    const handleComplete = (taskId: string) => {
        completeTask.mutate(taskId);
    };

    const renderTask = ({ item }: { item: any }) => {
        const isCompleted = item.status === 'completed';
        const isOverdue = !isCompleted && new Date(item.deadline) < new Date();
        
        return (
            <View style={[styles.taskCard, isCompleted && styles.taskCompleted]}>
                <View style={styles.taskHeader}>
                    <View style={styles.platformBadge}>
                        <MaterialCommunityIcons 
                            name={item.platform === 'leetcode' ? 'code-braces' : 'xml'} 
                            size={16} 
                            color={isCompleted ? "#666" : "#007AFF"} 
                        />
                        <Text style={[styles.platformText, isCompleted && { color: "#666" }]}>
                            {item.platform || "Practice"}
                        </Text>
                    </View>
                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
                        <Text style={styles.difficultyText}>{item.difficulty || "Medium"}</Text>
                    </View>
                </View>
                
                <Text style={[styles.taskDesc, isCompleted && styles.taskDescCompleted]}>
                    {item.description}
                </Text>
                
                <View style={styles.taskFooter}>
                    <View style={styles.deadlineRow}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={isOverdue ? "#F44336" : "#666"} />
                        <Text style={[styles.deadlineText, isOverdue && { color: "#F44336" }]}>
                            {isCompleted ? 'Completed' : `Due: ${new Date(item.deadline).toLocaleDateString()}`}
                        </Text>
                    </View>
                    
                    {!isCompleted && (
                        <View style={styles.actionsRow}>
                            {item.target_url && (
                                <TouchableOpacity 
                                    style={styles.openBtn}
                                    onPress={() => Linking.openURL(item.target_url)}
                                >
                                    <Text style={styles.openBtnText}>Open</Text>
                                    <MaterialCommunityIcons name="open-in-new" size={14} color="#007AFF" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={styles.doneBtn}
                                onPress={() => handleComplete(item.id)}
                                disabled={completeTask.isPending}
                            >
                                <MaterialCommunityIcons name="check" size={16} color="#fff" />
                                <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}><Skeleton width={120} height={24} /></View>
                <View style={styles.list}>
                    {[1,2,3].map(i => <Skeleton key={i} width="100%" height={140} borderRadius={12} style={{marginBottom: 12}} />)}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="robot-outline" size={28} color="#007AFF" />
                <Text style={styles.headerTitle}>AI Coach Tasks</Text>
            </View>
            
            <FlatList
                data={[...(pendingTasks.length > 0 ? [{ id: 'header-pending' }] : []), ...pendingTasks, ...completedTasks]}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="check-all" size={64} color="#ccc" />
                        <Text style={styles.emptyTitle}>You're all caught up!</Text>
                        <Text style={styles.emptySub}>Your AI coach hasn't assigned any new tasks. Keep up the daily practice!</Text>
                    </View>
                )}
                renderItem={({ item }) => {
                    if (item.id === 'header-pending') {
                        return <Text style={styles.sectionTitle}>Pending Tasks ({pendingTasks.length})</Text>;
                    }
                    return renderTask({ item });
                }}
            />
        </SafeAreaView>
    );
}

const getDifficultyColor = (diff: string) => {
    switch(diff?.toLowerCase()) {
        case 'easy': return '#E8F5E9';
        case 'hard': return '#FFEBEE';
        case 'medium': 
        default: return '#FFF3E0';
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', gap: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginBottom: 12, marginTop: 4 },
    list: { padding: 16, paddingBottom: 40 },
    
    taskCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    taskCompleted: { opacity: 0.7, backgroundColor: '#f8fafc' },
    taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    platformBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    platformText: { fontSize: 12, fontWeight: '600', color: '#007AFF', textTransform: 'uppercase' },
    difficultyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    difficultyText: { fontSize: 11, fontWeight: 'bold', color: '#333', textTransform: 'uppercase' },
    
    taskDesc: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 16 },
    taskDescCompleted: { textDecorationLine: 'line-through', color: '#94a3b8' },
    
    taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    deadlineText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    
    actionsRow: { flexDirection: 'row', gap: 8 },
    openBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
    openBtnText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
    doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#10b981' },
    doneBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginTop: 16, marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
});
