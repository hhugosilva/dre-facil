import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { parseFile, detectBank, detectTransfersMulti } from '../utils/parsers';
import { classifyApi } from '../services/api';
import { getMemory, memKey } from '../utils/storage';
import { toMesKey } from '../utils/format';
import type { AllTx } from '../context/AppContext';

const BANKS = [
  { id: 'nubank',      label: 'Nubank' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'inter',       label: 'Inter' },
  { id: 'itau',        label: 'Itaú' },
  { id: 'bradesco',    label: 'Bradesco' },
  { id: 'santander',   label: 'Santander' },
  { id: 'caixa',       label: 'Caixa' },
  { id: 'bb',          label: 'Banco do Brasil' },
  { id: 'c6',          label: 'C6 Bank' },
  { id: 'sicoob',      label: 'Sicoob' },
  { id: 'outro',       label: 'Outro' },
];

const BANK_COLORS: Record<string, string> = {
  nubank: '#820AD1', mercadopago: '#009ee3', inter: '#FF7A00',
  itau: '#EC7000', bradesco: '#CC092F', santander: '#EC0000',
  caixa: '#005CA9', bb: '#FFCC00', c6: '#242424', sicoob: '#007A3D',
};

type Slot = {
  id: number;
  bank: string;        // id do banco (nubank, caixa, outro, auto...)
  customBank: string;  // nome digitado quando bank === 'outro'
  detecting: boolean;
  file: { uri: string; name: string; ext: string } | null;
};

function slotLabel(slot: Slot) {
  if (slot.bank === 'outro' && slot.customBank.trim()) return slot.customBank.trim();
  return BANKS.find(b => b.id === slot.bank)?.label || 'Extrato';
}

function slotColor(bank: string, clrs: any) {
  if (bank === 'auto') return clrs.green;
  return BANK_COLORS[bank] || clrs.t3;
}

