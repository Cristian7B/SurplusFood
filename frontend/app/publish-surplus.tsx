import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Image, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Mapbox, { MapView, Camera, PointAnnotation, ShapeSource, FillLayer, LineLayer, CircleLayer } from '@rnmapbox/maps';
import { colors } from '../src/theme/colors';
import api from '../src/services/api';

// ─── Configuration ─────────────────────────────────────────────────────────
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');
const MAP_STYLE = 'mapbox://styles/analisisconsierra/cmpr7l3bq001401s3e0qoa374';

/** UD Engineering Faculty – operational 3 km centre */
const UD_CENTER = { lat: 4.6351, lon: -74.0703 };
const MAX_RADIUS_M = 3000;

// ─── Haversine distance helper ──────────────────────────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── GeoJSON circle helper ──────────────────────────────────────────────────
function makeCircle(centerLon: number, centerLat: number, radiusM: number, points = 64): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusM / 111320) * Math.cos(angle);
    const dy = (radiusM / (111320 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);
    coords.push([centerLon + dy, centerLat + dx]);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

const FOOD_TYPES = [
  { key: 'cooked',    label: '🍚 Cocido'     },
  { key: 'bakery',    label: '🥐 Panadería'  },
  { key: 'produce',   label: '🥦 Verduras'   },
  { key: 'packaged',  label: '📦 Empacado'   },
  { key: 'other',     label: '🍽️ Otro'       },
];

export default function PublishSurplusScreen() {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [foodType, setFoodType] = useState('cooked');
  const [closeTime, setCloseTime] = useState('');
  const [image, setImage] = useState<string | null>(null);

  // Map / location state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [markerCoord, setMarkerCoord] = useState<[number, number] | null>(null);
  const [withinRadius, setWithinRadius] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);

  const [publishing, setPublishing] = useState(false);
  const cameraRef = useRef<Camera>(null);

  const udCircle = makeCircle(UD_CENTER.lon, UD_CENTER.lat, MAX_RADIUS_M);

  // ── Get user location on mount ─────────────────────────────────────────
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
      setUserLocation(coord);
      setMarkerCoord(coord);
      setLocationLoading(false);

      const dist = haversineMeters(loc.coords.latitude, loc.coords.longitude, UD_CENTER.lat, UD_CENTER.lon);
      setWithinRadius(dist <= MAX_RADIUS_M);
    })();
  }, []);

  // ── Map press: move pickup marker ────────────────────────────────────
  const handleMapPress = (feature: GeoJSON.Feature<GeoJSON.Point>) => {
    const [lon, lat] = feature.geometry.coordinates;
    const newCoord: [number, number] = [lon, lat];
    setMarkerCoord(newCoord);
    const dist = haversineMeters(lat, lon, UD_CENTER.lat, UD_CENTER.lon);
    setWithinRadius(dist <= MAX_RADIUS_M);
  };

  // ── Image picker ────────────────────────────────────────────────────
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // ── Publish ─────────────────────────────────────────────────────────
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
        formData.append('latitude', String(markerCoord[1]));
        formData.append('longitude', String(markerCoord[0]));
      }
      if (image) {
        formData.append('image', { uri: image, name: 'surplus.jpg', type: 'image/jpeg' } as any);
      }
      await api.post('/surplus', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('✅ ¡Publicado!', 'Tu surplus fue publicado exitosamente.', [
        { text: 'Ver mapa', onPress: () => router.push('/home') },
        { text: 'Publicar otro', onPress: () => {
          setTitle(''); setDescription(''); setQuantity(''); setCloseTime(''); setImage(null);
          if (userLocation) setMarkerCoord(userLocation);
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

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicar surplus</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Map Section ── */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionLabel}>📍 Punto de entrega</Text>
          <Text style={styles.sectionSub}>Toca el mapa para mover el punto de recogida</Text>

          <View style={styles.mapContainer}>
            {locationLoading ? (
              <View style={styles.mapLoader}>
                <ActivityIndicator size="large" color={colors.green} />
                <Text style={styles.mapLoaderText}>Obteniendo ubicación...</Text>
              </View>
            ) : (
              <MapView
                style={styles.map}
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
                />

                {/* 3 km radius circle fill */}
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
            )}

            {/* Radius badge */}
            {distToUD !== null && (
              <View style={[styles.radiusBadge, !withinRadius && styles.radiusBadgeError]}>
                <Text style={[styles.radiusBadgeText, !withinRadius && styles.radiusBadgeTextError]}>
                  {!withinRadius ? '⚠️ Fuera del radio · ' : '✅ '}
                  {(distToUD / 1000).toFixed(2)} km del centro UD
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Form Section ── */}
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
                <Text style={styles.photoSub}>JPG o PNG, máx. 10MB</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input} placeholder="Ej: Arroz con pollo, 10 porciones"
              placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]} placeholder="Detalla el alimento, condiciones, etc."
              placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription}
              multiline numberOfLines={3}
            />
          </View>

          {/* Quantity + Close time */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Cantidad (kg)</Text>
              <TextInput
                style={styles.input} placeholder="0.0" placeholderTextColor={colors.textMuted}
                value={quantity} onChangeText={setQuantity} keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Hora de cierre</Text>
              <TextInput
                style={styles.input} placeholder="18:00" placeholderTextColor={colors.textMuted}
                value={closeTime} onChangeText={setCloseTime}
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
            style={[styles.btnPublish, (!withinRadius || publishing) && styles.btnPublishDisabled]}
            onPress={handlePublish}
            disabled={!withinRadius || publishing}
          >
            {publishing
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnPublishText}>
                  {withinRadius ? '✅ Publicar surplus' : '⚠️ Punto fuera del radio'}
                </Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: colors.cream,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 13, color: colors.textMuted },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { gap: 0, paddingBottom: 48 },

  // Map section
  mapSection: { padding: 20, gap: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  sectionSub: { fontSize: 12, color: colors.textMuted },
  mapContainer: { height: 250, borderRadius: 16, overflow: 'hidden', marginTop: 10, position: 'relative' },
  map: { flex: 1 },
  mapLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream2, gap: 12 },
  mapLoaderText: { fontSize: 13, color: colors.textMuted },
  marker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  markerOutside: { backgroundColor: '#E05555' },
  markerEmoji: { fontSize: 18 },
  radiusBadge: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    backgroundColor: colors.greenLight, borderRadius: 8, padding: 8, alignItems: 'center',
  },
  radiusBadgeError: { backgroundColor: '#FDECEA' },
  radiusBadgeText: { fontSize: 12, fontWeight: '500', color: colors.greenDark },
  radiusBadgeTextError: { color: '#C0392B' },

  // Form section
  formSection: { padding: 20, paddingTop: 0, gap: 14 },
  photoBtn: { borderWidth: 1.5, borderColor: colors.green, borderStyle: 'dashed', borderRadius: 12, height: 120, overflow: 'hidden', backgroundColor: colors.greenLight },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoIcon: { fontSize: 28 },
  photoLabel: { fontSize: 13, fontWeight: '500', color: colors.greenDark },
  photoSub: { fontSize: 11, color: colors.green },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500', color: colors.textMuted, letterSpacing: 0.3 },
  input: { backgroundColor: colors.cream2, borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 13, fontSize: 14, color: colors.text },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  foodTypesScroll: { marginTop: 2 },
  foodTypeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: colors.border, backgroundColor: colors.cream2, marginRight: 8 },
  foodTypeBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  foodTypeText: { fontSize: 13, color: colors.text },
  foodTypeTextActive: { color: colors.white, fontWeight: '600' },
  btnPublish: { backgroundColor: colors.green, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnPublishDisabled: { backgroundColor: '#B0C4B1', opacity: 0.7 },
  btnPublishText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
