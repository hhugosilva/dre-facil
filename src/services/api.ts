import axios from 'axios';
import { getToken, clearToken } from '../utils/storage';

const BASE = 'https://dre-backend-v2-production.up.railway.app';
export const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use(async config => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(r => r, async err => {
  if (err.response?.status === 401) await clearToken();
  return Promise.reject(err);
});

// Auth
export const loginApi         = (email: string, senha: string) => api.post('/api/auth/login', { email, senha });
export const registerApi      = (nome: string, email: string, senha: string, nome_empresa?: string) => api.post('/api/auth/register', { nome, email, senha, ...(nome_empresa ? { nome_empresa } : {}) });
export const meApi            = () => api.get('/api/auth/me');
export const updateProfileApi = (data: { nome: string; nome_empresa?: string; cnpj?: string; senha_atual?: string; nova_senha?: string }) =>
  api.put('/api/auth/profile', data);
export const googleAuthApi    = (accessToken: string) => api.post('/api/auth/google', { accessToken });

// Histórico
export const listDREApi  = () => api.get('/api/dre/list');
export const saveDREApi  = (data: any) => api.post('/api/dre/save', data);
export const getDREApi   = (mesKey: string) => api.get(`/api/dre/${mesKey}`);
export const deleteDREApi = (mesKey: string) => api.delete(`/api/dre/${mesKey}`);

// Config
export const getConfigApi  = () => api.get('/api/config');
export const saveConfigApi = (data: any) => api.put('/api/config', data);

// AI
export const classifyApi = (transactions: any[], rules: any[], fornConfig: any[]) =>
  api.post('/api/ai/classify', { transactions, rules, fornConfig });

export const parseExtractApi = (lines: string[], bankHint?: string) =>
  api.post('/api/ai/parse-extract', { lines, bankHint });
