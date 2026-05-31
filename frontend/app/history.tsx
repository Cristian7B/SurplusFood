import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../src/theme/colors';
import api from '../src/services/api';

interface SurplusRecord {
  id: string;
  title: string;
  foodType: string;
  quantityKg: number;
  status: string;
  pickupStartAt: string;
  pickupEndAt: string;
  expirationAt: string;
  createdAt: string;
  donor: { name: string; email: string };
}

const FOOD_EMOJI: Record<string, string> = {
  cooked: '🍚', bakery: '🥐', produce: '🥦', packaged: '📦', other: '🍽️',
};

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  ASSIGNED:  { label: 'Pendiente',  emoji: '⏳', color: '#795548', bg: '#FFF8E1' },
  PICKED_UP: { label: 'Recogido',   emoji: '✅', color: '#2E7D32', bg: '#E8F5E9' },
  EXPIRED:   { label: 'Expirado',   emoji: '⌛', color: '#9E9E9E', bg: '#F5F5F5' },
  PUBLISHED: { label: 'Publicado',  emoji: '📢', color: '#1565C0', bg: '#E3F2FD' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatWindow(startIso: string, endIso: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

export default function HistoryScreen() {
  const [records, setRecords] = useState<SurplusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/surplus/my-history');
      const data = res.data?.data ?? res.data ?? [];
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.warn('[History] load error:', e?.message);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const pickedUp = records.filter(r => r.status === 'PICKED_UP').length;
  const expired  = records.filter(r => r.status === 'EXPIRED').length;

  const renderItem = ({ item }: { item: SurplusRecord }) => {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['EXPIRED'];
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardEmoji}>{FOOD_EMOJI[item.foodType] ?? '🍽️'}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardMeta}>{item.quantityKg} kg · {item.donor.name ?? item.donor.email}</Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.cardWindow}>{formatWindow(item.pickupStartAt, item.pickupEndAt)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusPillText, { color: cfg.color }]}>
            {cfg.emoji} {cfg.label}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi historial</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.listContent}
          ListHeaderComponent={records.length > 0 ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{records.length}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.greenDark }]}>{pickedUp}</Text>
                <Text style={styles.summaryLabel}>Recogidos</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.textMuted }]}>{expired}</Text>
                <Text style={styles.summaryLabel}>Expirados</Text>
              </View>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Sin historial aún</Text>
              <Text style={styles.emptySub}>
                Aquí aparecerán los surplus que te hayan sido asignados.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: colors.cream, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  headerBack: { padding: 4, minWidth: 60 },
  headerBackText: { fontSize: 13, color: colors.textMuted },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },

  listContent: { padding: 16, gap: 10, paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },

  summaryRow: {
    flexDirection: 'row', backgroundColor: colors.cream2, borderRadius: 16,
    padding: 20, marginBottom: 16, borderWidth: 0.5, borderColor: colors.border,
    justifyContent: 'space-around', alignItems: 'center',
  },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 28, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 12, color: colors.textMuted },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cream2, borderRadius: 14, padding: 16,
    borderWidth: 0.5, borderColor: colors.border,
  },
  cardLeft: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center',
  },
  cardEmoji: { fontSize: 24 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted },
  cardDate: { fontSize: 11, color: colors.textMuted },
  cardWindow: { fontSize: 11, color: colors.greenDark },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  emptyState: { alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
});
