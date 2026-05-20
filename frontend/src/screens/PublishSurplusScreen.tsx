import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../services/api';

export default function PublishSurplusScreen() {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is required');
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
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePublish = async () => {
    if (!description || !quantity || !closeTime) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      await api.post('/surplus', {
        description,
        quantity: parseFloat(quantity),
        closeTime,
        location,
      });
      Alert.alert('Success', 'Surplus published successfully');
      setDescription('');
      setQuantity('');
      setCloseTime('');
      setImage(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to publish surplus');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Publish Surplus Food</Text>

      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <Text style={styles.imageButtonText}>📷 Add Photo</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Description (e.g. Rice and beans, 10 portions)"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Quantity (kg)"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Closing time (e.g. 18:00)"
        value={closeTime}
        onChangeText={setCloseTime}
      />

      {location && (
        <Text style={styles.locationText}>
          📍 Location captured: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={handlePublish}>
        <Text style={styles.buttonText}>Publish Surplus</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32', marginBottom: 24 },
  imageButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 16, backgroundColor: '#f9f9f9' },
  imageButtonText: { fontSize: 16, color: '#999' },
  image: { width: '100%', height: '100%', borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  locationText: { color: '#666', fontSize: 13, marginBottom: 16 },
  button: { backgroundColor: '#2e7d32', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});