export default function UploadScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { rules, forns, cats, businessType, setAllTx, applyRules } = useApp();
  const [slots, setSlots] = useState<Slot[]>([
    { id: 1, bank: 'auto', customBank: '', detecting: false, file: null },
  ]);
  const [processing,   setProcessing]   = useState(false);
  const [processStep,  setProcessStep]  = useState('');

  // Modal de banco
  const [bankModal,       setBankModal]       = useState<number | null>(null);
  const [bankModalForced, setBankModalForced] = useState(false); // obrigatório após pick
  const [pendingBank,     setPendingBank]     = useState('');    // seleção temporária dentro do modal
  const [outroInput,      setOutroInput]      = useState('');    // texto para "Outro"

  const s = useMemo(() => StyleSheet.create({
    root:           { flex: 1, backgroundColor: colors.bg },
    topbar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: colors.b1 },
    brand:          { fontSize: 15, fontWeight: '700', color: colors.t1 },
    pills:          { flexDirection: 'row', gap: 6 },
    pill:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.b2 },
    pillActive:     { borderColor: colors.green },
    pillText:       { fontSize: 12, color: colors.t3 },
    pillTextActive: { color: colors.green, fontWeight: '600' },
    scroll:         { padding: 20, paddingBottom: 40 },
    pageTitle:      { fontSize: 26, fontWeight: '700', color: colors.t1, marginBottom: 6 },
    pageSub:        { fontSize: 13, color: colors.t2, marginBottom: 20, lineHeight: 19 },
    card:           { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1, marginBottom: 16, gap: 10 },
    cardLabel:      { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 4 },
    fileRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 12, borderWidth: 0.5, borderColor: `${colors.green}40` },
    fileIcon:       { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.s3, alignItems: 'center', justifyContent: 'center' },
    fileName:       { fontSize: 13, color: colors.t1, fontWeight: '500' },
    fileExt:        { fontSize: 10, color: colors.t3, marginTop: 1 },
    removeBtn:      { padding: 4 },
    bankBadge:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, minWidth: 80, alignItems: 'center' },
    bankBadgeText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
    addRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.b2, borderRadius: colors.rs, padding: 16 },
    addIcon:        { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.s2, alignItems: 'center', justifyContent: 'center' },
    addText:        { fontSize: 14, color: colors.t3 },
    processBtn:     { backgroundColor: colors.green, borderRadius: colors.r, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
    processBtnText: { fontSize: 16, fontWeight: '700', color: '#0a1a0e' },
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet:     { backgroundColor: colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 8 },
    modalHandle:    { width: 36, height: 4, backgroundColor: colors.b3, borderRadius: 99, alignSelf: 'center', marginBottom: 8 },
    modalTitle:     { fontSize: 15, fontWeight: '600', color: colors.t1, marginBottom: 2 },
    modalSub:       { fontSize: 12, color: colors.t3, marginBottom: 6 },
    bankOpt:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 12, borderWidth: 0.5, borderColor: colors.b2, marginBottom: 6 },
    bankOptActive:  { borderColor: `${colors.green}60` },
    bankDot:        { width: 10, height: 10, borderRadius: 5 },
    bankOptText:    { fontSize: 14, color: colors.t1, flex: 1 },
    outroInput:     { backgroundColor: colors.s2, borderRadius: colors.rs, borderWidth: 1, borderColor: colors.green, color: colors.t1, padding: 12, fontSize: 14, marginTop: 4, marginBottom: 6 },
    confirmBtn:     { backgroundColor: colors.green, borderRadius: colors.r, padding: 15, alignItems: 'center', marginTop: 8 },
    confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#0a1a0e' },
  }), [colors]);

  const openBankModal = (slotId: number, forced = false) => {
    const slot = slots.find(s => s.id === slotId);
    const current = slot?.bank === 'auto' ? '' : (slot?.bank || '');
    setPendingBank(current);
    setOutroInput(slot?.customBank || '');
    setBankModal(slotId);
    setBankModalForced(forced);
  };

  const confirmBank = () => {
    if (!pendingBank) return;
    setSlots(prev => prev.map(sl =>
      sl.id === bankModal
        ? { ...sl, bank: pendingBank, customBank: pendingBank === 'outro' ? outroInput.trim() : '' }
        : sl
    ));
    setBankModal(null);
    setBankModalForced(false);
  };

  const pickFile = async (slotId: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['*/*'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;

      const { uri, name } = result.assets[0];
      const ext = name.split('.').pop()?.toUpperCase() || 'CSV';

      // Tenta auto-detectar enquanto aguarda o usuário escolher
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, detecting: true, file: { uri, name, ext } } : s));
      const detected = await detectBank(uri, name);
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, detecting: false } : s));

      // Abre modal obrigatório — pré-seleciona o detectado (se não for 'auto')
      const preSelect = detected !== 'auto' ? detected : '';
      setPendingBank(preSelect);
      setOutroInput('');
      setBankModal(slotId);
      setBankModalForced(true);

      // Slot vazio adicional
      setSlots(prev => {
        const hasEmpty = prev.some(s => !s.file && s.id !== slotId);
        if (!hasEmpty && prev.length < 5) {
          return [...prev, { id: Date.now(), bank: 'auto', customBank: '', detecting: false, file: null }];
        }
        return prev;
      });
    } catch {
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, detecting: false } : s));
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');
    }
  };

  const removeSlot = (slotId: number) => {
    setSlots(prev => {
      const filtered = prev.filter(s => s.id !== slotId);
      const hasEmpty = filtered.some(s => !s.file);
      if (!hasEmpty) return [...filtered, { id: Date.now(), bank: 'auto', customBank: '', detecting: false, file: null }];
      return filtered;
    });
  };

  const handleProcess = async () => {
    const filled = slots.filter(s => s.file);
    if (!filled.length) { Alert.alert('Atenção', 'Adicione ao menos um extrato.'); return; }

    // Verifica se algum slot ainda não teve banco confirmado
    const semBanco = filled.find(s => s.bank === 'auto');
    if (semBanco) {
      Alert.alert('Selecione o banco', 'Toque no badge colorido para escolher o banco de cada extrato.');
      return;
    }

    setProcessing(true);
    try {
      setProcessStep('Lendo extratos...');
      const slotResults: { slotId: number; bankLabel: string; txs: any[] }[] = [];
      for (const slot of filled) {
        setProcessStep(`Lendo: ${slot.file!.name}`);
        const txs = await parseFile(slot.file!.uri, slot.file!.name, slot.bank);
        slotResults.push({ slotId: slot.id, bankLabel: slotLabel(slot), txs });
      }

      setProcessStep('Detectando transferências...');
      const transferKeys = detectTransfersMulti(slotResults);

      let mesKey = toMesKey(new Date());
      const allDates = slotResults.flatMap(s => s.txs.map(t => t.data)).filter(Boolean);
      if (allDates.length) {
        const sorted = [...allDates].sort();
        mesKey = toMesKey(sorted[Math.floor(sorted.length / 2)]);
      }

      let allTxs: AllTx[] = [];
      slotResults.forEach(({ slotId, bankLabel, txs }) => {
        txs.forEach((tx, i) => {
          const isTransfer = transferKeys.has(`${slotId}_${i}`);
          allTxs.push({
            id: allTxs.length,
            data: tx.data,
            descricao: tx.descricao,
            valor: tx.valor,
            source: bankLabel,
            categoria: applyRules(tx.descricao) || (tx.valor > 0 ? 'Receita' : 'Outros'),
            empresa: !isTransfer,
            isTransfer,
            hash: `${slotId}_${i}`,
          });
        });
      });

      setProcessStep('Aplicando memória...');
      const mem = await getMemory(user!.id);
      allTxs = allTxs.map(tx => mem[memKey(tx.descricao)] ? { ...tx, categoria: mem[memKey(tx.descricao)] } : tx);

      const toClassify = allTxs.filter(tx => !tx.isTransfer && tx.categoria === 'Outros');
      if (toClassify.length > 0) {
        setProcessStep(`IA classificando ${toClassify.length} transações...`);
        try {
          const { data } = await classifyApi(
            toClassify.map(t => ({ id: t.id, descricao: t.descricao, valor: t.valor })),
            rules, forns, cats, businessType,
          );
          const classified: Record<number, string> = {};
          (data.results || []).forEach((r: any) => { if (r.id !== undefined) classified[r.id] = r.categoria; });
          allTxs = allTxs.map(tx => classified[tx.id] ? { ...tx, categoria: classified[tx.id] } : tx);
        } catch {}
      }

      setAllTx(allTxs);
      navigation.navigate('Review', { mesKey });
    } catch (e: any) {
      Alert.alert('Erro ao processar', e.message || 'Verifique o formato do arquivo.');
    }
    setProcessing(false);
    setProcessStep('');
  };

  const filledSlots = slots.filter(s => s.file);
  const emptySlot   = slots.find(s => !s.file);

  const canConfirm = pendingBank && pendingBank !== 'auto' &&
    (pendingBank !== 'outro' || outroInput.trim().length > 0);

  return (
    <View style={s.root}>
      {/* Topbar */}
      <View style={s.topbar}>
        <Text style={s.brand}>DRE<Text style={{ color: colors.green }}>Fácil</Text></Text>
        <View style={s.pills}>
          {['extratos', 'revisar', 'resultado'].map((lbl, i) => (
            <View key={lbl} style={[s.pill, i === 0 && s.pillActive]}>
              <Text style={[s.pillText, i === 0 && s.pillTextActive]}>{lbl}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.t2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>Carregar extratos</Text>
        <Text style={s.pageSub}>Adicione quantos extratos precisar — a IA classifica e monta o DRE.</Text>

        <View style={s.card}>
          <Text style={s.cardLabel}>ARQUIVOS DO MÊS</Text>

          {/* Slots com arquivo */}
          {filledSlots.map(slot => (
            <View key={slot.id} style={s.fileRow}>
              <View style={s.fileIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.t2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.fileName} numberOfLines={1}>{slot.file!.name}</Text>
                <Text style={s.fileExt}>{slot.file!.ext}</Text>
              </View>
              <TouchableOpacity onPress={() => removeSlot(slot.id)} style={s.removeBtn}>
                <Ionicons name="close" size={16} color={colors.t3} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.bankBadge, { backgroundColor: slotColor(slot.bank, colors) }]}
                onPress={() => openBankModal(slot.id, false)}
              >
                {slot.detecting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.bankBadgeText}>{slotLabel(slot)}</Text>
                }
              </TouchableOpacity>
            </View>
          ))}

          {/* Slot vazio */}
          {emptySlot && (
            <TouchableOpacity style={s.addRow} onPress={() => pickFile(emptySlot.id)}>
              <View style={s.addIcon}>
                <Ionicons name="add" size={22} color={colors.t3} />
              </View>
              <Text style={s.addText}>
                {filledSlots.length === 0 ? 'Adicionar extrato...' : 'Adicionar outro extrato...'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[s.processBtn, (processing || filledSlots.length === 0) && { opacity: 0.6 }]}
          onPress={handleProcess}
          disabled={processing || filledSlots.length === 0}
        >
          {processing
            ? <>
                <ActivityIndicator color="#0a1a0e" />
                <Text style={s.processBtnText}>{processStep || 'Processando...'}</Text>
              </>
            : <Text style={s.processBtnText}>Processar extratos →</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de banco */}
      <Modal visible={bankModal !== null} transparent animationType="slide">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => { if (!bankModalForced) setBankModal(null); }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>
                {bankModalForced ? 'Qual é o banco deste extrato?' : 'Selecionar banco'}
              </Text>
              {bankModalForced && (
                <Text style={s.modalSub}>Escolha o banco para continuar</Text>
              )}

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {BANKS.map(b => {
                  const active = pendingBank === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[s.bankOpt, active && s.bankOptActive]}
                      onPress={() => { setPendingBank(b.id); if (b.id !== 'outro') setOutroInput(''); }}
                    >
                      <View style={[s.bankDot, { backgroundColor: slotColor(b.id, colors) }]} />
                      <Text style={[s.bankOptText, active && { color: colors.green }]}>{b.label}</Text>
                      {active && <Ionicons name="checkmark" size={18} color={colors.green} style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  );
                })}

                {/* Campo de texto para "Outro" */}
                {pendingBank === 'outro' && (
                  <TextInput
                    style={s.outroInput}
                    placeholder="Nome do banco ou cartão..."
                    placeholderTextColor={colors.t3}
                    value={outroInput}
                    onChangeText={setOutroInput}
                    autoFocus
                    returnKeyType="done"
                  />
                )}
              </ScrollView>

              <TouchableOpacity
                style={[s.confirmBtn, !canConfirm && { opacity: 0.4 }]}
                onPress={confirmBank}
                disabled={!canConfirm}
              >
                <Text style={s.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

