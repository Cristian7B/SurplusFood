import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView, SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';

const CARDS = [
  { icon: '🏪', title: 'Restaurante Central', sub: 'Publicó surplus hace 5 min · 8 kg disponibles' },
  { icon: '☕', title: 'Cafetería UniAndes', sub: 'Cierra recogida a las 17:00 · 3 porciones' },
  { icon: '❤️', title: '+240 donaciones este mes', sub: 'En toda Bogotá' },
];

const FEATURES = [
  { icon: '🍱', title: 'Dona surplus', desc: 'Publica alimentos sobrantes en segundos.' },
  { icon: '🤝', title: 'Conecta comunidades', desc: 'Beneficiarios encuentran comida cerca.' },
  { icon: '🌱', title: 'Reduce el desperdicio', desc: 'Cada porción publicada importa.' },
];

export default function LandingScreen({ navigation }: any) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Navbar ── */}
      <View style={styles.navbar}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot}>
            <Text style={styles.logoLeaf}>🌿</Text>
          </View>
          <Text style={styles.logoText}>SurplusFood</Text>
        </View>
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginBtnText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero ── */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.eyebrow}>Bogotá, Colombia</Text>
          <Text style={styles.heroTitle}>
            Conectamos el{' '}
            <Text style={styles.heroAccent}>excedente</Text>
            {' '}con quienes más lo necesitan
          </Text>
          <Text style={styles.heroDesc}>
            Cafeterías y restaurantes donan su surplus. Beneficiarios acceden a comida de calidad cerca de ellos.
          </Text>

          {/* Botones */}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Mini cards ── */}
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

        {/* ── Features ── */}
        <Animated.View style={[styles.featuresSection, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>¿Cómo funciona?</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Text style={styles.footer}>SurplusFood · Bogotá 🌿</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  content:{ paddingBottom: 48 },

  // Navbar — solo logo + botón, sin links que no caben
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot:  { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
  logoLeaf: { fontSize: 14 },
  logoText: { fontSize: 15, fontWeight: '600', color: colors.text },
  loginBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 0.5, borderColor: colors.green, backgroundColor: colors.greenLight },
  loginBtnText: { fontSize: 13, fontWeight: '500', color: colors.greenDark },

  // Hero — columna única
  hero: { padding: 24, gap: 14, paddingTop: 32 },
  eyebrow:    { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.greenDark, fontWeight: '500' },
  heroTitle:  { fontSize: 30, fontWeight: '600', color: colors.text, lineHeight: 38 },
  heroAccent: { color: colors.green },
  heroDesc:   { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  heroActions:{ flexDirection: 'row', gap: 10, marginTop: 4 },
  btnPrimary:     { flex: 1, backgroundColor: colors.green, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  btnSecondary:     { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', borderWidth: 0.5, borderColor: colors.border },
  btnSecondaryText: { fontSize: 15, color: colors.text, fontWeight: '500' },

  // Mini cards — columna
  cardsSection: { paddingHorizontal: 20, gap: 10, marginTop: 8 },
  miniCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cream2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.border },
  miniCardIcon: { fontSize: 24 },
  miniCardTitle:{ fontSize: 13, fontWeight: '500', color: colors.text },
  miniCardSub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Features — filas
  featuresSection: { padding: 20, gap: 14, marginTop: 8 },
  sectionTitle:    { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' },
  featureIcon:     { fontSize: 22 },
  featureTitle:    { fontSize: 14, fontWeight: '500', color: colors.text },
  featureDesc:     { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },

  footer: { textAlign: 'center', fontSize: 12, color: colors.textMuted, paddingVertical: 16 },
});
