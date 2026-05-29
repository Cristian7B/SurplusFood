import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

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

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.wrap}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarLogo}>
          <Text style={{ fontSize: 16 }}>🌿</Text>
        </View>
        <TouchableOpacity style={[styles.navItem, styles.navActive]}>
          <Text style={styles.navIcon}>🏠</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Map')}>
          <Text style={styles.navIcon}>📍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('PublishSurplus')}>
          <Text style={styles.navIcon}>➕</Text>
        </TouchableOpacity>
        <View style={styles.sidebarBot}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.navIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.greeting}>¡Hola de nuevo, <Text style={styles.greetingAccent}>Usuario!</Text></Text>
        <Text style={styles.sectionTitle}>Surplus disponibles hoy</Text>
        <View style={styles.cards}>
          {SURPLUS.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardImg}>
                <Text style={{ fontSize: 28 }}>{ICONS[s.title]}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={styles.cardMeta}>{s.place} · {s.kg} kg</Text>
                <View style={[styles.badge, s.status === 'available' ? styles.badgeGreen : styles.badgeAmber]}>
                  <Text style={[styles.badgeText, s.status === 'available' ? styles.badgeTextGreen : styles.badgeTextAmber]}>
                    {s.status === 'available' ? 'Disponible' : 'Cierra pronto'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Map placeholder */}
      <View style={styles.mapPanel}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapHeaderText}>📍 Bogotá</Text>
        </View>
        <View style={styles.mapBody}>
          <Text style={styles.mapPlaceholder}>🗺️{'\n'}Mapa interactivo</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', backgroundColor: colors.cream },
  sidebar: {
    width: 52, backgroundColor: colors.cream,
    borderRightWidth: 0.5, borderRightColor: colors.border,
    alignItems: 'center', paddingVertical: 16, gap: 4,
  },
  sidebarLogo: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  navItem: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  navActive: { backgroundColor: colors.greenLight },
  navIcon: { fontSize: 16 },
  sidebarBot: { marginTop: 'auto' as any },
  content: { flex: 1 },
  contentInner: { padding: 20, gap: 14 },
  greeting: { fontSize: 18, fontWeight: '500', color: colors.text },
  greetingAccent: { color: colors.green },
  sectionTitle: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%', borderRadius: 12, overflow: 'hidden',
    borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.cream2,
  },
  cardImg: { height: 80, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 2 },
  cardMeta: { fontSize: 11, color: colors.textMuted },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, marginTop: 6 },
  badgeGreen: { backgroundColor: colors.greenLight },
  badgeAmber: { backgroundColor: colors.amber },
  badgeText: { fontSize: 10 },
  badgeTextGreen: { color: colors.greenDark },
  badgeTextAmber: { color: colors.amberDark },
  mapPanel: { width: 200, borderLeftWidth: 0.5, borderLeftColor: colors.border },
  mapHeader: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.cream },
  mapHeaderText: { fontSize: 12, fontWeight: '500', color: colors.text },
  mapBody: { flex: 1, backgroundColor: colors.cream2, justifyContent: 'center', alignItems: 'center' },
  mapPlaceholder: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});