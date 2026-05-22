import React from 'react';
import { ActivityIndicator, View, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

import LoginScreen      from '../screens/LoginScreen';
import DashboardScreen  from '../screens/DashboardScreen';
import UploadScreen     from '../screens/UploadScreen';
import ReviewScreen     from '../screens/ReviewScreen';
import ResultadoScreen  from '../screens/ResultadoScreen';
import ConfigScreen     from '../screens/ConfigScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useApp } from '../context/AppContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const noHeader = { headerShown: false };

function NovaDREButton() {
  const nav = useNavigation<any>();
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={fab.btn} onPress={() => nav.navigate('Upload')} activeOpacity={0.85}>
      <View style={[fab.inner, { backgroundColor: colors.green, shadowColor: colors.green }]}>
        <Ionicons name="add" size={26} color="#0a1a0e" />
      </View>
      <Text style={[fab.label, { color: colors.green }]}>Nova DRE</Text>
    </TouchableOpacity>
  );
}

const fab = StyleSheet.create({
  btn:   { flex: 1, alignItems: 'center', justifyContent: 'center', top: -10 },
  inner: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  label: { fontSize: 10, fontWeight: '700', marginTop: 3 },
});

function HomeTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.s1,
          borderTopColor: colors.b1,
          borderTopWidth: 0.5,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 62,
        },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.t3,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Config: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen
        name="NovaDRE"
        component={DashboardScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: () => <NovaDREButton />,
        }}
      />
      <Tab.Screen name="Config" component={ConfigScreen} options={{ tabBarLabel: 'Config' }} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Home" component={HomeTabs} />
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen name="Resultado" component={ResultadoScreen} />
    </Stack.Navigator>
  );
}

function AppRoot() {
  const { colors } = useTheme();
  const { businessType, configLoaded, loadData } = useApp();

  React.useEffect(() => { loadData(); }, []);

  if (!configLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  if (!businessType) return <OnboardingScreen />;
  return <AppStack />;
}

function AppNavigatorInner() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user
        ? <AppProvider><AppRoot /></AppProvider>
        : (
          <Stack.Navigator screenOptions={noHeader}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
        )
      }
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <ThemeProvider>
      <AppNavigatorInner />
    </ThemeProvider>
  );
}
