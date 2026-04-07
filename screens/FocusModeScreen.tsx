import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Simple Pomodoro Implementation
export default function FocusModeScreen() {
    const navigation = useNavigation();
    const FOCUS_MINUTES = 25;
    const [timeLeft, setTimeLeft] = useState(FOCUS_MINUTES * 60);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            // Time is up
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(FOCUS_MINUTES * 60);
    };

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => navigation.goBack()}
            >
                <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.content}>
                <MaterialCommunityIcons 
                    name="brain" 
                    size={64} 
                    color={isActive ? "#FFB800" : "#666"} 
                    style={styles.icon}
                />
                
                <Text style={styles.title}>Deep Work</Text>
                <Text style={styles.subtitle}>Block out distractions and code.</Text>

                <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>{timeDisplay}</Text>
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity 
                        style={[styles.btn, styles.resetBtn]} 
                        onPress={resetTimer}
                    >
                        <MaterialCommunityIcons name="refresh" size={24} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.btn, styles.mainBtn, isActive && styles.pauseBtn]} 
                        onPress={toggleTimer}
                    >
                        <MaterialCommunityIcons 
                            name={isActive ? "pause" : "play"} 
                            size={32} 
                            color="#fff" 
                        />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.btn, styles.doneBtn]} 
                        onPress={() => {
                            setIsActive(false);
                            navigation.goBack();
                        }}
                    >
                        <MaterialCommunityIcons name="check" size={24} color="#4CAF50" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Deep slate for minimal distraction
    },
    closeBtn: {
        padding: 20,
        alignSelf: 'flex-start',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    icon: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 48,
    },
    timerContainer: {
        marginBottom: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 80,
        fontWeight: '200',
        color: '#fff',
        fontVariant: ['tabular-nums'],
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32,
    },
    btn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    mainBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#3B82F6',
    },
    pauseBtn: {
        backgroundColor: '#FFB800',
    },
    resetBtn: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    doneBtn: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderColor: '#4CAF50',
        borderWidth: 1,
    }
});
