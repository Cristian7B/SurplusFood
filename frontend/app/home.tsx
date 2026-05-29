import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Modal, Alert, RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Mapbox, { MapView, Camera, PointAnnotation, ShapeSource, FillLayer, LineLayer } from '@rnmapbox/maps';
import { colors } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';

// ─── Configuration ─────────────────────────────────────────────────────────
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');
const MAP_STYLE = 'mapbox://styles/analisisconsierra/cmpr7l3bq001401s3e0qoa374';
const UD_CENTER = { lat: 4.6351, lon: -74.0703 };
const MAX_RADIUS_M = 3000;

// ─── Types ──────────────────────────────────────────────────────────────────
interface NearbySurplus {
  id: string;
  title: string;
  foodType: string;
  quantityKg: number;
  quantityUnits: number | null;
  status: string;
  latitude: number;
  longitude: number;
  pickupStartAt: string;
  pickupEndAt: string;
  expirationAt: string;
  donorId: string;
  distance_m: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeCircle(centerLon: number, centerLat: number, radiusM: number, points = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusM / 111320) * Math.cos(angle);
    const dy = (radiusM / (111320 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);
    coords.push([centerLon + dy, centerLat + dx]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

const FOOD_EMOJI: Record<string, string> = {
  cooked: '🍚', bakery: '🥐', produce: '🥦', packaged: '📦', other: '🍽️',
};

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function formatExpiry(isoString: string) {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${min}min restantes` : `${min} min restantes`;
}

type ViewMode = 'map' | 'list';

// ─── Component ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { userName, role, logout } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [userCoord, setUserCoord] = useState<[number, number] | null>(null);
  const [surplusList, setSurplusList] = useState<NearbySurplus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NearbySurplus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const udCircle = makeCircle(UD_CENTER.lon, UD_CENTER.lat, MAX_RADIUS_M);

  // ── Fetch nearby surplus ─────────────────────────────────────────────
  const fetchNearby = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await api.get(`/surplus/nearby?lat=${lat}&lon=${lon}&radius=${MAX_RADIUS_M}`);
      setSurplusList(res.data ?? []);
    } catch (e: any) {
      console.warn('Error fetching nearby surplus:', e?.message);
    }
  }, []);

  // ── Init location + fetch ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coord: [number, number];
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coord = [loc.coords.longitude, loc.coords.latitude];
      } else {
        // Fallback to UD center for testing
        coord = [UD_CENTER.lon, UD_CENTER.lat];
      }
      setUserCoord(coord);
      await fetchNearby(coord[1], coord[0]);
      setLoading(false);
    })();
  }, []);

  // ── Pull-to-refresh ──────────────────────────────────────────────────
  const onRefresh = async () => {
    if (!userCoord) return;
    setRefreshing(true);
    await fetchNearby(userCoord[1], userCoord[0]);
    setRefreshing(false);
  };

  // ── Claim a surplus ──────────────────────────────────────────────────
  const handleClaim = async (item: NearbySurplus) => {
    setClaiming(true);
    try {
      // The matching must be triggered by a DONOR/ADMIN - for testing we call
      // the endpoint. In production the backend auto-matches on publish.
      // Here we just call accept if already assigned, or inform the user.
      await api.patch(`/surplus/${item.id}/accept`);
      Alert.alert(
        '✅ ¡Surplus reclamado!',
        `Tienes hasta ${new Date(item.pickupEndAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} para recogerlo.`,
        [{ text: 'Entendido', onPress: () => setSelectedItem(null) }]
      );
      // Refresh list
      if (userCoord) fetchNearby(userCoord[1], userCoord[0]);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'El surplus puede ya no estar disponible.';
      Alert.alert('No disponible', msg);
    } finally {
      setClaiming(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <View style={styles.logoDot}><Text style={{ fontSize: 14 }}>🌿</Text></View>
          <View>
            <Text style={styles.greeting}>Hola, {userName ?? 'Usuario'} 👋</Text>
            <Text style={styles.roleText}>{role ?? 'SurplusFood'}</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile')}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </TouchableOpacity>
          {(role === 'DONOR' || role === 'ADMIN') && (
            <TouchableOpacity style={styles.publishBtn} onPress={() => router.push('/publish-surplus')}>
              <Text style={styles.publishBtnText}>+ Publicar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── View Toggle ── */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>🗺️  Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>📋  Lista</Text>
        </TouchableOpacity>
        {surplusList.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{surplusList.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loaderText}>Buscando surplus cercanos...</Text>
        </View>
      ) : viewMode === 'map' ? (
        // ─────────────────── MAP VIEW ───────────────────────────────────
        <View style={styles.mapWrap}>
          <MapView style={styles.map} styleURL={MAP_STYLE} scaleBarEnabled={false}>
            <Camera
              ref={cameraRef}
              zoomLevel={14}
              centerCoordinate={userCoord ?? [UD_CENTER.lon, UD_CENTER.lat]}
              animationMode="flyTo"
              animationDuration={1500}
            />

            {/* 3 km radius circle */}
            <ShapeSource id="ud-circle" shape={udCircle}>
              <FillLayer id="ud-fill" style={{ fillColor: colors.green, fillOpacity: 0.06 }} />
              <LineLayer id="ud-border" style={{ lineColor: colors.green, lineWidth: 1.5, lineOpacity: 0.4, lineDasharray: [4, 3] }} />
            </ShapeSource>

            {/* User location marker */}
            {userCoord && (
              <PointAnnotation id="user-location" coordinate={userCoord}>
                <View style={styles.userMarker}>
                  <View style={styles.userMarkerInner} />
                </View>
              </PointAnnotation>
            )}

            {/* Surplus markers */}
            {surplusList.map((item) => (
              <PointAnnotation
                key={item.id}
                id={`surplus-${item.id}`}
                coordinate={[item.longitude, item.latitude]}
                onSelected={() => setSelectedItem(item)}
              >
                <View style={styles.surplusMarker}>
                  <Text style={styles.surplusMarkerEmoji}>{FOOD_EMOJI[item.foodType] ?? '🍽️'}</Text>
                </View>
              </PointAnnotation>
            ))}
          </MapView>

          {/* Floating bottom cards */}
          {surplusList.length > 0 && (
            <View style={styles.floatingCards}>
              <Text style={styles.floatingTitle}>
                {surplusList.length} surplus cercano{surplusList.length !== 1 ? 's' : ''}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
                {surplusList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.miniCard}
                    onPress={() => {
                      setSelectedItem(item);
                      cameraRef.current?.setCamera({
                        centerCoordinate: [item.longitude, item.latitude],
                        zoomLevel: 16,
                        animationDuration: 800,
                      });
                    }}
                  >
                    <Text style={styles.miniCardEmoji}>{FOOD_EMOJI[item.foodType] ?? '🍽️'}</Text>
                    <View style={styles.miniCardBody}>
                      <Text style={styles.miniCardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.miniCardMeta}>{item.quantityKg} kg · {formatDistance(item.distance_m)}</Text>
                      <Text style={styles.miniCardExpiry}>{formatExpiry(item.expirationAt)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {surplusList.length === 0 && (
            <View style={styles.emptyMapBanner}>
              <Text style={styles.emptyMapText}>🍽️ No hay surplus disponibles en los 3 km cercanos ahora mismo</Text>
            </View>
          )}
        </View>
      ) : (
        // ─────────────────── LIST VIEW ──────────────────────────────────
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        >
          {surplusList.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>Sin surplus disponibles</Text>
              <Text style={styles.emptySub}>
                No hay alimentos publicados dentro de los 3 km de tu ubicación.{'\n'}Desliza hacia abajo para actualizar.
              </Text>
            </View>
          ) : (
            surplusList.map((item) => (
              <TouchableOpacity key={item.id} style={styles.listCard} onPress={() => setSelectedItem(item)}>
                <View style={styles.listCardLeft}>
                  <Text style={styles.listEmoji}>{FOOD_EMOJI[item.foodType] ?? '🍽️'}</Text>
                </View>
                <View style={styles.listCardBody}>
                  <Text style={styles.listCardTitle}>{item.title}</Text>
                  <Text style={styles.listCardMeta}>{item.quantityKg} kg · {formatDistance(item.distance_m)}</Text>
                  <Text style={styles.listCardExpiry}>{formatExpiry(item.expirationAt)}</Text>
                </View>
                <View style={styles.listCardArrow}>
                  <Text style={styles.listCardArrowText}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        visible={selectedItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedItem(null)} />
        {selectedItem && (
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>{FOOD_EMOJI[selectedItem.foodType] ?? '🍽️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                <Text style={styles.modalSub}>
                  {selectedItem.quantityKg} kg · {formatDistance(selectedItem.distance_m)} de ti
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalInfoGrid}>
              <View style={styles.modalInfoItem}>
                <Text style={styles.modalInfoLabel}>Recogida desde</Text>
                <Text style={styles.modalInfoValue}>
                  {new Date(selectedItem.pickupStartAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Text style={styles.modalInfoLabel}>Recogida hasta</Text>
                <Text style={styles.modalInfoValue}>
                  {new Date(selectedItem.pickupEndAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Text style={styles.modalInfoLabel}>Expira</Text>
                <Text style={[styles.modalInfoValue, { color: colors.greenDark }]}>
                  {formatExpiry(selectedItem.expirationAt)}
                </Text>
              </View>
              <View style={styles.modalInfoItem}>
                <Text style={styles.modalInfoLabel}>Tipo</Text>
                <Text style={styles.modalInfoValue}>
                  {FOOD_EMOJI[selectedItem.foodType]} {selectedItem.foodType}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.claimBtn, claiming && styles.claimBtnLoading]}
              onPress={() => handleClaim(selectedItem)}
              disabled={claiming}
            >
              {claiming
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.claimBtnText}>✋ Reclamar este surplus</Text>}
            </TouchableOpacity>

            <Text style={styles.modalDisclaimer}>
              Al reclamar, confirmas que irás a recoger el alimento dentro del horario indicado.
              Las inasistencias afectan tu puntaje de confiabilidad.
            </Text>
          </View>
        )}
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.cream, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoDot: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 14, fontWeight: '600', color: colors.text },
  roleText: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 6 },
  publishBtn: { backgroundColor: colors.green, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  publishBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },

  // Toggle
  toggle: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    gap: 8, backgroundColor: colors.cream, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.cream2 },
  toggleBtnActive: { backgroundColor: colors.green },
  toggleText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  toggleTextActive: { color: colors.white },
  countBadge: { marginLeft: 'auto' as any, backgroundColor: colors.greenLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: colors.greenDark },

  // Loading
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loaderText: { fontSize: 14, color: colors.textMuted },

  // Map view
  mapWrap: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  userMarker: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(93,191,149,0.25)', justifyContent: 'center', alignItems: 'center' },
  userMarkerInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.white },
  surplusMarker: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.cream, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.green,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  surplusMarkerEmoji: { fontSize: 22 },

  // Floating cards
  floatingCards: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.cream, paddingTop: 12,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10,
  },
  floatingTitle: { fontSize: 13, fontWeight: '600', color: colors.text, paddingHorizontal: 16, marginBottom: 8 },
  cardScroll: { paddingHorizontal: 12, paddingBottom: 20 },
  miniCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.cream2, borderRadius: 12, padding: 12, marginRight: 10,
    width: 220, borderWidth: 0.5, borderColor: colors.border,
  },
  miniCardEmoji: { fontSize: 28 },
  miniCardBody: { flex: 1 },
  miniCardTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  miniCardMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  miniCardExpiry: { fontSize: 11, color: colors.greenDark, marginTop: 2 },

  emptyMapBanner: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: colors.cream, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: colors.border, alignItems: 'center',
  },
  emptyMapText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // List view
  listScroll: { flex: 1 },
  listContent: { padding: 16, gap: 10, paddingBottom: 40 },
  listCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cream2, borderRadius: 14, padding: 16,
    borderWidth: 0.5, borderColor: colors.border,
  },
  listCardLeft: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' },
  listEmoji: { fontSize: 26 },
  listCardBody: { flex: 1 },
  listCardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
  listCardMeta: { fontSize: 12, color: colors.textMuted },
  listCardExpiry: { fontSize: 12, color: colors.greenDark, marginTop: 2 },
  listCardArrow: { padding: 4 },
  listCardArrowText: { fontSize: 22, color: colors.textMuted },
  emptyList: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48, gap: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalEmoji: { fontSize: 36 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  modalSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  modalClose: { fontSize: 18, color: colors.textMuted, padding: 4 },
  modalInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modalInfoItem: { width: '46%', backgroundColor: colors.cream2, borderRadius: 10, padding: 12 },
  modalInfoLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4, letterSpacing: 0.3 },
  modalInfoValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  claimBtn: { backgroundColor: colors.green, padding: 16, borderRadius: 12, alignItems: 'center' },
  claimBtnLoading: { opacity: 0.7 },
  claimBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  modalDisclaimer: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
});
