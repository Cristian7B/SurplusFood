import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Screens públicas
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Screens privadas
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import PublishSurplusScreen from '../screens/PublishSurplusScreen';
// import ProfileScreen from '../screens/ProfileScreen'; // cuando esté lista

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────
// ICONOS (emoji por ahora, fácil de swappear por react-native-vector-icons)
// ─────────────────────────────────────────────
const ICONS: Record<string, { active: string; inactive: string }> = {
  Home:    { active: '🏠', inactive: '🏡' },
  Map:     { active: '🗺️', inactive: '🗺️' },
  Publish: { active: '➕', inactive: '➕' },
  Profile: { active: '👤', inactive: '👤' },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icon = ICONS[name];
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
      {focused ? icon.active : icon.inactive}
    </Text>
  );
}

// ─────────────────────────────────────────────
// BOTTOM TABS — DONOR
// Tabs: Inicio / Mapa / Publicar / Perfil
// ─────────────────────────────────────────────
function DonorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}          options={{ title: 'Inicio' }} />
      <Tab.Screen name="Map"     component={MapScreen}           options={{ title: 'Mapa' }} />
      <Tab.Screen name="Publish" component={PublishSurplusScreen} options={{ title: 'Publicar' }} />
      {/* <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} /> */}
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────
// BOTTOM TABS — BENEFICIARY
// Tabs: Inicio / Mapa / Perfil
// Sin tab de Publicar
// ─────────────────────────────────────────────
function BeneficiaryTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Map"     component={MapScreen}  options={{ title: 'Mapa' }} />
      {/* <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} /> */}
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────
// SELECTOR DE TABS POR ROL
// CHARITY se trata igual que BENEFICIARY por ahora
// ─────────────────────────────────────────────
function MainTabs() {
  const { role } = useAuth();

  if (role === 'DONOR' || role === 'ADMIN') {
    return <DonorTabs />;
  }

  // BENEFICIARY, CHARITY, o rol desconocido → vista beneficiario
  return <BeneficiaryTabs />;
}

// ─────────────────────────────────────────────
// NAVIGATOR RAÍZ
// ─────────────────────────────────────────────
export default function AppNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={token ? 'Main' : 'Landing'}
      screenOptions={{ headerShown: false }}
    >
      {/* Rutas públicas */}
      <Stack.Screen name="Landing"  component={LandingScreen} />
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />

      {/* Raíz privada — tabs por rol */}
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
  },
  tabBar: {
    backgroundColor: colors.cream2,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
    // Sombra sutil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
