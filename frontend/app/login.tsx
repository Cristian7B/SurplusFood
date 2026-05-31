import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const api = (await import('../src/services/api')).default;
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user } = res.data.data;
      login(access_token, user);
      router.replace('/home');
    } catch {
      Alert.alert('Error', 'Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <View style={styles.logoDot}><Text style={{ fontSize: 16 }}>🌿</Text></View>
            <Text style={styles.logoText}>SurplusFood</Text>
          </View>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenido de nuevo</Text>
          <Text style={styles.cardSub}>Inicia sesión en tu cuenta</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnPrimaryText}>Iniciar sesión</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/register')}>
            <Text style={styles.btnSecondaryText}>Crear una cuenta</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.cream },
  content: { flexGrow: 1, padding: 20, paddingTop: 52, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { padding: 4 },
  backText: { fontSize: 13, color: colors.textMuted },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 15, fontWeight: '600', color: colors.text },
  card: { backgroundColor: colors.cream2, borderRadius: 16, padding: 24, borderWidth: 0.5, borderColor: colors.border },
  cardTitle: { fontSize: 22, fontWeight: '500', color: colors.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginBottom: 6, letterSpacing: 0.3 },
  input: { backgroundColor: colors.cream, borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 13, fontSize: 14, color: colors.text },
  btnPrimary: { backgroundColor: colors.green, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: colors.white, fontSize: 15, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textMuted },
  btnSecondary: { borderWidth: 0.5, borderColor: colors.green, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnSecondaryText: { color: colors.greenDark, fontSize: 15, fontWeight: '500' },
});
