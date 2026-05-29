import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';

export default function ProfileScreen() {
  const { userName, role, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/landing');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>
        <Text style={styles.userName}>{userName ?? 'Usuario'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{role ?? 'Sin rol'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  backBtn: { width: 60 },
  backText: { fontSize: 13, color: colors.textMuted },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  profileCard: { alignItems: 'center', padding: 40, gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 36 },
  userName: { fontSize: 20, fontWeight: '600', color: colors.text },
  roleBadge: { backgroundColor: colors.greenLight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  roleBadgeText: { fontSize: 13, fontWeight: '500', color: colors.greenDark },
  logoutBtn: { marginHorizontal: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#D95C5C', alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '500', color: '#D95C5C' },
});
