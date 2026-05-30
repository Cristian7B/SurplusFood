import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';

// ─── Datos mock (reemplazar con surplus.service.ts en el issue #8) ──────────
const SURPLUS = [
  { id: 1, title: 'Arroz con pollo', place: 'Cafetería Central', kg: 8, status: 'available' },
  { id: 2, title: 'Ensalada mixta', place: 'Rest. La Candelaria', kg: 3, status: 'closing' },
  { id: 3, title: 'Pan artesanal', place: 'Panadería Norte', kg: 2, status: 'available' },
  { id: 4, title: 'Frutas de temporada', place: 'Mercado Chapinero', kg: 5, status: 'available' },
];

const ICONS: Record<string, string> = {
  'Arroz con pollo': '🍚',
  'Ensalada mixta': '🥗',
  'Pan artesanal': '🍞',
  'Frutas de temporada': '🍎',
};

// ─── Bottom tab labels ───────────────────────────────────────────────────────
type Tab = 'home' | 'map' | 'publish' | 'profile';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'home',    icon: '🏠', label: 'Inicio'   },
  { key: 'map',     icon: '📍', label: 'Mapa'     },
  { key: 'publish', icon: '➕', label: 'Publicar' },
  { key: 'profile', icon: '👤', label: 'Perfil'   },
];

// ─── Componente ──────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const handleTab = (tab: Tab) => {
    if (tab === 'publish') { navigation.navigate('PublishSurplus'); return; }
    if (tab === 'profile')  { navigation.navigate('Profile');        return; }
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SurplusFood 🌿</Text>
          <Text style={styles.headerSub}>Bogotá, Colombia</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn}>
          <Text style={styles.avatarIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* ── Contenido (tabs: inicio | mapa) ── */}
      {activeTab === 'home' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.greeting}>
            ¡Hola de nuevo, <Text style={styles.greetingAccent}>Usuario!</Text>
          </Text>
          <Text style={styles.sectionTitle}>Surplus disponibles hoy</Text>

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
      )}

      {activeTab === 'map' && (
        // TODO issue #5: reemplazar por <MapView> de react-native-maps
        // npx expo install react-native-maps
        <View style={styles.mapPlaceholderContainer}>
          <Text style={styles.mapPlaceholderEmoji}>🗺️</Text>
          <Text style={styles.mapPlaceholderTitle}>Mapa próximamente</Text>
          <Text style={styles.mapPlaceholderSub}>
            Instalar react-native-maps{'\n'}
            npx expo install react-native-maps
          </Text>
        </View>
      )}

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => handleTab(t.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrap, isActive && styles.tabIconActive]}>
                <Text style={styles.tabIcon}>{t.icon}</Text>
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.cream,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  headerSub:   { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  avatarBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' },
  avatarIcon:  { fontSize: 16 },

  // Scroll / lista
  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 12, paddingBottom: 20 },
  greeting:      { fontSize: 18, fontWeight: '500', color: colors.text, marginBottom: 4 },
  greetingAccent:{ color: colors.green },
  sectionTitle:  { fontSize: 12, color: colors.textMuted, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 4 },

  // Cards — columna única (full width) en móvil
  card: {
    flexDirection: 'row', borderRadius: 12, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.cream2,
  },
  cardImg:  { width: 80, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, padding: 14, gap: 4 },
  cardTitle:{ fontSize: 14, fontWeight: '500', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted },

  // Badges
  badge:          { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginTop: 6 },
  badgeGreen:     { backgroundColor: colors.greenLight },
  badgeAmber:     { backgroundColor: colors.amber },
  badgeText:      { fontSize: 11, fontWeight: '500' },
  badgeTextGreen: { color: colors.greenDark },
  badgeTextAmber: { color: colors.amberDark },

  // Map placeholder
  mapPlaceholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  mapPlaceholderEmoji:     { fontSize: 56 },
  mapPlaceholderTitle:     { fontSize: 18, fontWeight: '500', color: colors.text },
  mapPlaceholderSub:       { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: 'monospace' },

  // Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.cream,
    paddingBottom: 8, paddingTop: 6,
  },
  tabItem:       { flex: 1, alignItems: 'center', gap: 2 },
  tabIconWrap:   { width: 44, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  tabIconActive: { backgroundColor: colors.greenLight },
  tabIcon:       { fontSize: 18 },
  tabLabel:      { fontSize: 10, color: colors.textMuted },
  tabLabelActive:{ color: colors.greenDark, fontWeight: '500' },
});
