import React, { createContext, useContext, useState, useCallback } from 'react';
import { DEFAULT_CATS, Category } from '../theme';
import { memKey } from '../utils/storage';
import { listDREApi, getConfigApi, saveConfigApi } from '../services/api';

export type AllTx = {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  source: string;
  categoria: string;
  empresa: boolean;
  isTransfer: boolean;
  hash: string;
};

export type HistEntry = {
  mes_key: string;
  period: string;
  receita: number;
  total_custo: number;
  lucro: number;
  custos?: Record<string, number>;
  by_forn_raw?: Record<string, number>;
  saved_at?: string;
};

export type Rule = { keyword: string; category: string };
export type Forn = { nome: string; kws: string[]; color: string };

type AppCtx = {
  hist: HistEntry[];
  cats: Category[];
  rules: Rule[];
  forns: Forn[];
  allTx: AllTx[];
  setAllTx: (txs: AllTx[]) => void;
  loadData: () => Promise<void>;
  saveConfig: (cats: Category[], rules: Rule[], forns: Forn[]) => Promise<void>;
  setCats: (c: Category[]) => void;
  setRules: (r: Rule[]) => void;
  setForns: (f: Forn[]) => void;
  applyRules: (desc: string) => string | null;
};

const AppContext = createContext<AppCtx>({} as AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [cats, setCats] = useState<Category[]>(DEFAULT_CATS);
  const [rules, setRules] = useState<Rule[]>([]);
  const [forns, setForns] = useState<Forn[]>([]);
  const [allTx, setAllTx] = useState<AllTx[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [hRes, cRes] = await Promise.all([listDREApi(), getConfigApi()]);
      setHist(hRes.data.list || []);
      const cfg = cRes.data.config || {};
      if (cfg.categories?.length) setCats(cfg.categories);
      if (cfg.rules) {
        const rArr = Array.isArray(cfg.rules)
          ? cfg.rules
          : Object.entries(cfg.rules).map(([keyword, category]) => ({ keyword, category: category as string }));
        setRules(rArr);
      }
      if (cfg.fornecedores) setForns(cfg.fornecedores);
    } catch {}
  }, []);

  const saveConfig = async (c: Category[], r: Rule[], f: Forn[]) => {
    setCats(c); setRules(r); setForns(f);
    await saveConfigApi({ categories: c, rules: r, fornecedores: f });
  };

  const applyRules = (desc: string): string | null => {
    const up = desc.toUpperCase();
    for (const r of rules) {
      if (up.includes(r.keyword.toUpperCase())) return r.category;
    }
    return null;
  };

  return (
    <AppContext.Provider value={{ hist, cats, rules, forns, allTx, setAllTx, loadData, saveConfig, setCats, setRules, setForns, applyRules }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
