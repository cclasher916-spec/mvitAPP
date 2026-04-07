import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface SmartStartModalProps {
    visible: boolean;
    onClose: () => void;
    pendingTask: any | null; // The next task from agent_tasks
    platforms: any[];
}

export const SmartStartModal = ({ visible, onClose, pendingTask, platforms }: SmartStartModalProps) => {
    const navigation = useNavigation<any>();

    const handleContinueTask = () => {
        onClose();
        if (pendingTask?.target_url) {
            Linking.openURL(pendingTask.target_url);
        } else {
            // No URL, just navigate to Focus Mode or Tasks
            navigation.navigate('FocusMode');
        }
    };

    const handleSuggest = () => {
        onClose();
        navigation.navigate('FocusMode');
    };

    const handleOpenPlatform = (url?: string) => {
        onClose();
        if (url) {
            Linking.openURL(url);
        } else {
            navigation.navigate('PlatformSetup');
        }
    };

    const leetcodeUrl = platforms.find(p => p.platform === 'leetcode')?.url 
        || (platforms.find(p => p.platform === 'leetcode') ? `https://leetcode.com/${platforms.find(p => p.platform === 'leetcode').username}` : null);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFB800" />
                        </View>
                        <Text style={styles.title}>What do you want to do today?</Text>
                        <Text style={styles.subtitle}>Choose your learning path.</Text>
                    </View>

                    <View style={styles.options}>
                        {pendingTask ? (
                            <TouchableOpacity style={styles.primaryOption} onPress={handleContinueTask}>
                                <View style={styles.optionContent}>
                                    <View style={styles.badgeRow}>
                                        <Text style={styles.badgeText}>PENDING TASK</Text>
                                        <MaterialCommunityIcons name="robot-outline" size={14} color="#007AFF" />
                                    </View>
                                    <Text style={styles.optionTitle} numberOfLines={2}>
                                        {pendingTask.task_description}
                                    </Text>
                                </View>
                                <MaterialCommunityIcons name="arrow-right" size={20} color="#007AFF" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.primaryOption} onPress={handleSuggest}>
                                <View style={styles.optionContent}>
                                    <View style={styles.badgeRow}>
                                        <Text style={styles.badgeText}>SUGGESTED</Text>
                                        <MaterialCommunityIcons name="star-outline" size={14} color="#007AFF" />
                                    </View>
                                    <Text style={styles.optionTitle}>Practice Arrays (Easy)</Text>
                                </View>
                                <MaterialCommunityIcons name="arrow-right" size={20} color="#007AFF" />
                            </TouchableOpacity>
                        )}

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.line} />
                        </View>

                        <TouchableOpacity style={styles.secondaryOption} onPress={() => handleOpenPlatform(leetcodeUrl || 'https://leetcode.com')}>
                            <MaterialCommunityIcons name="code-braces" size={20} color="#64748b" />
                            <Text style={styles.secondaryText}>Open LeetCode</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.secondaryOption, { marginTop: 8 }]} onPress={() => { onClose(); navigation.navigate('FocusMode'); }}>
                            <MaterialCommunityIcons name="brain" size={20} color="#64748b" />
                            <Text style={styles.secondaryText}>Focus Mode (25 min)</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
    },
    header: {
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
    },
    options: {
        paddingHorizontal: 24,
    },
    primaryOption: {
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    optionContent: { flex: 1, paddingRight: 16 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    badgeText: { fontSize: 11, fontWeight: 'bold', color: '#007AFF', letterSpacing: 0.5 },
    optionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', lineHeight: 22 },
    
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    line: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
    dividerText: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginHorizontal: 12 },
    
    secondaryOption: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#f8fafc',
        borderWidth: 1, borderColor: '#e2e8f0', gap: 12
    },
    secondaryText: { fontSize: 15, fontWeight: '500', color: '#334155' },
    
    closeBtn: {
        padding: 20,
        alignItems: 'center',
        marginTop: 8,
    },
    closeBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    }
});
