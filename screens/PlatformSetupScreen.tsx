import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase, Database } from '../lib/supabase'

export default function PlatformSetupScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [studentId, setStudentId] = useState<string | null>(null)

    // Form state
    const [accounts, setAccounts] = useState({
        leetcode: '',
        codechef: '',
        codeforces: '',
        hackerrank: '',
        github: '',
        skillrack: ''
    })

    useEffect(() => {
        fetchPlatforms()
    }, [])

    const fetchPlatforms = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get student ID
            const { data: student } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!student) {
                Alert.alert('Error', 'Student profile not found')
                navigation.goBack()
                return
            }

            setStudentId(student.id)

            // Get existing accounts
            const { data: platforms } = await supabase
                .from('platform_accounts')
                .select('platform, username')
                .eq('student_id', student.id)

            if (platforms) {
                const newAccounts = { ...accounts }
                platforms.forEach((p: any) => {
                    if (p.platform in newAccounts) {
                        (newAccounts as any)[p.platform] = p.username
                    }
                })
                setAccounts(newAccounts)
            }
        } catch (error) {
            console.error('Error fetching platforms:', error)
            Alert.alert('Error', 'Failed to load platform data')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!studentId) return
        setSaving(true)

        try {
            const updates: Database['public']['Tables']['platform_accounts']['Update'][] = []
            const platforms = ['leetcode', 'codechef', 'codeforces', 'hackerrank', 'github', 'skillrack'] as const

            for (const platform of platforms) {
                const username = (accounts as any)[platform]?.trim()

                if (username) {
                    // Upsert logic
                    updates.push({
                        student_id: studentId,
                        platform: platform,
                        username,
                        last_synced_at: null // Reset sync so scraper picks it up
                    })
                } else {
                    // If empty, we might want to delete? 
                    // For now let's just ignore empty strings, or handle deletion if user clears input.
                    // Doing a delete is safer if the user intention is to remove.

                    // Ideally: Check if it exists and delete. 
                    // To keep it simple for MVP: We upsert non-empty. 
                    // Real deletion logic requires knowing if it was there before.
                    // We'll skip delete for now unless strictly requested.
                }
            }

            if (updates.length > 0) {
                const { error } = await supabase
                    .from('platform_accounts')
                    .upsert(updates, { onConflict: 'student_id, platform' })

                if (error) throw error
            }

            Alert.alert('Success', 'Profiles updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ])
        } catch (error) {
            console.error('Error saving platforms:', error)
            Alert.alert('Error', 'Failed to save profiles')
        } finally {
            setSaving(false)
        }
    }

    const PlatformInput = ({ id, name, icon, color, placeholder }: any) => (
        <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
                <MaterialCommunityIcons name={icon} size={20} color={color} />
                <Text style={styles.label}>{name}</Text>
            </View>
            <TextInput
                style={styles.input}
                value={(accounts as any)[id]}
                onChangeText={(text) => setAccounts(prev => ({ ...prev, [id]: text }))}
                placeholder={placeholder}
                autoCapitalize="none"
                autoCorrect={false}
            />
        </View>
    )

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#333" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Connect Platforms</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.description}>
                        Enter your usernames or full profile links for the coding platforms you use.
                        We will automatically sync your progress daily.
                    </Text>

                    <PlatformInput
                        id="leetcode"
                        name="LeetCode"
                        icon="code-brackets"
                        color="#f89f1b"
                        placeholder="username (e.g. johndoe)"
                    />

                    <PlatformInput
                        id="codechef"
                        name="CodeChef"
                        icon="chef-hat"
                        color="#5b4638"
                        placeholder="username"
                    />

                    <PlatformInput
                        id="codeforces"
                        name="Codeforces"
                        icon="poll" // closest match
                        color="#1f8dd6"
                        placeholder="handle"
                    />

                    <PlatformInput
                        id="hackerrank"
                        name="HackerRank"
                        icon="code-string"
                        color="#2ec866"
                        placeholder="username or link"
                    />

                    <PlatformInput
                        id="skillrack"
                        name="SkillRack"
                        icon="bullseye-arrow"
                        color="#e84118"
                        placeholder="full profile link"
                    />

                    <PlatformInput
                        id="github"
                        name="GitHub"
                        icon="github"
                        color="#333"
                        placeholder="username or link"
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Profiles</Text>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
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
        padding: 20,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
})
