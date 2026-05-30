import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import PublishSurplusScreen from '../screens/PublishSurplusScreen';
import MapScreen from '../screens/MapScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import SurplusListScreen from '../screens/SurplusListScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={token ? 'Home' : 'Landing'}
      screenOptions={{ headerShown: false }}
    >
      {/* Rutas públicas */}
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />

      {/* Rutas privadas */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="PublishSurplus"
        component={PublishSurplusScreen}
        options={{ headerShown: true, title: 'Publicar Surplus' }}
      />
      <Stack.Screen name="Map" component={MapScreen} />
      {/*
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="SurplusListScreen" component={SurplusListScreen} />
      */}
    </Stack.Navigator>
  );
}
