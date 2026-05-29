import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../src/theme/colors';

const CARDS = [
  { icon: '🏪', title: 'Restaurante Central', sub: 'Publicó surplus hace 5 min · 8 kg disponibles' },
  { icon: '☕', title: 'Cafetería UniAndes', sub: 'Cierra recogida a las 17:00 · 3 porciones' },
  { icon: '❤️', title: '+240 donaciones este mes', sub: 'En toda Bogotá' },
];

export default function LandingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content} bounces={false}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot}><Text style={styles.logoLeaf}>🌿</Text></View>
          <Text style={styles.logoText}>SurplusFood</Text>
        </View>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.eyebrow}>Bogotá, Colombia</Text>
        <Text style={styles.heroTitle}>
          Conectamos el <Text style={styles.heroAccent}>excedente</Text>
          {'\n'}con quienes más{'\n'}lo necesitan
        </Text>
        <Text style={styles.heroDesc}>
          Cafeterías y restaurantes donan su surplus. Beneficiarios acceden a comida de calidad cerca de ellos.
        </Text>
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/register')}>
            <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/login')}>
            <Text style={styles.btnSecondaryText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Activity Cards */}
      <Animated.View style={[styles.cardsSection, { opacity: fadeAnim }]}>
        {CARDS.map((c, i) => (
          <View key={i} style={styles.miniCard}>
            <Text style={styles.miniCardIcon}>{c.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniCardTitle}>{c.title}</Text>
              <Text style={styles.miniCardSub}>{c.sub}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* Features */}
      <Animated.View style={[styles.features, { opacity: fadeAnim }]}>
        {[
          { icon: '🍱', title: 'Dona surplus', desc: 'Publica alimentos sobrantes en segundos.' },
          { icon: '🤝', title: 'Conecta comunidades', desc: 'Beneficiarios encuentran comida cerca.' },
          { icon: '🌱', title: 'Reduce el desperdicio', desc: 'Cada porción publicada importa.' },
        ].map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.desc}</Text>
          </View>
        ))}
      </Animated.View>

      <Text style={styles.footer}>SurplusFood · Bogotá 🌿</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: 48 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.cream,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center',
  },
  logoLeaf: { fontSize: 14 },
  logoText: { fontSize: 15, fontWeight: '600', color: colors.text },
  loginBtn: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 8, borderWidth: 0.5,
    borderColor: colors.green, backgroundColor: colors.greenLight,
  },
  loginBtnText: { fontSize: 13, fontWeight: '500', color: colors.greenDark },
  hero: { padding: 24, paddingTop: 36, gap: 14 },
  eyebrow: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.greenDark, fontWeight: '500' },
  heroTitle: { fontSize: 30, fontWeight: '500', color: colors.text, lineHeight: 38 },
  heroAccent: { color: colors.green },
  heroDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnPrimary: { backgroundColor: colors.green, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnPrimaryText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  btnSecondary: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border },
  btnSecondaryText: { fontSize: 14, color: colors.text },
  cardsSection: { paddingHorizontal: 20, gap: 10 },
  miniCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cream2, borderRadius: 12,
    padding: 14, borderWidth: 0.5, borderColor: colors.border,
  },
  miniCardIcon: { fontSize: 24 },
  miniCardTitle: { fontSize: 13, fontWeight: '500', color: colors.text },
  miniCardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  features: { flexDirection: 'row', gap: 10, padding: 20, paddingTop: 24 },
  featureCard: {
    flex: 1, backgroundColor: colors.cream2, borderRadius: 12,
    padding: 14, gap: 6, borderWidth: 0.5, borderColor: colors.border,
  },
  featureIcon: { fontSize: 22 },
  featureTitle: { fontSize: 12, fontWeight: '500', color: colors.text },
  featureDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textMuted, paddingVertical: 24 },
});
