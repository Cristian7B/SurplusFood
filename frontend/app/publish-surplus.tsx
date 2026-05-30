import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Image, ActivityIndicator, Animated,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Mapbox, {
  MapView, Camera, PointAnnotation,
  ShapeSource, FillLayer, LineLayer,
} from '@rnmapbox/maps';
import { colors } from '../src/theme/colors';
import api from '../src/services/api';

// ─── Configuration ───────────────────────────────────────────────────────────
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');
const MAP_STYLE = 'mapbox://styles/analisisconsierra/cmpr7l3bq001401s3e0qoa374';

const UD_CENTER = { lat: 4.6351, lon: -74.0703 };
const MAX_RADIUS_M = 3000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

const FOOD_TYPES = [
  { key: 'cooked',   label: '🍚 Cocido'    },
  { key: 'bakery',   label: '🥐 Panadería' },
  { key: 'produce',  label: '🥦 Verduras'  },
  { key: 'packaged', label: '📦 Empacado'  },
  { key: 'other',    label: '🍽️ Otro'      },
];

// ─── Step indicator component ─────────────────────────────────────────────────
function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <View style={si.wrapper}>
      {/* Step 1 */}
      <View style={si.stepGroup}>
        <View style={[si.dot, current >= 1 && si.dotActive]}>
          <Text style={[si.dotText, current >= 1 && si.dotTextActive]}>1</Text>
        </View>
        <Text style={[si.stepLabel, current === 1 && si.stepLabelActive]}>Ubicación</Text>
      </View>

      {/* Connector */}
      <View style={si.line}>
        <View style={[si.lineFill, current === 2 && si.lineFillActive]} />
      </View>

      {/* Step 2 */}
      <View style={si.stepGroup}>
        <View style={[si.dot, current >= 2 && si.dotActive]}>
          <Text style={[si.dotText, current >= 2 && si.dotTextActive]}>2</Text>
        </View>
        <Text style={[si.stepLabel, current === 2 && si.stepLabelActive]}>Detalles</Text>
      </View>
    </View>
  );
}

