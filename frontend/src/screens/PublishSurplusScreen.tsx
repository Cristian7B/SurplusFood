import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../services/api';
import { colors } from '../theme/colors';

export default function PublishSurplusScreen() {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => { getLocation(); }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requiere acceso a la ubicación');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handlePublish = async () => {
    if (!description || !quantity || !closeTime) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('quantity', quantity);
      formData.append('closeTime', closeTime);
      if (location) {
        formData.append('latitude', String(location.latitude));
        formData.append('longitude', String(location.longitude));
      }
      if (image) {
        formData.append('image', { uri: image, name: 'surplus.jpg', type: 'image/jpeg' } as any);
      }
      await api.post('/surplus', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('¡Listo!', 'Surplus publicado exitosamente');
      setDescription(''); setQuantity(''); setCloseTime(''); setImage(null);
    } catch (error) {
      Alert.alert('Error', 'No se pudo publicar el surplus');
    }
  };

  return (
    <View style={styles.wrap}>
      {/* Formulario izquierda */}
      <ScrollView style={styles.formPanel} contentContainerStyle={styles.formContent}>
        <Text style={styles.eyebrow}>Donante — nueva publicación</Text>
        <Text style={styles.title}>Publicar surplus</Text>

        {/* Foto */}
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

        {/* Descripción */}
        <View style={styles.field}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Ej: Arroz con pollo, 10 porciones disponibles..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Cantidad y hora */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Cantidad (kg)</Text>
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
            <Text style={styles.label}>Hora de cierre</Text>
            <TextInput
              style={styles.input}
              placeholder="18:00"
              placeholderTextColor={colors.textMuted}
              value={closeTime}
              onChangeText={setCloseTime}
            />
          </View>
        </View>

        {/* Ubicación */}
        {location && (
          <View style={styles.locBadge}>
            <Text style={styles.locIcon}>📍</Text>
            <Text style={styles.locText}>
              Ubicación capturada: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Botón */}
        <TouchableOpacity style={styles.btnPublish} onPress={handlePublish}>
          <Text style={styles.btnPublishText}>Publicar surplus</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Mapa derecha */}
      <View style={styles.mapPanel}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapHeaderText}>📍 Bogotá, Colombia</Text>
        </View>
        <View style={styles.mapBody}>
          <Text style={styles.mapPlaceholder}>🗺️{'\n'}Mapa interactivo{'\n'}próximamente</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', backgroundColor: colors.cream },

  // Form
  formPanel: { flex: 1, backgroundColor: colors.cream },
  formContent: { padding: 28, gap: 14, paddingBottom: 48 },
  eyebrow: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.greenDark, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: '500', color: colors.text, marginTop: 2 },

  photoBtn: {
    borderWidth: 1.5, borderColor: colors.green, borderStyle: 'dashed',
    borderRadius: 12, height: 140, overflow: 'hidden',
    backgroundColor: colors.greenLight,
  },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoIcon: { fontSize: 28 },
  photoLabel: { fontSize: 13, fontWeight: '500', color: colors.greenDark },
  photoSub: { fontSize: 11, color: colors.green },

  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500', color: colors.textMuted, letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.cream2, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 10, padding: 13, fontSize: 14, color: colors.text,
  },
  inputMulti: { height: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },

  locBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenLight, borderRadius: 10,
    padding: 12,
  },
  locIcon: { fontSize: 14 },
  locText: { fontSize: 12, color: colors.greenDark, fontWeight: '500' },

  btnPublish: {
    backgroundColor: colors.green, padding: 16,
    borderRadius: 10, alignItems: 'center', marginTop: 8,
  },
  btnPublishText: { color: colors.white, fontSize: 15, fontWeight: '500' },

  // Map
  mapPanel: {
    width: 220, borderLeftWidth: 0.5, borderLeftColor: colors.border,
    backgroundColor: colors.cream,
  },
  mapHeader: {
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border,
    backgroundColor: colors.cream,
  },
  mapHeaderText: { fontSize: 12, fontWeight: '500', color: colors.text },
  mapBody: {
    flex: 1, backgroundColor: colors.cream2,
    justifyContent: 'center', alignItems: 'center',
  },
  mapPlaceholder: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});