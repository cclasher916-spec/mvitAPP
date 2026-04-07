import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LoginScreen from "./screens/LoginScreen"
import StudentDashboard from "./screens/StudentDashboard"
import TeamScreen from "./screens/TeamScreen"
import AnalyticsScreen from "./screens/AnalyticsScreen"
import PlatformSetupScreen from "./screens/PlatformSetupScreen"
import LeaderboardScreen from "./screens/LeaderboardScreen"
import AITasksScreen from "./screens/AITasksScreen"
import FocusModeScreen from "./screens/FocusModeScreen"
import AuthService from './services/auth.service';
import { supabase } from './lib/supabase';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './lib/queryClient';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ student, onLogout }: any) {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="home-variant" size={24} color={color} /> }}
      >
        {(props) => <StudentDashboard {...props} student={student} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Tasks" 
        options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="robot-outline" size={24} color={color} /> }}
      >
        {(props) => <AITasksScreen {...props} student={student} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Leaderboard" 
        options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="trophy-variant" size={24} color={color} /> }}
      >
        {(props) => <LeaderboardScreen {...props} student={student} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Stats" 
        component={AnalyticsScreen}
        options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="chart-pie" size={24} color={color} /> }}
      />
      <Tab.Screen 
        name="Team" 
        options={{ tabBarIcon: ({color}) => <MaterialCommunityIcons name="account-group" size={24} color={color} /> }}
      >
        {(props) => <TeamScreen {...props} student={student} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function RootStack({ isLoggedIn, student, onLogout, onLogin }: any) {
  if (isLoggedIn && student) {
    return (
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs">
          {(props) => <MainTabs {...props} student={student} onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen name="PlatformSetup" component={PlatformSetupScreen} />
        <Stack.Screen name="FocusMode" component={FocusModeScreen} options={{ presentation: 'fullScreenModal' }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoginSuccess={onLogin} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await AuthService.getSession();
      if (session) {
        setIsLoggedIn(true);
        // Fetch student data
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', session.user.id) 
          .single()

        if (studentData) {
          setStudent(studentData);
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <SafeAreaProvider style={styles.container}>
        <NavigationContainer>
          <RootStack
            isLoggedIn={isLoggedIn}
            student={student}
            onLogout={() => {
              setIsLoggedIn(false);
              setStudent(null);
            }}
            onLogin={(studentData: any) => {
              setStudent(studentData);
              setIsLoggedIn(true);
            }}
          />
        </NavigationContainer>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});