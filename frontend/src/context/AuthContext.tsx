import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { registerForPushNotifications } from '../services/pushNotifications';

export type UserRole = 'DONOR' | 'BENEFICIARY' | 'CHARITY' | 'ADMIN' | null;

interface AuthContextType {
  token: string | null;
  role: UserRole;
  user: any | null;
  isLoading: boolean;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loginAsTestUser: (preset: TestUserPreset) => Promise<void>;
}

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
  const [token, setToken]         = useState<string | null>(null);
  const [role, setRole]           = useState<UserRole>(null);
  const [user, setUser]           = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        const savedUser  = await AsyncStorage.getItem('user');
        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);
          setRole(parsedUser.role ?? null);
        }
      } catch (e) {
        console.error('Error restaurando sesión:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    setRole(userData.role ?? null);
    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    // Register push token after login (fire-and-forget, errors logged not thrown)
    registerForPushNotifications().catch((err) => {
      console.warn('[Auth] Push registration error:', err?.message);
    });
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setRole(null);
    await AsyncStorage.multiRemove(['token', 'user']);
  };

  const loginAsTestUser = async (preset: TestUserPreset) => {
    const { email, role: presetRole } = TEST_USERS[preset];
    try {
      const res = await api.post('/auth/login', { email, password: TEST_PASSWORD });
      const { access_token, user: userData } = res.data.data;
      await login(access_token, userData ?? { role: presetRole, name: TEST_USERS[preset].label });
    } catch (e: any) {
      console.warn('[DEV] Test login fallback – backend offline?', e?.message);
      await login('dev_bypass_token', { role: presetRole, name: TEST_USERS[preset].label });
    }
  };

  return (
    <AuthContext.Provider value={{ token, role, user, isLoading, login, logout, loginAsTestUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
