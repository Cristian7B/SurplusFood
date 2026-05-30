import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, ScrollView, Alert,
} from 'react-native';
import Mapbox, { MapView, Camera, MarkerView, ShapeSource, CircleLayer } from '@rnmapbox/maps';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import api from '../services/api';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface Surplus {
  id: string;
  title: string;
  description: string;
  quantityKg?: number;
  quantityUnits?: number;
  foodType?: string;
  status: 'PUBLISHED' | 'ASSIGNED' | 'PICKED_UP' | 'EXPIRED';
  latitude: number;
  longitude: number;
  pickupStartAt: string;
  pickupEndAt: string;
  expirationAt: string;
  donor?: { id: string; name: string };
  assignedUser?: { id: string; name: string } | null;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function statusLabel(status: Surplus['status'], role: string | null) {
  if (status === 'PUBLISHED')  return { text: 'Disponible', color: colors.green };
  if (status === 'ASSIGNED')   return { text: 'Asignado',   color: '#F59E0B' };
  if (status === 'PICKED_UP')  return { text: 'Recogido',   color: colors.textMuted };
  if (status === 'EXPIRED')    return { text: 'Expirado',   color: '#EF4444' };
  return { text: status, color: colors.textMuted };
}

function pinEmoji(status: Surplus['status']) {
  if (status === 'PUBLISHED') return '🟢';
  if (status === 'ASSIGNED')  return '🟡';
  return '⚫';
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function MapScreen() {
  const { role, user } = useAuth();
  const isDonor = role === 'DONOR' || role === 'ADMIN';

  const [surplusList, setSurplusList] = useState<Surplus[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Surplus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Fetch ───────────────────────────────
  const fetchSurplus = useCallback(async () => {
    setLoading(true);
    try {
      if (isDonor) {
        // Donante: sus propias publicaciones
        // El backend filtra por donorId en el token — GET /surplus?mine=true
        // Si el backend no tiene ese param todavía, traemos todos y filtramos local
        const res = await api.get('/surplus?limit=100');
        const items: Surplus[] = res.data?.items ?? res.data ?? [];
        // Filtrar solo los propios del donante
        const mine = items.filter((s) => s.donor?.id === user?.id);
        setSurplusList(mine);
      } else {
        // Beneficiario: surplus PUBLISHED disponibles
        const res = await api.get('/surplus?status=PUBLISHED&limit=100');
        const items: Surplus[] = res.data?.items ?? res.data ?? [];
        setSurplusList(items);
      }
    } catch (e) {
      console.error('[MapScreen] Error fetching surplus:', e);
    } finally {
      setLoading(false);
    }
  }, [isDonor, user?.id]);

  useEffect(() => { fetchSurplus(); }, [fetchSurplus]);

  // ─── Acción beneficiario: aceptar surplus asignado ───
  const handleAccept = async (surplus: Surplus) => {
    setActionLoading(true);
    try {
      await api.post(`/surplus/${surplus.id}/accept`);
      Alert.alert('✅ Aceptado', 'El surplus ha sido aceptado. El donante fue notificado.');
      setSelected(null);
      fetchSurplus();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'No se pudo aceptar el surplus.';
      Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Acción beneficiario: rechazar surplus asignado ───
  const handleReject = async (surplus: Surplus) => {
    setActionLoading(true);
    try {
      await api.post(`/surplus/${surplus.id}/reject`);
      Alert.alert('Rechazado', 'El surplus fue devuelto al pool.');
      setSelected(null);
      fetchSurplus();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'No se pudo rechazar.';
      Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Acción donante: confirmar pickup ───
  const handlePickup = async (surplus: Surplus) => {
    setActionLoading(true);
    try {
      await api.post(`/surplus/${surplus.id}/pickup`);
      Alert.alert('✅ Recogida confirmada', 'El surplus fue marcado como recogido.');
      setSelected(null);
      fetchSurplus();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'No se pudo confirmar la recogida.';
      Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Acción donante: expirar ───
  const handleExpire = async (surplus: Surplus) => {
    Alert.alert(
      'Expirar surplus',
      '¿Seguro que quieres marcar este surplus como expirado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Expirar', style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.post(`/surplus/${surplus.id}/expire`);
              setSelected(null);
              fetchSurplus();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo expirar.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // ─── RENDER MAPA ─────────────────────────
  return (
    <View style={styles.container}>
      {/* Header flotante */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isDonor ? '📦 Mis publicaciones' : '🗺️ Surplus disponibles'}
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchSurplus}>
          <Text style={styles.refreshText}>↺</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      )}

      <MapView
        style={{ flex: 1 }}
        styleURL="mapbox://styles/analisisconsierra/cmpr7l3bq001401s3e0qoa374"
        scaleBarEnabled={false}
      >
        <Camera
          zoomLevel={14}
          centerCoordinate={[-74.0721, 4.7110]}
          animationMode="flyTo"
          animationDuration={1500}
        />

        {/* Pins de surplus */}
        {surplusList.map((surplus) => (
          <MarkerView
            key={surplus.id}
            coordinate={[surplus.longitude, surplus.latitude]}
          >
            <TouchableOpacity
              style={styles.pin}
              onPress={() => setSelected(surplus)}
              activeOpacity={0.8}
            >
              <Text style={styles.pinEmoji}>{pinEmoji(surplus.status)}</Text>
              <View style={styles.pinBubble}>
                <Text style={styles.pinText} numberOfLines={1}>
                  {surplus.title ?? 'Surplus'}
                </Text>
              </View>
            </TouchableOpacity>
          </MarkerView>
        ))}
      </MapView>

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={styles.legendDot}>🟢</Text>
          <Text style={styles.legendLabel}>Disponible</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendDot}>🟡</Text>
          <Text style={styles.legendLabel}>Asignado</Text>
        </View>
        {isDonor && (
          <View style={styles.legendItem}>
            <Text style={styles.legendDot}>⚫</Text>
            <Text style={styles.legendLabel}>Cerrado</Text>
          </View>
        )}
      </View>

      {/* MODAL detalle surplus */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                {/* Handle */}
                <View style={styles.modalHandle} />

                {/* Status badge */}
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: statusLabel(selected.status, role).color + '20' },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: statusLabel(selected.status, role).color },
                  ]}>
                    {statusLabel(selected.status, role).text}
                  </Text>
                </View>

                <Text style={styles.modalTitle}>{selected.title ?? 'Surplus'}</Text>
                <Text style={styles.modalDesc}>{selected.description}</Text>

                <View style={styles.infoGrid}>
                  {selected.quantityKg && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>⚖️ {selected.quantityKg} kg</Text>
                    </View>
                  )}
                  {selected.foodType && (
                    <View style={styles.infoChip}>
                      <Text style={styles.infoChipText}>🍽️ {selected.foodType}</Text>
                    </View>
                  )}
                  <View style={styles.infoChip}>
                    <Text style={styles.infoChipText}>
                      🕐 {formatHour(selected.pickupStartAt)} – {formatHour(selected.pickupEndAt)}
                    </Text>
                  </View>
                </View>

                {selected.donor && (
                  <Text style={styles.donorName}>Donante: {selected.donor.name}</Text>
                )}

                {/* ─── ACCIONES BENEFICIARIO ─── */}
                {!isDonor && selected.status === 'ASSIGNED' && selected.assignedUser?.id === user?.id && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnAccept]}
                      onPress={() => handleAccept(selected)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.actionBtnTextLight}>
                        {actionLoading ? '...' : '✓ Aceptar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnReject]}
                      onPress={() => handleReject(selected)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.actionBtnTextDark}>
                        {actionLoading ? '...' : '✕ Rechazar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ─── ACCIONES DONANTE ─── */}
                {isDonor && selected.status === 'ASSIGNED' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnAccept]}
                      onPress={() => handlePickup(selected)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.actionBtnTextLight}>
                        {actionLoading ? '...' : '✓ Confirmar recogida'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isDonor && (selected.status === 'PUBLISHED' || selected.status === 'ASSIGNED') && (
                  <TouchableOpacity
                    style={styles.expireBtn}
                    onPress={() => handleExpire(selected)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.expireBtnText}>Marcar como expirado</Text>
                  </TouchableOpacity>
                )}

                {/* Cerrar */}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.closeBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header flotante sobre el mapa
  header: {
    position: 'absolute', top: 52, left: 16, right: 16, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.cream2,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 0.5, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  headerTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  refreshBtn: { padding: 4 },
  refreshText: { fontSize: 18, color: colors.green },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 20,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  // Pins
  pin: { alignItems: 'center' },
  pinEmoji: { fontSize: 22 },
  pinBubble: {
    backgroundColor: colors.cream2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 0.5, borderColor: colors.border, maxWidth: 120,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2,
  },
  pinText: { fontSize: 11, fontWeight: '500', color: colors.text },

  // Leyenda
  legend: {
    position: 'absolute', bottom: 100, left: 16, zIndex: 10,
    backgroundColor: colors.cream2, borderRadius: 10, padding: 10,
    borderWidth: 0.5, borderColor: colors.border, gap: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { fontSize: 12 },
  legendLabel: { fontSize: 11, color: colors.textMuted },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    backgroundColor: colors.cream, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 6 },
  modalDesc:  { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 14 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  infoChip: {
    backgroundColor: colors.greenLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  infoChipText: { fontSize: 12, color: colors.greenDark, fontWeight: '500' },

  donorName: { fontSize: 12, color: colors.textMuted, marginBottom: 16 },

  // Acciones
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnAccept: { backgroundColor: colors.green },
  actionBtnReject: { backgroundColor: colors.cream2, borderWidth: 0.5, borderColor: colors.border },
  actionBtnTextLight: { color: colors.white, fontWeight: '600', fontSize: 14 },
  actionBtnTextDark:  { color: colors.text,  fontWeight: '600', fontSize: 14 },

  expireBtn: { padding: 12, alignItems: 'center', marginBottom: 8 },
  expireBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },

  closeBtn: { padding: 12, alignItems: 'center' },
  closeBtnText: { fontSize: 14, color: colors.textMuted },
});
