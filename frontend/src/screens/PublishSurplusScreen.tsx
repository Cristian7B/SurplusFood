import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Image,
  SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../services/api';
import { colors } from '../theme/colors';

export default function PublishSurplusScreen({ navigation }: any) {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity]       = useState('');
  const [closeTime, setCloseTime]     = useState('');
  const [image, setImage]             = useState<string | null>(null);
  const [location, setLocation]       = useState<{ latitude: number; longitude: number } | null>(null);

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
        formData.append('latitude',  String(location.latitude));
        formData.append('longitude', String(location.longitude));
      }
      if (image) {
        formData.append('image', { uri: image, name: 'surplus.jpg', type: 'image/jpeg' } as any);
      }
      await api.post('/surplus', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('¡Listo!', 'Surplus publicado exitosamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setDescription(''); setQuantity(''); setCloseTime(''); setImage(null);
    } catch (error) {
      Alert.alert('Error', 'No se pudo publicar el surplus');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Eyebrow */}
          <Text style={styles.eyebrow}>Donante — nueva publicación</Text>
          <Text style={styles.title}>Publicar surplus</Text>

          {/* Foto */}
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage} activeOpacity={0.8}>
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

          {/* Cantidad y hora — fila en móvil (caben bien) */}
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

          {/* Ubicación capturada */}
          {location ? (
            <View style={styles.locBadge}>
              <Text style={styles.locIcon}>📍</Text>
              <Text style={styles.locText}>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
          ) : (
            <View style={styles.locBadge}>
              <Text style={styles.locIcon}>⏳</Text>
              <Text style={styles.locText}>Obteniendo ubicación...</Text>
            </View>
          )}

          {/* TODO issue #5 y #7: reemplazar por MapView de react-native-maps
              con pin arrastrable para afinar la ubicación de recogida.
              npx expo install react-native-maps */}
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderEmoji}>🗺️</Text>
            <Text style={styles.mapPlaceholderText}>
              Aquí irá el mapa con pin arrastrable{'\n'}
              (react-native-maps — issue #5)
            </Text>
          </View>

          {/* Botón publicar */}
          <TouchableOpacity style={styles.btnPublish} onPress={handlePublish} activeOpacity={0.85}>
            <Text style={styles.btnPublishText}>Publicar surplus</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.cream },
  scroll:  { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  eyebrow: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.greenDark, fontWeight: '500' },
  title:   { fontSize: 22, fontWeight: '600', color: colors.text, marginTop: 2 },

  // Foto
  photoBtn: {
    borderWidth: 1.5, borderColor: colors.green, borderStyle: 'dashed',
    borderRadius: 12, height: 140, overflow: 'hidden',
    backgroundColor: colors.greenLight,
  },
  photoImage:       { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoIcon:        { fontSize: 28 },
  photoLabel:       { fontSize: 13, fontWeight: '500', color: colors.greenDark },
  photoSub:         { fontSize: 11, color: colors.green },

  // Campos
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500', color: colors.textMuted, letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.cream2, borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 10, padding: 13, fontSize: 14, color: colors.text,
  },
  inputMulti: { height: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },

  // Ubicación
  locBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenLight, borderRadius: 10, padding: 12,
  },
  locIcon: { fontSize: 14 },
  locText: { fontSize: 12, color: colors.greenDark, fontWeight: '500', flex: 1 },

  // Map placeholder
  mapPlaceholder: {
    height: 160, borderRadius: 12, backgroundColor: colors.cream2,
    borderWidth: 0.5, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  mapPlaceholderEmoji: { fontSize: 36 },
  mapPlaceholderText:  { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },

  // Botón
  btnPublish:     { backgroundColor: colors.green, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnPublishText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
