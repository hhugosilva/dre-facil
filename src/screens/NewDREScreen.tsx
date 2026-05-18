import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, TextInput, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { colors } from '../theme/colors';
import { classifyApi, getConfigApi } from '../services/api';

type Slot = { id: number; file: { name: string; uri: string; mimeType?: string }; bankId: string; bankName: string };
type Transaction = { data: string; descricao: string; valor: number };

const BANKS: Record<string, { name: string; color: string }> = {
  auto:        { name: 'Auto-detectar', color: colors.green },
  nubank:      { name: 'Nubank',        color: '#820AD1' },
  mercadopago: { name: 'Mercado Pago',  color: '#009ee3' },
  inter:       { name: 'Banco Inter',   color: '#ff8700' },
  bradesco:    { name: 'Bradesco',      color: '#cc0000' },
  itau:        { name: 'Itaú',          color: '#ec7000' },
  santander:   { name: 'Santander',     color: '#ec0000' },
  c6:          { name: 'C6 Bank',       color: '#1a1a1a' },
  outro:       { name: 'Outro banco',   color: '#555' },
};

const FH: Record<string, string[]> = {
  data:     ['release_date','data lancamento','data lançamento','data','date','dt','vencto','movimento','posting date'],
  descricao:['transaction_type','titulo','título','descricao','descrição','desc','memo','historico','histórico','estabelecimento','lancamento','lançamento','transaction','merchant'],
  valor:    ['transaction_net_amount','valor','value','amount','montante','vlr','movimentacao','movimentação'],
  entrada:  ['entrada','credito','crédito','credit'],
  saida:    ['saida','saída','débito','debito','debit'],
};

function ns(s: string) { return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(); }
function gc(cols: string[], field: string) {
  const hints = FH[field] || [];
  return cols.find(c => hints.includes(ns(c))) || cols.find(c => hints.some(h => h.length>2 && ns(c).includes(h))) || null;
}

function parseVal(raw: any): number {
  if (!raw && raw !== 0) return 0;
  if (typeof raw === 'number') return raw;
  let s = String(raw).trim().replace(/[R$\s ]/g,'');
  if (!s || s === '-') return 0;
  const neg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'));
  s = s.replace(/^-/,'').replace(/^\((.+)\)$/, '$1');
  const ld = s.lastIndexOf('.'), lc = s.lastIndexOf(',');
  if (ld >= 0 && lc >= 0) { s = lc > ld ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,''); }
  else if (lc >= 0) { s = s.slice(lc+1).length <= 2 ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,''); }
  const val = parseFloat(s) || 0;
  return neg ? -val : val;
}

function detectBank(hdrs: string[]): string | null {
  const h = hdrs.map(c => ns(c));
  if (h.includes('release_date') || h.includes('transaction_type') || h.includes('transaction_net_amount')) return 'mercadopago';
  if (h.some(c => c.includes('tipo lancamento') || c.includes('tipo lançamento'))) return 'inter';
  if (h.some(c => c.includes('dependencia') || c.includes('dependência'))) return 'itau';
  return null;
}

function normalizeRows(rows: any[]): Transaction[] {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]).filter(c => String(c).trim());
  const cData = gc(cols,'data'), cDesc = gc(cols,'descricao');
  const cE = gc(cols,'entrada'), cS = gc(cols,'saida');
  const cV = (!cE && !cS) ? gc(cols,'valor') : null;
  if (!cDesc) throw new Error('Coluna de descrição não encontrada. Colunas: ' + cols.join(', '));
  return rows.flatMap(r => {
    const desc = String(r[cDesc!]||'').trim();
    if (!desc) return [];
    let valor: number;
    if (cE || cS) {
      const ent = parseVal(cE ? r[cE] : 0), sai = parseVal(cS ? r[cS] : 0);
      if (ent === 0 && sai === 0) return [];
      valor = ent > 0 ? ent : -sai;
    } else {
      valor = parseVal(r[cV!]);
      if (valor === 0) return [];
    }
    return [{ data: cData ? String(r[cData]||'') : '', descricao: desc, valor }];
  });
}

async function parseXLSX(uri: string): Promise<Transaction[]> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const wb = xlsxRead(b64, { type: 'base64', raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  let hr = 0, best = -1;
  for (let i = 0; i < Math.min(20, allRows.length); i++) {
    const tc = allRows[i].filter((c: any) => { const s = String(c||'').trim(); return s && s.length>=2 && isNaN(Number(s.replace(/[.,]/g,''))) && !/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s); });
    if (tc.length >= 3) {
      const hdrs = allRows[i].map((h: any) => String(h||'').trim());
      const score = Object.values(FH).reduce((n,a) => n + (a.some(x => hdrs.some((h: string) => ns(h)===ns(x)||ns(h).includes(ns(x)))) ? 1 : 0), 0);
      if (score > best) { best = score; hr = i; }
    }
  }
  const hdrs = allRows[hr].map((h: any) => String(h||'').trim());
  const rows = allRows.slice(hr+1).filter((r: any[]) => r.some((c: any) => String(c||'').trim())).map((r: any[]) => {
    const o: any = {}; hdrs.forEach((h: string, i: number) => { if (h) o[h] = r[i]!==undefined ? String(r[i]) : ''; }); return o;
  }).filter((r: any) => Object.keys(r).length > 1);
  return normalizeRows(rows);
}

