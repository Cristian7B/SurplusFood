import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.wrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🌿</Text>
        </View>
        <Text style={styles.appName}>SurplusFood</Text>
        <Text style={styles.tagline}>Reduce waste, feed the community</Text>
      </Animated.View>
      <Animated.Text style={[styles.loading, { opacity: fadeAnim }]}>Cargando...</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
  wrap: { alignItems: 'center', gap: 12 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.greenDark,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.greenLight,
  },
  logoEmoji: { fontSize: 48 },
  appName: { fontSize: 36, fontWeight: 'bold', color: colors.cream, letterSpacing: 1, marginTop: 8 },
  tagline: { fontSize: 14, color: colors.cream2 },
  loading: { position: 'absolute', bottom: 60, fontSize: 13, color: colors.cream2, letterSpacing: 0.5 },
});