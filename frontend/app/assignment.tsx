import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../src/theme/colors';
import api from '../src/services/api';

interface AssignedSurplus {
  id: string;
  title: string;
  foodType: string;
  quantityKg: number;
  quantityUnits: number | null;
  pickupStartAt: string;
  pickupEndAt: string;
  expirationAt: string;
  donor: { id: string; name: string; email: string };
}

const FOOD_EMOJI: Record<string, string> = {
  cooked: '🍚', bakery: '🥐', produce: '🥦', packaged: '📦', other: '🍽️',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatExpiry(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${min}min restantes` : `${min} min restantes`;
}

/** Extrae el mensaje de error del wrapper de respuesta del backend */
function extractError(e: any): string {
  const data = e?.response?.data;
  if (!data) return 'Error de conexión. Verifica tu red.';
  // formato wrapper: { error: ["msg"] } o { error: "msg" } o { message: "msg" }
  if (Array.isArray(data.error)) return data.error[0];
  if (typeof data.error === 'string') return data.error;
  if (typeof data.message === 'string') return data.message;
  return 'Ocurrió un error inesperado.';
}

export default function AssignmentScreen() {
  const [surplus, setSurplus] = useState<AssignedSurplus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const fetchAssignment = useCallback(async () => {
    try {
      const res = await api.get('/surplus/my-assignment');
      const payload = res.data?.data ?? null;
      setSurplus(payload?.id ? payload : null);
    } catch {
      setSurplus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignment(); }, [fetchAssignment]);

  const handleAccept = async () => {
    if (!surplus) return;
    setActing(true);
    try {
      await api.patch(`/surplus/${surplus.id}/accept`);
      setAccepted(true); // muestra la vista de "aceptado" sin navegar
    } catch (e: any) {
      Alert.alert('No se pudo aceptar', extractError(e));
    } finally {
      setActing(false);
    }
  };

  const handleReject = () => {
    if (!surplus) return;
    Alert.alert(
      'Rechazar surplus',
      'Si rechazas, el surplus se reasignará y tu puntaje bajará. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            try {
              await api.post(`/surplus/${surplus.id}/reject`);
              setSurplus(null);
              router.replace('/home');
            } catch (e: any) {
              Alert.alert('No se pudo rechazar', extractError(e));
              setActing(false);
            }
          },
        },
      ],
    );
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>Verificando asignación...</Text>
      </View>
    );
  }

  // ── Sin asignación ──────────────────────────────────────────────────────────
  if (!surplus) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🍽️</Text>
        <Text style={styles.emptyTitle}>Sin asignación activa</Text>
        <Text style={styles.emptySub}>
          El algoritmo te notificará cuando haya un surplus disponible para ti.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/home')}>
          <Text style={styles.backBtnText}>Volver al mapa</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Surplus aceptado ────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 60 }} />
          <Text style={styles.headerTitle}>Mi asignación</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.acceptedContainer}>
          <Text style={styles.acceptedEmoji}>✅</Text>
          <Text style={styles.acceptedTitle}>¡Surplus aceptado!</Text>
          <Text style={styles.acceptedSub}>
            {surplus.title}
          </Text>

          <View style={styles.pickupCard}>
            <Text style={styles.pickupLabel}>Donante</Text>
            <Text style={styles.pickupValue}>{surplus.donor.name ?? surplus.donor.email}</Text>
            <View style={styles.pickupDivider} />
            <Text style={styles.pickupLabel}>Horario de recogida</Text>
            <Text style={styles.pickupValue}>
              {formatTime(surplus.pickupStartAt)} – {formatTime(surplus.pickupEndAt)}
            </Text>
            <View style={styles.pickupDivider} />
            <Text style={styles.pickupLabel}>Tiempo restante</Text>
            <Text style={[styles.pickupValue, { color: colors.greenDark }]}>
              {formatExpiry(surplus.expirationAt)}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              📦 El donante confirmará el pickup cuando vayas a recoger el alimento.
              Tu puntaje de confiabilidad aumentará tras la confirmación.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/home')}
          >
            <Text style={styles.homeBtnText}>Volver al mapa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Pendiente de aceptación ─────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi asignación</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>⏳ Pendiente de aceptación</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEmoji}>{FOOD_EMOJI[surplus.foodType] ?? '🍽️'}</Text>
          <Text style={styles.cardTitle}>{surplus.title}</Text>
          <Text style={styles.cardSub}>{surplus.quantityKg} kg · {surplus.foodType}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Donante</Text>
            <Text style={styles.gridValue}>{surplus.donor.name ?? surplus.donor.email}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Expira</Text>
            <Text style={[styles.gridValue, { color: colors.greenDark }]}>
              {formatExpiry(surplus.expirationAt)}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Recogida desde</Text>
            <Text style={styles.gridValue}>{formatTime(surplus.pickupStartAt)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Recogida hasta</Text>
            <Text style={styles.gridValue}>{formatTime(surplus.pickupEndAt)}</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            ⚡ Tienes 15 minutos para responder. No responder cuenta como rechazo
            y baja tu puntaje de confiabilidad.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.acceptBtn, acting && styles.btnDisabled]}
          onPress={handleAccept}
          disabled={acting}
        >
          {acting
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.acceptBtnText}>✅ Aceptar y recoger</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rejectBtn, acting && styles.btnDisabled]}
          onPress={handleReject}
          disabled={acting}
        >
          <Text style={styles.rejectBtnText}>✕ Rechazar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: colors.cream },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: colors.cream, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  headerBack: { padding: 4, minWidth: 60 },
  headerBackText: { fontSize: 13, color: colors.textMuted },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },

  content: { padding: 20, gap: 16, paddingBottom: 48 },

  statusBadge: {
    backgroundColor: '#FFF3CD', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    alignSelf: 'center', borderWidth: 1, borderColor: '#FFEAA7',
  },
  statusBadgeText: { fontSize: 13, fontWeight: '600', color: '#856404' },

  card: {
    backgroundColor: colors.cream2, borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 8, borderWidth: 0.5, borderColor: colors.border,
  },
  cardEmoji: { fontSize: 48 },
  cardTitle: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center' },
  cardSub: { fontSize: 14, color: colors.textMuted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '47%', backgroundColor: colors.cream2, borderRadius: 12,
    padding: 14, borderWidth: 0.5, borderColor: colors.border,
  },
  gridLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4, letterSpacing: 0.3 },
  gridValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  notice: {
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFE082',
  },
  noticeText: { fontSize: 12, color: '#795548', lineHeight: 18 },

  acceptBtn: {
    backgroundColor: colors.green, padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 4,
  },
  acceptBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  rejectBtn: {
    borderWidth: 1, borderColor: '#E57373', padding: 15,
    borderRadius: 12, alignItems: 'center',
  },
  rejectBtnText: { color: '#C62828', fontSize: 15, fontWeight: '500' },
  btnDisabled: { opacity: 0.6 },

  // Accepted state
  acceptedContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 28, gap: 16,
  },
  acceptedEmoji: { fontSize: 72 },
  acceptedTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  acceptedSub: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  pickupCard: {
    width: '100%', backgroundColor: colors.cream2, borderRadius: 16,
    padding: 20, borderWidth: 0.5, borderColor: colors.border, gap: 6,
  },
  pickupLabel: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.3 },
  pickupValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  pickupDivider: { height: 0.5, backgroundColor: colors.border, marginVertical: 6 },
  infoBox: {
    width: '100%', backgroundColor: '#E3F2FD', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#BBDEFB',
  },
  infoBoxText: { fontSize: 12, color: '#1565C0', lineHeight: 18, textAlign: 'center' },
  homeBtn: {
    width: '100%', backgroundColor: colors.green,
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  homeBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },

  // Empty / loading
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  backBtn: {
    marginTop: 8, borderWidth: 0.5, borderColor: colors.green,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  backBtnText: { color: colors.greenDark, fontSize: 14, fontWeight: '500' },
  loadingText: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
});
