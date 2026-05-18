import AsyncStorage from '@react-native-async-storage/async-storage';

export const getToken = () => AsyncStorage.getItem('dreToken');
export const setToken = (t: string) => AsyncStorage.setItem('dreToken', t);
export const clearToken = () => AsyncStorage.removeItem('dreToken');

export const getMemory = async (): Promise<Record<string, string>> => {
  try { const s = await AsyncStorage.getItem('dreMemory'); return s ? JSON.parse(s) : {}; } catch { return {}; }
};
export const saveMemory = (m: Record<string, string>) => AsyncStorage.setItem('dreMemory', JSON.stringify(m));
export const clearMemory = () => AsyncStorage.removeItem('dreMemory');
export const memKey = (desc: string) => desc.trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 60);

export type PrevYearEntry = { receita: number; lucro?: number };
export type PrevYearData  = { year: number; months: Record<string, PrevYearEntry> };

export const getPrevYear = async (): Promise<PrevYearData | null> => {
  try { const s = await AsyncStorage.getItem('drePrevYear'); return s ? JSON.parse(s) : null; } catch { return null; }
};
export const savePrevYear = (d: PrevYearData) => AsyncStorage.setItem('drePrevYear', JSON.stringify(d));
