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
export const deleteAccountApi = () => api.delete('/api/auth/account');
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
export const classifyApi = (transactions: any[], rules: any[], fornConfig: any[], categories?: any[], businessType?: string | null) =>
  api.post('/api/ai/classify', { transactions, rules, fornConfig, categories, businessType });

export const forgotPasswordApi = (email: string) =>
  api.post('/api/auth/forgot-password', { email });

export const resendVerifyEmailApi = (email: string) =>
  api.post('/api/auth/resend-verify-email', { email });

export const sendRegisterCodeApi = (nome: string, email: string, senha: string, nome_empresa?: string) =>
  api.post('/api/auth/send-register-code', { nome, email, senha, nome_empresa });

export const confirmRegisterCodeApi = (email: string, code: string) =>
  api.post('/api/auth/confirm-register-code', { email, code });

export const resendRegisterCodeApi = (email: string) =>
  api.post('/api/auth/resend-register-code', { email });

export const parseExtractApi = (lines: string[], bankHint?: string) =>
  api.post('/api/ai/parse-extract', { lines, bankHint });

export const parsePDFApi = (base64: string, bankHint?: string) =>
  api.post('/api/ai/parse-pdf', { base64, bankHint }, { timeout: 60000 });

// 2FA
export const toggle2FAApi = (enabled: boolean) => api.put('/api/auth/toggle-2fa', { enabled });
export const verify2FAApi = (userId: number, code: string) => api.post('/api/auth/verify-2fa', { userId, code });

// Onboarding IA
export const suggestCategoriesApi = (description: string) =>
  api.post('/api/ai/suggest-categories', { description });

// Memory
export const patchMemoryApi = (key: string, categoria: string) =>
  api.patch('/api/memory', { key, categoria });
