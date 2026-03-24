'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, User, Organization, Client } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  client: Client | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; organization_name: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      authApi.me(storedToken)
        .then((data) => {
          setUser(data.user);
          setOrganization(data.organization);
          setClient(data.client || null);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setOrganization(data.organization);
    setClient(data.client || null);
  };

  const register = async (data: { email: string; password: string; name: string; organization_name: string }) => {
    const result = await authApi.register(data);
    localStorage.setItem('token', result.access_token);
    setToken(result.access_token);
    setUser(result.user);
    setOrganization(result.organization);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setOrganization(null);
    setClient(null);
  };

  return (
    <AuthContext.Provider value={{ user, organization, client, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
