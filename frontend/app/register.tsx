import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';

const ROLES = [
  { key: 'DONOR',       label: '🍽️ Donante',       desc: 'Publico excedentes de comida' },
  { key: 'BENEFICIARY', label: '🤝 Beneficiario',   desc: 'Accedo a alimentos disponibles' },
  { key: 'CHARITY',     label: '❤️ Fundación',      desc: 'Organización de ayuda social' },
];

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('BENEFICIARY');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Campos requeridos', 'Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      // TODO: the auth developer connects this to the real API
      const api = (await import('../src/services/api')).default;
      const res = await api.post('/auth/register', { name, email, password, role: selectedRole });
      const { access_token, user } = res.data;
      login(access_token, user?.role ?? selectedRole as any, name);
      router.replace('/home');
    } catch {
      Alert.alert('Error', 'No se pudo crear la cuenta. El correo puede estar en uso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <View style={styles.logoDot}><Text style={{ fontSize: 16 }}>🌿</Text></View>
            <Text style={styles.logoText}>SurplusFood</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crear cuenta</Text>
          <Text style={styles.cardSub}>Únete a la comunidad SurplusFood</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor={colors.textMuted}
              value={name} onChangeText={setName} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput style={styles.input} placeholder="tu@correo.com" placeholderTextColor={colors.textMuted}
              value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput style={styles.input} placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.textMuted}
              value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Soy...</Text>
            <View style={styles.roleGrid}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleBtn, selectedRole === r.key && styles.roleBtnActive]}
                  onPress={() => setSelectedRole(r.key)}
                >
                  <Text style={styles.roleLabel}>{r.label}</Text>
                  <Text style={[styles.roleDesc, selectedRole === r.key && styles.roleDescActive]}>{r.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnPrimaryText}>Crear cuenta</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/login')}>
            <Text style={styles.btnSecondaryText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.cream },
  content: { flexGrow: 1, padding: 20, paddingTop: 52, gap: 20, paddingBottom: 40 },
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
  roleGrid: { gap: 8 },
  roleBtn: {
    borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 14, backgroundColor: colors.cream,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  roleBtnActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  roleLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  roleDesc: { fontSize: 12, color: colors.textMuted },
  roleDescActive: { color: colors.greenDark },
  btnPrimary: { backgroundColor: colors.green, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: colors.white, fontSize: 15, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textMuted },
  btnSecondary: { borderWidth: 0.5, borderColor: colors.green, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnSecondaryText: { color: colors.greenDark, fontSize: 15, fontWeight: '500' },
});
