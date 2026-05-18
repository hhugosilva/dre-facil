import * as FileSystem from 'expo-file-system/legacy';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseExtractApi } from '../services/api';

export type Transaction = {
  data: string;
  descricao: string;
  valor: number;
};

// ─── Conhecimento de colunas por campo ───────────────────────────────────────
const FH: Record<string, string[]> = {
  data:      ['release_date','data lancamento','data lançamento','data','date','dt','vencto','movimento','posting date','data pagamento','data mov','data movimentacao'],
  descricao: ['transaction_type','titulo','título','descricao','descrição','desc','memo','historico','histórico','estabelecimento','lancamento','lançamento','transaction','merchant','comercio','complemento','detalhes'],
  entrada:   ['entrada','credito','crédito','credit','cr','valor entrada','vlr entrada'],
  saida:     ['saida','saída','debito','débito','debit','dr','valor saida','vlr saida'],
  valor:     ['transaction_net_amount','valor','value','amount','montante','vlr','movimentacao','movimentação','valor mov'],
  tipo:      ['tipo','tipo lancamento','tipo lançamento','dc','d/c','natureza','c/d'],
};

const DEBIT_DESC = /pix enviado|pix pago|ted enviada|doc enviado|transferencia enviada|pagamento efetuado|debito automatico|saque|tarifa/i;

function ns(s: string): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function gc(cols: string[], field: string): string | null {
  const hints = FH[field] || [];
  return (
    cols.find(c => hints.includes(ns(c))) ||
    cols.find(c => hints.some(h => h.length > 3 && ns(c).includes(h))) ||
    null
  );
}

export function parseVal(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  let s = String(raw).trim().replace(/[R$\s ]/g, '');
  if (!s || s === '-') return 0;
  const neg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'));
  s = s.replace(/^-/, '').replace(/^\((.+)\)$/, '$1');
  const ld = s.lastIndexOf('.'), lc = s.lastIndexOf(',');
  if (ld >= 0 && lc >= 0) {
    s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lc >= 0) {
    s = s.slice(lc + 1).length <= 2 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  }
  const val = parseFloat(s) || 0;
  return neg ? -val : val;
}

function splitCSVLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === sep && !inQ) { fields.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  fields.push(cur.trim());
  return fields;
}

// ─── Mapear linhas usando mapeamento de colunas ──────────────────────────────
function applyColumnMap(
  rows: any[],
  colMap: { data: string | null; descricao: string; valor: string | null; entrada: string | null; saida: string | null; tipo: string | null }
): Transaction[] {
  return rows.map(r => {
    const desc = String(r[colMap.descricao] || '').trim();
    if (!desc) return null;
    let valor: number;
    if (colMap.entrada || colMap.saida) {
      const ent = parseVal(colMap.entrada ? r[colMap.entrada] : 0);
      const sai = parseVal(colMap.saida ? r[colMap.saida] : 0);
      if (ent === 0 && sai === 0) return null;
      valor = ent > 0 ? ent : -sai;
    } else if (colMap.valor) {
      valor = parseVal(r[colMap.valor]);
      if (valor === 0) return null;
      if (colMap.tipo) {
        const t = ns(String(r[colMap.tipo] || ''));
        if (/^(d\b|deb|debito|saida|debit)/.test(t) && valor > 0) valor = -valor;
        else if (/^(c\b|cr\b|cred|credito|entrada|credit)/.test(t) && valor < 0) valor = Math.abs(valor);
      } else if (valor > 0 && DEBIT_DESC.test(desc)) {
        valor = -valor;
      }
    } else return null;
    return { data: colMap.data ? String(r[colMap.data] || '') : '', descricao: desc, valor };
  }).filter(Boolean) as Transaction[];
}

