import React, { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../src/context/AuthContext';
import SplashScreen from '../src/screens/SplashScreen';
import { configureNotificationHandler } from '../src/services/pushNotifications';

// Configure how notifications appear when the app is in the foreground
configureNotificationHandler();

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Handle notifications received while app is in the foreground (no action needed)
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    // Handle tap on a notification (app in background or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === 'SURPLUS_ASSIGNED') {
        // Navigate to the assignment screen when user taps the notification
        router.push('/assignment');
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="landing" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="home" />
          <Stack.Screen name="publish-surplus" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="assignment" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="history" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
