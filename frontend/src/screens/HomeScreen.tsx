import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

// ─── Datos mock (reemplazar con surplus.service.ts en el issue #8) ──────────
const SURPLUS = [
  { id: 1, title: 'Arroz con pollo',      place: 'Cafetería Central',      kg: 8, status: 'available' },
  { id: 2, title: 'Ensalada mixta',        place: 'Rest. La Candelaria',    kg: 3, status: 'closing'   },
  { id: 3, title: 'Pan artesanal',         place: 'Panadería Norte',        kg: 2, status: 'available' },
  { id: 4, title: 'Frutas de temporada',   place: 'Mercado Chapinero',      kg: 5, status: 'available' },
];

const ICONS: Record<string, string> = {
  'Arroz con pollo':    '🍚',
  'Ensalada mixta':     '🥗',
  'Pan artesanal':      '🍞',
  'Frutas de temporada':'🍎',
};

export default function HomeScreen({ navigation }: any) {
  const { user, role, logout } = useAuth();

  const isDonor = role === 'DONOR' || role === 'ADMIN';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerTitle}>
              Hola, {user?.name ?? 'Usuario'} 👋
            </Text>
          </View>
          <Text style={styles.headerRole}>
            {isDonor ? 'DONANTE' : 'BENEFICIARIO'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isDonor && (
            <TouchableOpacity
              style={styles.publishBtn}
              onPress={() => navigation.navigate('Publish')}
              activeOpacity={0.85}
            >
              <Text style={styles.publishBtnText}>+ Publicar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.avatarBtn} onPress={logout}>
            <Text style={styles.avatarIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Lista de surplus ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>
          {isDonor
            ? 'Tus publicaciones activas'
            : 'Surplus disponibles hoy'}
        </Text>
        <Text style={styles.sectionTitle}>
          {isDonor
            ? 'Gestiona tu surplus publicado'
            : 'Cerca de ti · Bogotá'}
        </Text>

        {/* TODO issue #8: reemplazar SURPLUS mock con datos reales del backend */}
        {SURPLUS.map((s) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardImg}>
              <Text style={{ fontSize: 32 }}>{ICONS[s.title]}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardMeta}>{s.place} · {s.kg} kg</Text>
              <View style={[
                styles.badge,
                s.status === 'available' ? styles.badgeGreen : styles.badgeAmber,
              ]}>
                <Text style={[
                  styles.badgeText,
                  s.status === 'available' ? styles.badgeTextGreen : styles.badgeTextAmber,
                ]}>
                  {s.status === 'available' ? 'Disponible' : 'Cierra pronto'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.cream,
  },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle:   { fontSize: 16, fontWeight: '600', color: colors.text },
  headerRole:    { fontSize: 10, color: colors.green, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 10 },

  publishBtn: {
    backgroundColor: colors.green, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  publishBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },

  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarIcon: { fontSize: 16 },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 12, paddingBottom: 20 },
  greeting:      { fontSize: 18, fontWeight: '500', color: colors.text, marginBottom: 2 },
  sectionTitle:  { fontSize: 12, color: colors.textMuted, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 4 },

  // Cards
  card: {
    flexDirection: 'row', borderRadius: 12, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.cream2,
  },
  cardImg:   { width: 80, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' },
  cardBody:  { flex: 1, padding: 14, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  cardMeta:  { fontSize: 12, color: colors.textMuted },

  // Badges
  badge:          { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginTop: 6 },
  badgeGreen:     { backgroundColor: colors.greenLight },
  badgeAmber:     { backgroundColor: '#FEF3C7' },
  badgeText:      { fontSize: 11, fontWeight: '500' },
  badgeTextGreen: { color: colors.greenDark },
  badgeTextAmber: { color: '#92400E' },
});