// ─── Auto-detectar mapeamento de colunas ─────────────────────────────────────
function autoDetectColMap(cols: string[]) {
  return {
    data:      gc(cols, 'data'),
    descricao: gc(cols, 'descricao') || cols[0],
    valor:     !gc(cols, 'entrada') && !gc(cols, 'saida') ? gc(cols, 'valor') : null,
    entrada:   gc(cols, 'entrada'),
    saida:     gc(cols, 'saida'),
    tipo:      gc(cols, 'tipo'),
  };
}

// ─── Cache de formatos por banco ─────────────────────────────────────────────
const CACHE_KEY = 'dreBankFormats';

async function getCachedFormat(bankId: string): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    return cache[bankId] || null;
  } catch { return null; }
}

async function saveCachedFormat(bankId: string, fmt: any) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[bankId] = fmt;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// ─── Parse XLSX ──────────────────────────────────────────────────────────────
export async function parseXLSX(uri: string, bankId = 'auto'): Promise<Transaction[]> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const wb = xlsxRead(b64, { type: 'base64', raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

  // Find header row
  let hr = 0, best = -1;
  for (let i = 0; i < Math.min(20, allRows.length); i++) {
    const hdrs = allRows[i].map((h: any) => String(h || '').trim());
    const tc = hdrs.filter((s: string) => s && s.length >= 2 && isNaN(Number(s.replace(/[.,]/g, ''))));
    if (tc.length >= 2) {
      const score = Object.values(FH).reduce((n, a) => n + (a.some(x => hdrs.some((h: string) => ns(h) === ns(x) || ns(h).includes(ns(x)))) ? 1 : 0), 0);
      if (score > best) { best = score; hr = i; }
    }
  }

  const hdrs = allRows[hr].map((h: any) => String(h || '').trim());
  const rows = allRows.slice(hr + 1)
    .filter((r: any[]) => r.some((c: any) => String(c || '').trim()))
    .map((r: any[]) => {
      const o: any = {};
      hdrs.forEach((h: string, i: number) => { if (h) o[h] = r[i] !== undefined ? String(r[i]) : ''; });
      return o;
    })
    .filter((r: any) => Object.keys(r).length > 1);

  const colMap = autoDetectColMap(hdrs);
  const txs = applyColumnMap(rows, colMap as any);

  if (txs.length > 0) return txs;

  // AI fallback
  return parseWithAI(allRows.slice(0, 30).map(r => r.join('\t')), bankId, rows, hdrs);
}

// ─── Parse CSV ───────────────────────────────────────────────────────────────
export async function parseCSV(uri: string, bankId: string): Promise<Transaction[]> {
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  // Detect separator
  const sep = (lines.slice(0, 5).filter(l => l.includes(';')).length >= lines.slice(0, 5).filter(l => l.includes(',')).length) ? ';' : ',';

  // Find header row
  let hi = 0;
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const cols = splitCSVLine(lines[i], sep).filter(c => c.trim());
    if (cols.length >= 3) {
      const hdrs = cols.map(c => c.replace(/"/g, '').trim());
      const score = Object.values(FH).reduce((n, a) => n + (a.some(x => hdrs.some(h => ns(h) === ns(x) || ns(h).includes(ns(x)))) ? 1 : 0), 0);
      if (score >= 2) { hi = i; break; }
    }
  }

  const headers = splitCSVLine(lines[hi] || '', sep).map(h => h.replace(/"/g, '').trim());
  const rows = lines.slice(hi + 1).filter(l => l.trim()).map(line => {
    const vals = splitCSVLine(line, sep);
    const o: any = {};
    headers.forEach((h, i) => { if (h) o[h] = (vals[i] || '').replace(/"/g, '').trim(); });
    return o;
  });

  const colMap = autoDetectColMap(headers);
  if (colMap.descricao && (colMap.valor || colMap.entrada || colMap.saida)) {
    const txs = applyColumnMap(rows, colMap as any);
    if (txs.length > 0) return txs;
  }

  // AI fallback — manda as primeiras linhas para a IA identificar o formato
  return parseWithAI(lines, bankId, rows, headers);
}

// ─── IA como fallback para identificar formato ───────────────────────────────
async function parseWithAI(
  rawLines: string[],
  bankId: string,
  rows: any[],
  headers: string[]
): Promise<Transaction[]> {
  // Verifica cache primeiro
  const cached = await getCachedFormat(bankId !== 'auto' ? bankId : headers.join('|'));
  if (cached) {
    const txs = applyColumnMap(rows, cached);
    if (txs.length > 0) return txs;
  }

  try {
    const { data } = await parseExtractApi(rawLines.slice(0, 30), bankId);

    if (!data?.colunas?.descricao) throw new Error('IA não identificou as colunas');

    const colMap = {
      data:      data.colunas.data || null,
      descricao: data.colunas.descricao,
      valor:     data.colunas.valor || null,
      entrada:   data.colunas.entrada || null,
      saida:     data.colunas.saida || null,
      tipo:      data.colunas.tipo || null,
    };

    // Salva no cache para próximas vezes
    const cacheKey = bankId !== 'auto' ? bankId : headers.join('|');
    await saveCachedFormat(cacheKey, colMap);

    const txs = applyColumnMap(rows, colMap);
    if (txs.length > 0) return txs;
  } catch {}

  throw new Error(
    `Formato do extrato não reconhecido. Tente selecionar o banco manualmente.\nColunas encontradas: ${headers.slice(0, 6).join(', ')}`
  );
}

// ─── Detectar banco pelos headers do arquivo ──────────────────────────────────
function detectBankFromText(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('nubank') || (t.includes('"title"') && t.includes('"amount"'))) return 'nubank';
  if (t.includes('mercado pago') || t.includes('mercadopago') || t.includes('mp_')) return 'mercadopago';
  if ((t.includes('inter') && (t.includes('historico') || t.includes('histórico')))) return 'inter';
  if (t.includes('itau') || t.includes('itaú') || t.includes('lançamento') && t.includes('ag.')) return 'itau';
  if (t.includes('bradesco')) return 'bradesco';
  if (t.includes('santander')) return 'santander';
  if (t.includes('c6bank') || (t.includes('c6') && t.includes('saldo'))) return 'c6';
  if (t.includes('sicoob')) return 'sicoob';
  return 'auto';
}

export async function detectBank(uri: string, name: string): Promise<string> {
  const lower = name.toLowerCase();
  try {
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const wb = xlsxRead(b64, { type: 'base64', raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      const headerText = rows.slice(0, 10).map((r: any[]) => r.join(' ')).join(' ');
      return detectBankFromText(headerText);
    } else {
      const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      return detectBankFromText(text.slice(0, 2000));
    }
  } catch { return 'auto'; }
}

// ─── Entrada principal ────────────────────────────────────────────────────────
export async function parseFile(uri: string, name: string, bankId: string): Promise<Transaction[]> {
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return parseXLSX(uri, bankId);
  return parseCSV(uri, bankId);
}

// ─── Detectar transferências entre contas ────────────────────────────────────
export function detectTransfersMulti(slotResults: { slotId: number; txs: Transaction[] }[]): Set<string> {
  const marked = new Set<string>();
  for (let a = 0; a < slotResults.length; a++) {
    for (let b = a + 1; b < slotResults.length; b++) {
      slotResults[a].txs.forEach((ta, i) => {
        slotResults[b].txs.forEach((tb, j) => {
          const keyA = `${slotResults[a].slotId}_${i}`;
          const keyB = `${slotResults[b].slotId}_${j}`;
          if (marked.has(keyA) || marked.has(keyB)) return;
          if (
            Math.abs(Math.abs(ta.valor) - Math.abs(tb.valor)) < 0.02 &&
            ((ta.valor > 0 && tb.valor < 0) || (ta.valor < 0 && tb.valor > 0))
          ) {
            marked.add(keyA);
            marked.add(keyB);
          }
        });
      });
    }
  }
  return marked;
}
