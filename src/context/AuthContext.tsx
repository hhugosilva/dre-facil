import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken, clearToken } from '../utils/storage';
import { loginApi, meApi, registerApi, updateProfileApi } from '../services/api';

export type User = {
  id: number;
  nome: string;
  email: string;
  nome_empresa?: string | null;
  cnpj?: string | null;
};

type UpdateProfileParams = {
  nome: string;
  nome_empresa?: string;
  cnpj?: string;
  senha_atual?: string;
  nova_senha?: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string, empresa?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (params: UpdateProfileParams) => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const { data } = await meApi();
          setUser(data.user || data);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, senha: string) => {
    const { data } = await loginApi(email, senha);
    await setToken(data.token);
    setUser(data.user);
  };

  const register = async (nome: string, email: string, senha: string, empresa?: string) => {
    const { data } = await registerApi(nome, email, senha, empresa);
    await setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  const updateProfile = async (params: UpdateProfileParams) => {
    const { data } = await updateProfileApi(params);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
