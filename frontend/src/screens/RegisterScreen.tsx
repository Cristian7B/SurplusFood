import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { register as registerService } from '../services/auth.service';

type AccountType = 'donor' | 'beneficiary' | null;

export default function RegisterScreen({ navigation }: any) {
  const { login } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (!accountType) return;
    setStep(2);
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Faltan datos', 'Por favor completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña muy corta', 'Debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const role = accountType === 'donor' ? 'DONOR' : 'BENEFICIARY';
      const data = await registerService(email, password, name, role);
      // data = { access_token: string, user: { id, name, email, role } }
      await login(data.access_token, data.user);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'No se pudo crear la cuenta. Intenta de nuevo.';
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.bg}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} bounces={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
          >
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <View style={styles.logoDot}>
              <Text style={{ fontSize: 16 }}>🌿</Text>
            </View>
            <Text style={styles.logoText}>SurplusFood</Text>
          </View>
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepActive]} />
          <View style={[styles.stepLine, step === 2 && styles.stepLineDone]} />
          <View style={[styles.stepDot, step === 2 && styles.stepActive]} />
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.cardTitle}>¿Cómo vas a usar SurplusFood?</Text>
              <Text style={styles.cardSub}>Elige el tipo de cuenta que mejor te describe</Text>

              <TouchableOpacity
                style={[styles.typeCard, accountType === 'donor' && styles.typeCardSelected]}
                onPress={() => setAccountType('donor')}
              >
                <Text style={styles.typeIcon}>🏪</Text>
                <View style={styles.typeText}>
                  <Text style={styles.typeTitle}>Soy donante</Text>
                  <Text style={styles.typeSub}>Cafetería, restaurante o negocio que quiere donar surplus</Text>
                </View>
                <View style={[styles.typeRadio, accountType === 'donor' && styles.typeRadioSelected]}>
                  {accountType === 'donor' && <View style={styles.typeRadioDot} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeCard, accountType === 'beneficiary' && styles.typeCardSelected]}
                onPress={() => setAccountType('beneficiary')}
              >
                <Text style={styles.typeIcon}>🤝</Text>
                <View style={styles.typeText}>
                  <Text style={styles.typeTitle}>Soy beneficiario</Text>
                  <Text style={styles.typeSub}>Persona o organización que quiere recibir alimentos</Text>
                </View>
                <View style={[styles.typeRadio, accountType === 'beneficiary' && styles.typeRadioSelected]}>
                  {accountType === 'beneficiary' && <View style={styles.typeRadioDot} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, !accountType && styles.btnDisabled]}
                onPress={handleNext}
                disabled={!accountType}
              >
                <Text style={styles.btnPrimaryText}>Continuar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.btnSecondaryText}>¿Ya tienes cuenta? Inicia sesión</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Crea tu cuenta</Text>
              <Text style={styles.cardSub}>
                {accountType === 'donor' ? '🏪 Cuenta donante' : '🤝 Cuenta beneficiario'}
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

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

              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.cream },
  content: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { padding: 4 },
  backText: { fontSize: 13, color: colors.textMuted },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 15, fontWeight: '600', color: colors.text },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 8 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  stepActive: { backgroundColor: colors.green },
  stepLine: { flex: 1, height: 1.5, backgroundColor: colors.border, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: colors.green },
  card: { backgroundColor: colors.cream2, borderRadius: 16, padding: 28, borderWidth: 0.5, borderColor: colors.border, gap: 14 },
  cardTitle: { fontSize: 22, fontWeight: '500', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: -8 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 12, padding: 16, backgroundColor: colors.cream,
  },
  typeCardSelected: { borderColor: colors.green, backgroundColor: colors.greenLight },
  typeIcon: { fontSize: 28 },
  typeText: { flex: 1 },
  typeTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  typeSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  typeRadioSelected: { borderColor: colors.green },
  typeRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '500', color: colors.textMuted, letterSpacing: 0.3 },
  input: { backgroundColor: colors.cream, borderWidth: 0.5, borderColor: colors.border, borderRadius: 10, padding: 13, fontSize: 14, color: colors.text },
  btnPrimary: { backgroundColor: colors.green, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: colors.white, fontSize: 15, fontWeight: '500' },
  btnSecondary: { borderWidth: 0.5, borderColor: colors.green, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnSecondaryText: { color: colors.greenDark, fontSize: 15, fontWeight: '500' },
});
