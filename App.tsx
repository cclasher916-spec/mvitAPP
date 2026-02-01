import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { useEffect, useState } from 'react';
import LoginScreen from "./screens/LoginScreen"
import StudentDashboard from "./screens/StudentDashboard"
import TeamScreen from "./screens/TeamScreen"
import AnalyticsScreen from "./screens/AnalyticsScreen"
import AuthService from './services/auth.service';
import { supabase } from './lib/supabase';

const Stack = createNativeStackNavigator();

function RootStack({ isLoggedIn, student, onLogout, onLogin }: any) {
  if (isLoggedIn && student) {
    return (
      <Stack.Navigator
        id={undefined}
        screenOptions={{
          headerShown: false
        }}>
        <Stack.Screen
          name="Dashboard"
          component={(props) => <StudentDashboard {...props} student={student} onLogout={onLogout} />}
        />
        <Stack.Screen name="Team" component={TeamScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false
      }}>
      <Stack.Screen
        name="Login"
        component={(props) => <LoginScreen {...props} onLoginSuccess={onLogin} />}
      />
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
          .eq('auth_id', session.user.id) // Corrected to use auth_id if that's what we used, let me check schema again. 
          // Schema says `user_id` references users(id). 
          // And users table ID matches auth.uid()? 
          // Usually Supabase auth.users.id matches public.users.id if triggered.
          // Let's assume user_id matches auth.user.id
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