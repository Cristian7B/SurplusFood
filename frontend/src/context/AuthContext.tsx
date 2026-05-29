import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export type UserRole = 'DONOR' | 'BENEFICIARY' | 'CHARITY' | 'ADMIN' | null;

interface AuthContextType {
  token: string | null;
  role: UserRole;
  userName: string | null;
  login: (token: string, role: UserRole, name?: string) => void;
  logout: () => void;
  /** Quick-login with seeded test credentials for development bypassing */
  loginAsTestUser: (preset: TestUserPreset) => Promise<void>;
}

// Seeded test users (matching prisma/seed.ts)
export type TestUserPreset =
  | 'donor1'
  | 'donor2'
  | 'beneficiary1'
  | 'beneficiary2'
  | 'charity1';

export const TEST_USERS: Record<TestUserPreset, { email: string; label: string; role: UserRole }> = {
  donor1:       { email: 'donor1@foodbridge.com',       label: '🍽️ Donante 1 (Restaurante)', role: 'DONOR' },
  donor2:       { email: 'donor2@foodbridge.com',       label: '🥐 Donante 2 (Panadería)',   role: 'DONOR' },
  beneficiary1: { email: 'beneficiary1@foodbridge.com', label: '🎓 Beneficiario 1',           role: 'BENEFICIARY' },
  beneficiary2: { email: 'beneficiary2@foodbridge.com', label: '🏘️ Beneficiario 2',           role: 'BENEFICIARY' },
  charity1:     { email: 'charity1@foodbridge.com',     label: '❤️ Fundación (Caridad)',      role: 'CHARITY' },
};

const TEST_PASSWORD = 'password123';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const login = (newToken: string, newRole: UserRole, name?: string) => {
    setToken(newToken);
    setRole(newRole);
    setUserName(name ?? null);
    AsyncStorage.setItem('token', newToken);
    if (newRole) AsyncStorage.setItem('role', newRole);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUserName(null);
    AsyncStorage.multiRemove(['token', 'role']);
  };

  /**
   * DEV BYPASS: logs in using a seeded test user so devs can test
   * maps and features without manually registering.
   * The other developer can replace this with real auth later.
   */
  const loginAsTestUser = async (preset: TestUserPreset) => {
    const { email, role: presetRole } = TEST_USERS[preset];
    try {
      const res = await api.post('/auth/login', { email, password: TEST_PASSWORD });
      const { access_token } = res.data;
      login(access_token, presetRole, TEST_USERS[preset].label);
    } catch (e: any) {
      console.warn('[DEV] Test login failed – backend offline?', e?.message);
      // Fallback: set a dummy token so the UI is navigable even offline
      login('dev_bypass_token', presetRole, TEST_USERS[preset].label);
    }
  };

  return (
    <AuthContext.Provider value={{ token, role, userName, login, logout, loginAsTestUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);