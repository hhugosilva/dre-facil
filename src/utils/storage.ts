import AsyncStorage from '@react-native-async-storage/async-storage';

export const getToken = () => AsyncStorage.getItem('dreToken');
export const setToken = (t: string) => AsyncStorage.setItem('dreToken', t);
export const clearToken = () => AsyncStorage.removeItem('dreToken');

export const getMemory = async (userId: number | string): Promise<Record<string, string>> => {
  try { const s = await AsyncStorage.getItem(`dreMemory_${userId}`); return s ? JSON.parse(s) : {}; } catch { return {}; }
};
export const saveMemory = (userId: number | string, m: Record<string, string>) =>
  AsyncStorage.setItem(`dreMemory_${userId}`, JSON.stringify(m));
export const clearMemory = (userId: number | string) =>
  AsyncStorage.removeItem(`dreMemory_${userId}`);
export const memKey = (desc: string) => desc.trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 60);

export type PrevYearEntry = { receita: number; lucro?: number };
export type PrevYearData  = { year: number; months: Record<string, PrevYearEntry> };

export const getPrevYear = async (userId: number | string): Promise<PrevYearData | null> => {
  try { const s = await AsyncStorage.getItem(`drePrevYear_${userId}`); return s ? JSON.parse(s) : null; } catch { return null; }
};
export const savePrevYear = (userId: number | string, d: PrevYearData) =>
  AsyncStorage.setItem(`drePrevYear_${userId}`, JSON.stringify(d));