const si = StyleSheet.create({
  wrapper:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 14 },
  stepGroup:        { alignItems: 'center', gap: 4 },
  dot:              { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cream2, justifyContent: 'center', alignItems: 'center' },
  dotActive:        { backgroundColor: colors.green, borderColor: colors.green },
  dotText:          { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  dotTextActive:    { color: colors.white },
  stepLabel:        { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  stepLabelActive:  { color: colors.green },
  line:             { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 10, marginBottom: 14, borderRadius: 1, overflow: 'hidden' },
  lineFill:         { height: '100%', width: '0%', backgroundColor: colors.green, borderRadius: 1 },
  lineFillActive:   { width: '100%' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PublishSurplusScreen() {
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity]       = useState('');
  const [foodType, setFoodType]       = useState('cooked');
  const [closeTime, setCloseTime]     = useState('');
  const [image, setImage]             = useState<string | null>(null);

  // Map / location state
  const [markerCoord, setMarkerCoord]     = useState<[number, number] | null>(null);
  const [withinRadius, setWithinRadius]   = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);

  const [publishing, setPublishing] = useState(false);
  const [mapHeight, setMapHeight]   = useState(0);
  const cameraRef = useRef<Camera>(null);
  const udCircle  = makeCircle(UD_CENTER.lon, UD_CENTER.lat, MAX_RADIUS_M);
  const { width: screenWidth } = useWindowDimensions();

  // Slide animation between steps
  const slideAnim = useRef(new Animated.Value(0)).current;
  const goToStep2 = () => {
    setStep(2);
    Animated.timing(slideAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  };
  const goToStep1 = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => setStep(1));
  };

  // ── Get user location on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso de ubicación denegado', 'La app necesita tu ubicación para validar el radio de 3 km.');
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coord: [number, number] = [loc.coords.longitude, loc.coords.latitude];
      setMarkerCoord(coord);
      setLocationLoading(false);
      const dist = haversineMeters(loc.coords.latitude, loc.coords.longitude, UD_CENTER.lat, UD_CENTER.lon);
      setWithinRadius(dist <= MAX_RADIUS_M);
    })();
  }, []);

  // ── Map press: move pickup marker ────────────────────────────────────────
  const handleMapPress = (feature: GeoJSON.Feature<GeoJSON.Point>) => {
    const [lon, lat] = feature.geometry.coordinates;
    const newCoord: [number, number] = [lon, lat];
    setMarkerCoord(newCoord);
    const dist = haversineMeters(lat, lon, UD_CENTER.lat, UD_CENTER.lon);
    setWithinRadius(dist <= MAX_RADIUS_M);
  };

  // ── Image picker ────────────────────────────────────────────────────────
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // ── Publish ─────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!title || !quantity || !closeTime) {
      Alert.alert('Campos requeridos', 'Por favor completa el título, cantidad y hora de cierre.');
      return;
    }
    if (!withinRadius) {
      Alert.alert('Fuera del radio operativo', 'El punto de entrega debe estar dentro de los 3 km alrededor de la UD.');
      return;
    }
    setPublishing(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('quantity', quantity);
      formData.append('foodType', foodType);
      formData.append('closeTime', closeTime);
      if (markerCoord) {
        formData.append('latitude',  String(markerCoord[1]));
        formData.append('longitude', String(markerCoord[0]));
      }
      if (image) {
        formData.append('image', { uri: image, name: 'surplus.jpg', type: 'image/jpeg' } as any);
      }
      await api.post('/surplus', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('✅ ¡Publicado!', 'Tu surplus fue publicado exitosamente.', [
        { text: 'Ver mapa',      onPress: () => router.push('/home') },
        { text: 'Publicar otro', onPress: () => {
          setTitle(''); setDescription(''); setQuantity(''); setCloseTime(''); setImage(null);
          setMarkerCoord(null); setStep(1);
          slideAnim.setValue(0);
        }},
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo publicar el surplus. Asegúrate de estar autenticado.');
    } finally {
      setPublishing(false);
    }
  };

  const distToUD = markerCoord
    ? haversineMeters(markerCoord[1], markerCoord[0], UD_CENTER.lat, UD_CENTER.lon)
    : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={step === 1 ? () => router.back() : goToStep1}
        >
          <Text style={styles.backText}>{step === 1 ? '← Volver' : '← Ubicación'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicar surplus</Text>
        <View style={{ width: 72 }} />
      </View>

      {/* ── Step indicator ── */}
      <StepIndicator current={step} />

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1 — Full-screen map (no competing scroll gesture)
      ════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <View style={styles.step1Container}>

          {/* Hint */}
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>📍 Toca el mapa para ajustar el punto de recogida</Text>
          </View>

          {/* Map — fills all remaining space, measured via onLayout */}
          <View
            style={styles.mapWrapper}
            onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}
          >
            {locationLoading ? (
              <View style={styles.mapLoader}>
                <ActivityIndicator size="large" color={colors.green} />
                <Text style={styles.mapLoaderText}>Obteniendo ubicación…</Text>
              </View>
            ) : mapHeight > 0 ? (
              <MapView
                style={{ width: screenWidth, height: mapHeight }}
                styleURL={MAP_STYLE}
                scaleBarEnabled={false}
                onPress={handleMapPress as any}
              >
                <Camera
                  ref={cameraRef}
                  zoomLevel={14}
                  centerCoordinate={markerCoord ?? [UD_CENTER.lon, UD_CENTER.lat]}
                  animationMode="flyTo"
                  animationDuration={1000}
                  pitch={20}
                  heading={0}
                />

                {/* 3 km radius circle */}
                <ShapeSource id="ud-circle-fill" shape={udCircle}>
                  <FillLayer
                    id="ud-fill"
                    style={{ fillColor: colors.green, fillOpacity: 0.08 }}
                  />
                  <LineLayer
                    id="ud-border"
                    style={{ lineColor: colors.green, lineWidth: 1.5, lineOpacity: 0.5, lineDasharray: [4, 3] }}
                  />
                </ShapeSource>

                {/* Pickup marker */}
                {markerCoord && (
                  <PointAnnotation id="pickup-point" coordinate={markerCoord}>
                    <View style={[styles.marker, !withinRadius && styles.markerOutside]}>
                      <Text style={styles.markerEmoji}>📦</Text>
                    </View>
                  </PointAnnotation>
                )}
              </MapView>
            ) : null}
          </View>

          {/* Bottom panel: distance badge + CTA */}
          <View style={styles.step1Bottom}>
            {distToUD !== null && (
              <View style={[styles.radiusBadge, !withinRadius && styles.radiusBadgeError]}>
                <Text style={[styles.radiusBadgeText, !withinRadius && styles.radiusBadgeTextError]}>
                  {!withinRadius ? '⚠️ Fuera del radio · ' : '✅ '}
                  {(distToUD / 1000).toFixed(2)} km del centro UD
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btnContinue, !withinRadius && styles.btnDisabled]}
              onPress={goToStep2}
              disabled={!withinRadius || !markerCoord}
            >
              <Text style={styles.btnContinueText}>
                {withinRadius ? 'Continuar → Detalles' : '⚠️ Punto fuera del radio'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2 — Form (location already confirmed, no map here)
      ════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Location summary chip */}
          <View style={styles.locationChip}>
            <Text style={styles.locationChipText}>
              📍 {markerCoord
                ? `${markerCoord[1].toFixed(5)}, ${markerCoord[0].toFixed(5)}`
                : 'Sin ubicación'}
            </Text>
            <TouchableOpacity onPress={goToStep1}>
              <Text style={styles.locationChipEdit}>Editar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>📋 Datos del surplus</Text>

            {/* Photo */}
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.photoImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoLabel}>Agregar foto del alimento</Text>
                  <Text style={styles.photoSub}>JPG o PNG, máx. 10 MB</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Title */}
            <View style={styles.field}>
              <Text style={styles.label}>Título <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Arroz con pollo, 10 porciones"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Detalla el alimento, condiciones, etc."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Quantity + Close time */}
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Cantidad (kg) <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor={colors.textMuted}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Hora de cierre <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="18:00"
                  placeholderTextColor={colors.textMuted}
                  value={closeTime}
                  onChangeText={setCloseTime}
                />
              </View>
            </View>

            {/* Food type */}
            <View style={styles.field}>
              <Text style={styles.label}>Tipo de alimento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodTypesScroll}>
                {FOOD_TYPES.map((ft) => (
                  <TouchableOpacity
                    key={ft.key}
                    style={[styles.foodTypeBtn, foodType === ft.key && styles.foodTypeBtnActive]}
                    onPress={() => setFoodType(ft.key)}
                  >
                    <Text style={[styles.foodTypeText, foodType === ft.key && styles.foodTypeTextActive]}>
                      {ft.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Publish button */}
            <TouchableOpacity
              style={[styles.btnPublish, publishing && styles.btnDisabled]}
              onPress={handlePublish}
              disabled={publishing}
            >
              {publishing
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.btnPublishText}>✅ Publicar surplus</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.cream,
  },
  backBtn:     { width: 72 },
  backText:    { fontSize: 13, color: colors.textMuted },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },

  // ── Step 1 ──────────────────────────────────────────────────────────────
  step1Container: { flex: 1 },
  mapHint: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: colors.greenLight,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  mapHintText: { fontSize: 12, color: colors.greenDark, textAlign: 'center' },
  mapWrapper:  { flex: 1, position: 'relative' },

  // Map loader (shown while GPS resolves)
  mapLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream2, gap: 12 },
  mapLoaderText: { fontSize: 13, color: colors.textMuted },

  // Marker
  marker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  markerOutside: { backgroundColor: '#E05555' },
  markerEmoji:   { fontSize: 18 },

  // Bottom panel on step 1
  step1Bottom: {
    padding: 16, gap: 10,
    backgroundColor: colors.cream,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },

  // Radius badge
  radiusBadge:          { backgroundColor: colors.greenLight, borderRadius: 8, padding: 8, alignItems: 'center' },
  radiusBadgeError:     { backgroundColor: '#FDECEA' },
  radiusBadgeText:      { fontSize: 12, fontWeight: '500', color: colors.greenDark },
  radiusBadgeTextError: { color: '#C0392B' },

  // Continue / disabled button
  btnContinue: {
    backgroundColor: colors.green, padding: 15, borderRadius: 12, alignItems: 'center',
  },
  btnContinueText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  btnDisabled:     { backgroundColor: '#B0C4B1', opacity: 0.7 },

  // ── Step 2 ──────────────────────────────────────────────────────────────
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  locationChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginTop: 12, marginBottom: 4,
    backgroundColor: colors.greenLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  locationChipText: { fontSize: 12, color: colors.greenDark, flex: 1 },
  locationChipEdit: { fontSize: 12, fontWeight: '600', color: colors.green, marginLeft: 8 },

  formSection: { padding: 20, gap: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },

  photoBtn: {
    borderWidth: 1.5, borderColor: colors.green, borderStyle: 'dashed',
    borderRadius: 12, height: 120, overflow: 'hidden', backgroundColor: colors.greenLight,
  },
  photoImage:       { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoIcon:        { fontSize: 28 },
  photoLabel:       { fontSize: 13, fontWeight: '500', color: colors.greenDark },
  photoSub:         { fontSize: 11, color: colors.green },

  field:    { gap: 6 },
  label:    { fontSize: 12, fontWeight: '500', color: colors.textMuted, letterSpacing: 0.3 },
  required: { color: colors.green },
  input: {
    backgroundColor: colors.cream2, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 10, padding: 13, fontSize: 14, color: colors.text,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },

  foodTypesScroll: { marginTop: 2 },
  foodTypeBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.cream2, marginRight: 8 },
  foodTypeBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  foodTypeText:      { fontSize: 13, color: colors.text },
  foodTypeTextActive:{ color: colors.white, fontWeight: '600' },

  btnPublish: { backgroundColor: colors.green, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnPublishText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});