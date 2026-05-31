import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';

interface UserStats {
  id: string;
  name: string;
  email: string;
  role: string;
  reliabilityScore: number;
  noShowCount: number;
  isVerifiedCharity: boolean;
}

interface AssignedSurplus {
  id: string;
  title: string;
  foodType: string;
  quantityKg: number;
  status: string;
  pickupStartAt: string;
  pickupEndAt: string;
  expirationAt: string;
  donor: { name: string; email: string };
}

const FOOD_EMOJI: Record<string, string> = {
  cooked: '🍚', bakery: '🥐', produce: '🥦', packaged: '📦', other: '🍽️',
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  ASSIGNED:  { label: 'Pendiente',  color: '#795548', bg: '#FFF8E1' },
  PICKED_UP: { label: 'Recogido',   color: '#2E7D32', bg: '#E8F5E9' },
  EXPIRED:   { label: 'Expirado',   color: '#9E9E9E', bg: '#F5F5F5' },
  PUBLISHED: { label: 'Publicado',  color: '#1565C0', bg: '#E3F2FD' },
};

function ReliabilityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? colors.green : pct >= 50 ? '#FFC107' : '#EF5350';
  return (
    <View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barLabel, { color }]}>{pct}%</Text>
    </View>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function DashboardScreen() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [assignment, setAssignment] = useState<AssignedSurplus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [meRes, assignRes] = await Promise.all([
        api.get('/users/me'),
        (role === 'BENEFICIARY' || role === 'CHARITY')
          ? api.get('/surplus/my-assignment').catch(() => null)
          : Promise.resolve(null),
      ]);

      const meData = meRes.data?.data ?? meRes.data;
      setStats(meData);

      if (assignRes) {
        const payload = assignRes.data?.data ?? null;
        setAssignment(payload?.id ? payload : null);
      }
    } catch (e: any) {
      console.warn('[Dashboard] load error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  const isBeneficiary = role === 'BENEFICIARY' || role === 'CHARITY';
  const isDonor = role === 'DONOR' || role === 'ADMIN';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      >
        {/* Avatar + nombre */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>
              {role === 'DONOR' ? '🍽️' : role === 'CHARITY' ? '❤️' : role === 'ADMIN' ? '⚙️' : '🎓'}
            </Text>
          </View>
          <Text style={styles.userName}>{stats?.name ?? user?.name ?? 'Usuario'}</Text>
          <Text style={styles.userEmail}>{stats?.email ?? ''}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role}</Text>
          </View>
          {stats?.isVerifiedCharity && (
            <View style={[styles.roleBadge, { backgroundColor: '#E8F5E9', marginTop: 4 }]}>
              <Text style={[styles.roleBadgeText, { color: colors.greenDark }]}>✅ Fundación verificada</Text>
            </View>
          )}
        </View>

        {/* Stats grid */}
        {isBeneficiary && stats && (
          <>
            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>⭐</Text>
                <Text style={styles.statLabel}>Confiabilidad</Text>
                <ReliabilityBar score={stats.reliabilityScore} />
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>❌</Text>
                <Text style={styles.statLabel}>No-shows</Text>
                <Text style={[styles.statValue, { color: stats.noShowCount > 0 ? '#EF5350' : colors.greenDark }]}>
                  {stats.noShowCount}
                </Text>
                <Text style={styles.statSub}>de 3 permitidos</Text>
              </View>
            </View>

            {stats.noShowCount >= 2 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Tienes {stats.noShowCount} no-shows. Si llegas a 3 serás excluido del algoritmo de matching por 48 horas.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Asignación activa */}
        {isBeneficiary && (
          <>
            <Text style={styles.sectionTitle}>Asignación activa</Text>
            {assignment ? (
              <TouchableOpacity style={styles.assignmentCard} onPress={() => router.push('/assignment')}>
                <View style={styles.assignmentCardLeft}>
                  <Text style={styles.assignmentEmoji}>{FOOD_EMOJI[assignment.foodType] ?? '🍽️'}</Text>
                </View>
                <View style={styles.assignmentCardBody}>
                  <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                  <Text style={styles.assignmentMeta}>{assignment.quantityKg} kg · {assignment.donor.name}</Text>
                  <Text style={styles.assignmentTime}>
                    Recogida: {formatTime(assignment.pickupStartAt)} – {formatTime(assignment.pickupEndAt)}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: STATUS_LABEL['ASSIGNED'].bg }]}>
                  <Text style={[styles.statusPillText, { color: STATUS_LABEL['ASSIGNED'].color }]}>
                    ⏳ Pendiente
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>Sin asignación activa · El algoritmo te notificará cuando haya un surplus para ti</Text>
              </View>
            )}
          </>
        )}

        {/* Accesos rápidos */}
        <Text style={styles.sectionTitle}>Accesos rápidos</Text>
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/home')}>
            <Text style={styles.quickLinkEmoji}>🗺️</Text>
            <Text style={styles.quickLinkText}>Mapa</Text>
          </TouchableOpacity>

          {isBeneficiary && (
            <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/history')}>
              <Text style={styles.quickLinkEmoji}>📋</Text>
              <Text style={styles.quickLinkText}>Historial</Text>
            </TouchableOpacity>
          )}

          {isDonor && (
            <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/publish-surplus')}>
              <Text style={styles.quickLinkEmoji}>➕</Text>
              <Text style={styles.quickLinkText}>Publicar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/profile')}>
            <Text style={styles.quickLinkEmoji}>⚙️</Text>
            <Text style={styles.quickLinkText}>Cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: colors.cream, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  headerBack: { padding: 4, minWidth: 60 },
  headerBackText: { fontSize: 13, color: colors.textMuted },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },

  content: { padding: 20, gap: 16, paddingBottom: 48 },

  avatarCard: {
    backgroundColor: colors.cream2, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 6, borderWidth: 0.5, borderColor: colors.border,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 34 },
  userName: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 4 },
  userEmail: { fontSize: 13, color: colors.textMuted },
  roleBadge: {
    backgroundColor: colors.greenLight, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5, marginTop: 6,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: colors.greenDark },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: colors.cream2, borderRadius: 16, padding: 16,
    gap: 6, borderWidth: 0.5, borderColor: colors.border,
  },
  statEmoji: { fontSize: 24 },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  statValue: { fontSize: 28, fontWeight: '700' },
  statSub: { fontSize: 11, color: colors.textMuted },

  barTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  barLabel: { fontSize: 16, fontWeight: '700', marginTop: 4 },

  warningBox: {
    backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFCC80',
  },
  warningText: { fontSize: 12, color: '#E65100', lineHeight: 18 },

  assignmentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cream2, borderRadius: 14, padding: 16,
    borderWidth: 0.5, borderColor: colors.border,
  },
  assignmentCardLeft: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: colors.greenLight,
    justifyContent: 'center', alignItems: 'center',
  },
  assignmentEmoji: { fontSize: 24 },
  assignmentCardBody: { flex: 1 },
  assignmentTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  assignmentMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  assignmentTime: { fontSize: 12, color: colors.greenDark, marginTop: 2 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  emptyCard: {
    backgroundColor: colors.cream2, borderRadius: 14, padding: 20,
    borderWidth: 0.5, borderColor: colors.border, alignItems: 'center',
  },
  emptyCardText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickLink: {
    flex: 1, minWidth: 80, backgroundColor: colors.cream2, borderRadius: 16,
    padding: 18, alignItems: 'center', gap: 8, borderWidth: 0.5, borderColor: colors.border,
  },
  quickLinkEmoji: { fontSize: 28 },
  quickLinkText: { fontSize: 12, fontWeight: '600', color: colors.text },
});