async function parseCSV(uri: string, bankId: string): Promise<Transaction[]> {
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sep = lines[0]?.includes(';') ? ';' : ',';
  let hi = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].split(sep).filter(c => c.trim()).length >= 3) { hi = i; break; }
  }
  const headers = lines[hi].split(sep).map(h => h.replace(/"/g,'').trim());

  // Nubank specific
  if (bankId === 'nubank' || (headers.some(h=>ns(h)==='data') && headers.some(h=>ns(h)==='valor') && headers.some(h=>ns(h).includes('descri')))) {
    const iD = headers.findIndex(h=>ns(h)==='data');
    const iV = headers.findIndex(h=>ns(h)==='valor');
    const iDesc = headers.findIndex(h=>ns(h).includes('descri'));
    return lines.slice(hi+1).filter(l=>l.trim()).flatMap(line => {
      const vals = line.split(sep).map(v=>v.replace(/"/g,'').trim());
      const valor = parseVal(vals[iV]); if (valor===0) return [];
      return [{ data: vals[iD]||'', descricao: vals[iDesc]||'', valor }];
    });
  }

  const rows = lines.slice(hi+1).filter(l=>l.trim()).map(line => {
    const vals = line.split(sep).map(v=>v.replace(/"/g,'').trim());
    const o: any = {}; headers.forEach((h,i) => { if(h) o[h]=vals[i]||''; }); return o;
  });
  return normalizeRows(rows);
}

export default function NewDREScreen({ navigation }: any) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotCtr, setSlotCtr] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [receita, setReceita] = useState('');
  const [processing, setProcessing] = useState(false);

  const addFile = async (bankId: string) => {
    setShowPicker(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-excel', 'text/csv', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const id = slotCtr; setSlotCtr(c => c+1);
      const name = file.name.toLowerCase();
      let detectedBank = bankId;

      if (bankId === 'auto') {
        try {
          let hdrs: string[] = [];
          if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
            const wb = xlsxRead(b64, {type:'base64',raw:false});
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: any[][] = xlsxUtils.sheet_to_json(ws,{header:1,defval:'',raw:false});
            for (let i=0; i<Math.min(10,rows.length); i++) {
              const h = rows[i].map((c: any) => String(c||'').trim()).filter((h: string) => h && h.length>1);
              if (h.length>=3) { const d = detectBank(h); if (d) { detectedBank=d; break; } }
            }
          } else if (name.endsWith('.csv')) {
            const text = await FileSystem.readAsStringAsync(file.uri, {encoding: FileSystem.EncodingType.UTF8});
            const firstLine = text.split(/\r?\n/)[0] || '';
            const sep = firstLine.includes(';') ? ';' : ',';
            hdrs = firstLine.split(sep).map(h=>h.replace(/"/g,'').trim());
            if (hdrs.some(h=>ns(h)==='data')&&hdrs.some(h=>ns(h)==='valor')&&hdrs.some(h=>ns(h).includes('descri'))) detectedBank='nubank';
            else { const d = detectBank(hdrs); if (d) detectedBank=d; }
          }
          if (detectedBank==='auto') detectedBank='outro';
        } catch { detectedBank='outro'; }
      }

      const bank = BANKS[detectedBank] || BANKS.outro;
      setSlots(prev => [...prev, { id, file: { name: file.name, uri: file.uri, mimeType: file.mimeType||'' }, bankId: detectedBank, bankName: bank.name }]);
    } catch (e: any) {
      if (!e.message?.includes('cancel')) Alert.alert('Erro', 'Não foi possível ler o arquivo.');
    }
  };

  const removeSlot = (id: number) => setSlots(prev => prev.filter(s => s.id !== id));

  const handleProcess = async () => {
    if (!slots.length) { Alert.alert('Atenção', 'Adicione pelo menos um extrato.'); return; }
    const recVal = parseVal(receita);
    setProcessing(true);
    try {
      let all: Transaction[] = [];
      for (const slot of slots) {
        const name = slot.file.name.toLowerCase();
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
          const txns = await parseXLSX(slot.file.uri);
          all = [...all, ...txns];
        } else {
          const txns = await parseCSV(slot.file.uri, slot.bankId);
          all = [...all, ...txns];
        }
      }
      if (!all.length) { Alert.alert('Arquivo vazio', 'Nenhuma transação encontrada.'); setProcessing(false); return; }

      const { data: cfg } = await getConfigApi();
      const { data } = await classifyApi(all, cfg.config?.rules || [], cfg.config?.fornecedores || []);

      navigation.navigate('Review', {
        transactions: data.classified || all.map(t => ({ ...t, categoria: 'Pessoal' })),
        receita: recVal,
        mesKey: data.mesKey,
      });
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || e.message || 'Falha ao processar extratos.');
    }
    setProcessing(false);
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.t2} /></TouchableOpacity>
        <Text style={s.headerTitle}>Nova DRE</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionTitle}>Carregar extratos</Text>
        <Text style={s.sectionSub}>Adicione quantos extratos precisar — a IA classifica e monta o DRE.</Text>

        {/* Slots */}
        {slots.map(slot => {
          const bank = BANKS[slot.bankId] || BANKS.outro;
          return (
            <View key={slot.id} style={s.slotRow}>
              <View style={s.slotFile}>
                <Ionicons name="document-text-outline" size={20} color={colors.t2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.slotName} numberOfLines={1}>{slot.file.name}</Text>
                  <Text style={s.slotExt}>{slot.file.name.split('.').pop()?.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => removeSlot(slot.id)} style={s.slotRemove}>
                  <Ionicons name="close" size={18} color={colors.t3} />
                </TouchableOpacity>
              </View>
              <View style={[s.bankBadge, { backgroundColor: bank.color }]}>
                <Text style={s.bankBadgeText}>{bank.name}</Text>
              </View>
            </View>
          );
        })}

        {/* Add button */}
        {!showPicker ? (
          <TouchableOpacity style={s.addBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add" size={20} color={colors.t3} />
            <Text style={s.addBtnText}>{slots.length === 0 ? 'Adicionar extrato...' : 'Adicionar outro extrato...'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.picker}>
            <Text style={s.pickerTitle}>SELECIONAR BANCO</Text>
            {Object.entries(BANKS).map(([id, bank]) => (
              <TouchableOpacity key={id} style={s.pickerOpt} onPress={() => addFile(id)}>
                <View style={[s.bankDot, { backgroundColor: bank.color }]} />
                <Text style={s.pickerOptName}>{bank.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={s.pickerCancel}>Cancelar</Text></TouchableOpacity>
          </View>
        )}

        {/* Receita */}
        <View style={s.receitaBox}>
          <Text style={s.sectionTitle}>Receita do mês</Text>
          <Text style={s.sectionSub}>Informe a receita total se não estiver no extrato.</Text>
          <TextInput
            style={s.input} value={receita} onChangeText={setReceita}
            placeholder="R$ 0,00" placeholderTextColor={colors.t3}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity style={[s.btnProcess, !slots.length && s.btnDisabled]} onPress={handleProcess} disabled={!slots.length || processing}>
          {processing ? <ActivityIndicator color="#0a1a0e" /> : <Text style={s.btnProcessText}>Processar extratos →</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: colors.t1 },
  scroll:        { padding: 16, gap: 12, paddingBottom: 40 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: colors.t1 },
  sectionSub:    { fontSize: 12, color: colors.t2 },
  slotRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotFile:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s1, borderRadius: colors.rs, borderWidth: 0.5, borderColor: `${colors.green}40`, padding: 12 },
  slotName:      { fontSize: 13, fontWeight: '600', color: colors.green },
  slotExt:       { fontSize: 10, color: colors.t3 },
  slotRemove:    { padding: 2 },
  bankBadge:     { borderRadius: colors.rs, paddingHorizontal: 10, paddingVertical: 6 },
  bankBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s1, borderRadius: colors.rs, borderWidth: 0.5, borderStyle: 'dashed', borderColor: colors.b2, padding: 14 },
  addBtnText:    { color: colors.t3, fontSize: 13 },
  picker:        { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b2, gap: 10 },
  pickerTitle:   { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, textTransform: 'uppercase' },
  pickerOpt:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 12, borderWidth: 0.5, borderColor: colors.b2 },
  bankDot:       { width: 12, height: 12, borderRadius: 6 },
  pickerOptName: { fontSize: 14, fontWeight: '600', color: colors.t1 },
  pickerCancel:  { textAlign: 'center', color: colors.t3, fontSize: 12, paddingTop: 4 },
  receitaBox:    { gap: 8, marginTop: 8 },
  input:         { backgroundColor: colors.s1, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 14, fontSize: 15 },
  btnProcess:    { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled:   { opacity: 0.5 },
  btnProcessText:{ color: '#0a1a0e', fontWeight: '700', fontSize: 15 },
});
