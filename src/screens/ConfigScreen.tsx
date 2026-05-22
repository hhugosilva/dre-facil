import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_CATS, Category } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useApp, Rule, Forn } from '../context/AppContext';
import { fmtBRL } from '../utils/format';
import { getPrevYear, savePrevYear, PrevYearData, PrevYearEntry } from '../utils/storage';
import { updateProfileApi, deleteAccountApi, toggle2FAApi } from '../services/api';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const CAT_COLORS = [
  '#4ade80','#60a5fa','#f87171','#fbbf24','#a78bfa',
  '#22d3ee','#f472b6','#fb923c','#34d399','#818cf8',
  '#e879f9','#2dd4bf','#94a3b8','#facc15','#f97316',
];

type CatModal  = { index: number; name: string; color: string; cost: boolean; neutral: boolean } | null;
type MonthModal = { monthIdx: number; receita: string; lucro: string } | null;
type Section   = 'conta' | 'categorias' | 'registros' | 'regras' | 'seguranca';

// ─── Card acordeão ────────────────────────────────────────────────────────────
function AccordionCard({
  colors, s, id, open, onToggle, icon, title, badge, children,
}: {
  colors: any; s: any;
  id: Section; open: boolean; onToggle: () => void;
  icon: string; title: string; badge?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <TouchableOpacity style={s.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={s.cardHeaderLeft}>
          <View style={s.cardIcon}>
            <Ionicons name={icon as any} size={17} color={colors.green} />
          </View>
          <Text style={s.cardTitle}>{title}</Text>
          {badge ? <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.t3} />
      </TouchableOpacity>
      {open && <View style={s.cardBody}>{children}</View>}
    </View>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────
export default function ConfigScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout, user, setUser } = useAuth();
  const { cats, rules, forns, saveConfig } = useApp();

  const [open, setOpen] = useState<Set<Section>>(new Set());
  const toggle = (s: Section) => setOpen(prev => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  // Config geral
  const [localCats,  setLocalCats]  = useState<Category[]>(cats);
  const [localRules, setLocalRules] = useState<Rule[]>(rules);
  const [localForns, setLocalForns] = useState<Forn[]>(forns);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { setLocalCats(cats); setLocalRules(rules); setLocalForns(forns); }, [cats, rules, forns]);

  const s = useMemo(() => StyleSheet.create({
    root:            { flex: 1, backgroundColor: colors.bg },
    topbar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, borderBottomWidth: 0.5, borderBottomColor: colors.b1 },
    brand:           { fontSize: 16, fontWeight: '700', color: colors.t1 },
    saveBtn:         { backgroundColor: colors.green, borderRadius: colors.rs, paddingHorizontal: 16, paddingVertical: 8 },
    saveBtnText:     { color: '#0a1a0e', fontWeight: '700', fontSize: 14 },
    scroll:          { padding: 16, paddingBottom: 40 },
    pageTitle:       { fontSize: 22, fontWeight: '700', color: colors.t1, marginBottom: 16 },

    // Accordion card
    card:            { backgroundColor: colors.s1, borderRadius: colors.r, borderWidth: 0.5, borderColor: colors.b1, marginBottom: 10, overflow: 'hidden' },
    cardHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    cardHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIcon:        { width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.green}18`, alignItems: 'center', justifyContent: 'center' },
    cardTitle:       { fontSize: 14, fontWeight: '600', color: colors.t1 },
    cardBody:        { paddingHorizontal: 16, paddingBottom: 16 },
    cardDesc:        { fontSize: 12, color: colors.t2, marginBottom: 12, lineHeight: 18 },
    badge:           { backgroundColor: colors.s3, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    badgeText:       { fontSize: 11, color: colors.t3, fontWeight: '600' },

    // Shared
    subLabel:        { fontSize: 10, fontWeight: '700', color: colors.t3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    inputLabel:      { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 6 },
    input:           { backgroundColor: colors.s2, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 12, fontSize: 13 },
    inputReadonly:   { justifyContent: 'center' },
    inputReadonlyText:{ fontSize: 13, color: colors.t3 },
    divider:         { height: 0.5, backgroundColor: colors.b2 },
    rowBetween:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    addBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addBtnText:      { fontSize: 12, color: colors.green, fontWeight: '600' },
    linkText:        { fontSize: 11, color: colors.t3 },
    iconBtn:         { padding: 4, marginLeft: 4 },
    listRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 0.5, borderTopColor: colors.b1 },
    listLabel:       { fontSize: 13, color: colors.t1, flex: 1 },
    listSub:         { fontSize: 11, color: colors.t3, marginTop: 1 },
    listEmpty:       { fontSize: 12, color: colors.t3, fontStyle: 'italic' },
    dot:             { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    emptyText:       { fontSize: 12, color: colors.t3, fontStyle: 'italic', paddingVertical: 6 },
    actionBtn:       { backgroundColor: colors.green, borderRadius: colors.rs, padding: 13, alignItems: 'center' },
    actionBtnText:   { color: '#0a1a0e', fontWeight: '700', fontSize: 14 },
    logoutBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: `${colors.red}30`, marginTop: 4 },
    logoutText:        { fontSize: 14, color: colors.red, fontWeight: '600' },
    deleteAccountBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14 },
    deleteAccountText: { fontSize: 13, color: colors.red, fontWeight: '600' },

    // Theme toggle
    themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1, marginTop: 4 },
    themeText: { flex: 1, fontSize: 14, color: colors.t1, fontWeight: '600' },

    // Modais
    overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet:           { backgroundColor: colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 44, gap: 8 },
    handle:          { width: 36, height: 4, backgroundColor: colors.b3, borderRadius: 99, alignSelf: 'center', marginBottom: 8 },
    sheetTitle:      { fontSize: 15, fontWeight: '700', color: colors.t1 },
    toggleOpt:       { backgroundColor: colors.s2, borderRadius: colors.rs, padding: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.b2 },
    toggleOptActive: { borderColor: colors.green },
    toggleOptText:   { fontSize: 13, color: colors.t2 },
    neutralHint:     { fontSize: 11, color: colors.t3, fontStyle: 'italic' },
    colorGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
    colorDot:        { width: 32, height: 32, borderRadius: 16 },
  }), [colors]);

  const handleSave = async () => {
    setSaving(true);
    try { await saveConfig(localCats, localRules, localForns); }
    catch { Alert.alert('Erro', 'Não foi possível salvar.'); }
    setSaving(false);
  };

  // ── Minha Conta ─────────────────────────────────────────────────────────────
  const [profileNome,      setProfileNome]      = useState(user?.nome || '');
  const [profileEmpresa,   setProfileEmpresa]   = useState(user?.nome_empresa || '');
  const [profileCnpj,      setProfileCnpj]      = useState(user?.cnpj || '');
  const [profileSenhaAt,   setProfileSenhaAt]   = useState('');
  const [profileSenhaNova, setProfileSenhaNova] = useState('');
  const [savingProfile,    setSavingProfile]    = useState(false);

  const handleSaveProfile = async () => {
    if (!profileNome.trim()) { Alert.alert('Atenção', 'Nome é obrigatório.'); return; }
    if (profileSenhaNova && profileSenhaNova.length < 6) {
      Alert.alert('Atenção', 'Nova senha deve ter pelo menos 6 caracteres.'); return;
    }
    setSavingProfile(true);
    try {
      const { data } = await updateProfileApi({
        nome: profileNome.trim(),
        nome_empresa: profileEmpresa.trim() || undefined,
        cnpj: profileCnpj.trim() || undefined,
        senha_atual: profileSenhaAt || undefined,
        nova_senha: profileSenhaNova || undefined,
      });
      setUser(data.user);
      setProfileSenhaAt(''); setProfileSenhaNova('');
      Alert.alert('Salvo', 'Conta atualizada com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Não foi possível salvar.');
    }
    setSavingProfile(false);
  };

  // ── Segurança / 2FA ─────────────────────────────────────────────────────────
  const [twoFA, setTwoFA] = useState<boolean>(!!user?.two_factor_enabled);
  const [twoFASaving, setTwoFASaving] = useState(false);

  useEffect(() => { setTwoFA(!!user?.two_factor_enabled); }, [user?.two_factor_enabled]);

  const handleToggle2FA = async (value: boolean) => {
    setTwoFASaving(true);
    try {
      await toggle2FAApi(value);
      setTwoFA(value);
      setUser({ ...user!, two_factor_enabled: value });
      Alert.alert(
        value ? '2FA ativado' : '2FA desativado',
        value
          ? 'A partir do próximo login, você precisará inserir um código enviado por e-mail.'
          : 'A verificação em duas etapas foi desativada.',
      );
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Não foi possível alterar.');
    }
    setTwoFASaving(false);
  };

  // ── Categorias ──────────────────────────────────────────────────────────────
  const [catModal, setCatModal] = useState<CatModal>(null);

  const openNewCat  = () => setCatModal({ index: -1, name: '', color: CAT_COLORS[0], cost: true, neutral: false });
  const openEditCat = (i: number) => setCatModal({
    index: i, name: localCats[i].name, color: localCats[i].color,
    cost: localCats[i].cost, neutral: localCats[i].neutral ?? false,
  });
  const saveCat = () => {
    if (!catModal || !catModal.name.trim()) return;
    const cat: Category = {
      name: catModal.name.trim(), color: catModal.color,
      cost: catModal.neutral ? false : catModal.cost,
      neutral: catModal.neutral || undefined,
    };
    if (catModal.index === -1) setLocalCats(prev => [...prev, cat]);
    else setLocalCats(prev => prev.map((c, i) => i === catModal.index ? cat : c));
    setCatModal(null);
  };
  const deleteCat = (i: number) => {
    Alert.alert('Remover', `Remover "${localCats[i].name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setLocalCats(prev => prev.filter((_, idx) => idx !== i)) },
    ]);
  };
  const resetCats = () => Alert.alert('Restaurar padrão', 'Restaurar categorias padrão?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Restaurar', onPress: () => setLocalCats(DEFAULT_CATS) },
  ]);

  // ── Registros anteriores ────────────────────────────────────────────────────
  const [prevYear,    setPrevYear]    = useState<PrevYearData | null>(null);
  const [savingPrev,  setSavingPrev]  = useState(false);
  const [monthModal,  setMonthModal]  = useState<MonthModal>(null);
  const prevYearNum = new Date().getFullYear() - 1;

  useEffect(() => {
    getPrevYear(user!.id).then(d => setPrevYear(d || { year: prevYearNum, months: {} }));
  }, []);

  const openMonthModal = (idx: number) => {
    const key = String(idx + 1).padStart(2, '0');
    const entry = prevYear?.months[key];
    setMonthModal({ monthIdx: idx, receita: entry ? String(entry.receita) : '', lucro: entry?.lucro !== undefined ? String(entry.lucro) : '' });
  };
  const saveMonth = async () => {
    if (!monthModal) return;
    const key = String(monthModal.monthIdx + 1).padStart(2, '0');
    const recVal = parseFloat(monthModal.receita.replace(',', '.'));
    if (isNaN(recVal) && monthModal.receita.trim() !== '') { Alert.alert('Valor inválido'); return; }
    const lucroVal = parseFloat(monthModal.lucro.replace(',', '.'));
    const entry: PrevYearEntry = { receita: isNaN(recVal) ? 0 : recVal };
    if (!isNaN(lucroVal) && monthModal.lucro.trim() !== '') entry.lucro = lucroVal;
    const updated: PrevYearData = { year: prevYearNum, months: { ...(prevYear?.months || {}), [key]: entry } };
    if (entry.receita === 0 && !entry.lucro) delete updated.months[key];
    setPrevYear(updated); setSavingPrev(true);
    await savePrevYear(user!.id, updated); setSavingPrev(false); setMonthModal(null);
  };
  const monthEntry = (idx: number) => prevYear?.months[String(idx + 1).padStart(2, '0')] ?? null;

  // ── Regras ──────────────────────────────────────────────────────────────────
  const [ruleModal, setRuleModal] = useState(false);
  const [newKw,     setNewKw]     = useState('');
  const [newCat,    setNewCat]    = useState('');
  const addRule = () => {
    if (!newKw.trim() || !newCat.trim()) return;
    setLocalRules(prev => [...prev, { keyword: newKw.trim().toUpperCase(), category: newCat.trim() }]);
    setNewKw(''); setNewCat(''); setRuleModal(false);
  };

  // ── Fornecedores ─────────────────────────────────────────────────────────────
  const [fornModal,    setFornModal]    = useState(false);
  const [newFornName,  setNewFornName]  = useState('');
  const [newFornKw,    setNewFornKw]    = useState('');
  const addForn = () => {
    if (!newFornName.trim()) return;
    const kws = newFornKw.split(',').map(k => k.trim().toUpperCase()).filter(Boolean);
    setLocalForns(prev => [...prev, { nome: newFornName.trim(), kws, color: colors.blue }]);
    setNewFornName(''); setNewFornKw(''); setFornModal(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Topbar */}
      <View style={s.topbar}>
        <Text style={s.brand}>DRE<Text style={{ color: colors.green }}>Fácil</Text></Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn}>
          {saving
            ? <ActivityIndicator color="#0a1a0e" size="small" />
            : <Text style={s.saveBtnText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>Configurações</Text>

        {/* ══ MINHA CONTA ══════════════════════════════════════════════════════ */}
        <AccordionCard colors={colors} s={s} id="conta" open={open.has('conta')} onToggle={() => toggle('conta')}
          icon="person-circle-outline" title="Minha Conta">

          {/* Meus Dados */}
          <Text style={s.subLabel}>MEUS DADOS</Text>

          <Text style={s.inputLabel}>NOME</Text>
          <TextInput style={s.input} value={profileNome} onChangeText={setProfileNome}
            placeholder="Seu nome" placeholderTextColor={colors.t3} />

          <Text style={[s.inputLabel, { marginTop: 10 }]}>E-MAIL</Text>
          <View style={[s.input, s.inputReadonly]}>
            <Text style={s.inputReadonlyText}>{user?.email}</Text>
          </View>

          <Text style={[s.inputLabel, { marginTop: 10 }]}>NOME DA EMPRESA</Text>
          <TextInput style={s.input} value={profileEmpresa} onChangeText={setProfileEmpresa}
            placeholder="Nome da empresa (opcional)" placeholderTextColor={colors.t3} />

          <Text style={[s.inputLabel, { marginTop: 10 }]}>CNPJ / CPF</Text>
          <TextInput style={[s.input, { marginBottom: 14 }]} value={profileCnpj} onChangeText={setProfileCnpj}
            placeholder="00.000.000/0001-00" placeholderTextColor={colors.t3} keyboardType="numeric" />

          {/* Alterar Senha */}
          <View style={s.divider} />
          <Text style={[s.subLabel, { marginTop: 14 }]}>ALTERAR SENHA</Text>

          <Text style={s.inputLabel}>SENHA ATUAL</Text>
          <TextInput style={s.input} value={profileSenhaAt} onChangeText={setProfileSenhaAt}
            placeholder="Deixe em branco para não alterar" placeholderTextColor={colors.t3} secureTextEntry />

          <Text style={[s.inputLabel, { marginTop: 10 }]}>NOVA SENHA</Text>
          <TextInput style={[s.input, { marginBottom: 14 }]} value={profileSenhaNova} onChangeText={setProfileSenhaNova}
            placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.t3} secureTextEntry />

          <TouchableOpacity style={s.actionBtn} onPress={handleSaveProfile} disabled={savingProfile}>
            {savingProfile
              ? <ActivityIndicator color="#0a1a0e" size="small" />
              : <Text style={s.actionBtnText}>Salvar dados da conta</Text>}
          </TouchableOpacity>

          <View style={[s.divider, { marginTop: 14 }]} />
          <TouchableOpacity style={s.deleteAccountBtn} onPress={() => {
            Alert.alert(
              'Excluir conta',
              'Tem certeza? Todos os seus dados, histórico e configurações serão apagados permanentemente. Esta ação não pode ser desfeita.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir conta', style: 'destructive', onPress: async () => {
                  try {
                    await deleteAccountApi();
                    logout();
                  } catch {
                    Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
                  }
                }},
              ]
            );
          }}>
            <Ionicons name="trash-outline" size={15} color={colors.red} />
            <Text style={s.deleteAccountText}>Excluir minha conta</Text>
          </TouchableOpacity>
        </AccordionCard>

        {/* ══ SEGURANÇA ════════════════════════════════════════════════════════ */}
        <AccordionCard colors={colors} s={s} id="seguranca" open={open.has('seguranca')} onToggle={() => toggle('seguranca')}
          icon="shield-checkmark-outline" title="Segurança">

          <Text style={s.cardDesc}>
            Com a verificação em duas etapas ativada, um código de 6 dígitos será enviado para seu e-mail a cada login.
          </Text>

          <View style={[s.rowBetween, { marginBottom: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.t1 }}>Verificação em 2 etapas</Text>
              <Text style={{ fontSize: 12, color: colors.t2, marginTop: 2 }}>
                {twoFA ? 'Ativada — código via e-mail no login' : 'Desativada'}
              </Text>
            </View>
            {twoFASaving
              ? <ActivityIndicator size="small" color={colors.green} />
              : <Switch
                  value={twoFA}
                  onValueChange={handleToggle2FA}
                  trackColor={{ false: colors.b3, true: `${colors.green}60` }}
                  thumbColor={twoFA ? colors.green : colors.t3}
                />
            }
          </View>
        </AccordionCard>

        {/* ══ CATEGORIAS ══════════════════════════════════════════════════════ */}
        <AccordionCard colors={colors} s={s} id="categorias" open={open.has('categorias')} onToggle={() => toggle('categorias')}
          icon="pricetags-outline" title="Categorias" badge={String(localCats.length)}>

          <View style={s.rowBetween}>
            <TouchableOpacity style={s.addBtn} onPress={openNewCat}>
              <Ionicons name="add" size={15} color={colors.green} />
              <Text style={s.addBtnText}>Adicionar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetCats}>
              <Text style={s.linkText}>Restaurar padrão</Text>
            </TouchableOpacity>
          </View>

          {localCats.map((cat, i) => (
            <View key={i} style={s.listRow}>
              <View style={[s.dot, { backgroundColor: cat.color }]} />
              <Text style={s.listLabel}>{cat.name}</Text>
              <Text style={s.listSub}>{cat.neutral ? 'Neutro' : cat.cost ? 'Custo' : 'Receita'}</Text>
              <TouchableOpacity onPress={() => openEditCat(i)} style={s.iconBtn}>
                <Ionicons name="pencil-outline" size={15} color={colors.t3} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCat(i)} style={s.iconBtn}>
                <Ionicons name="trash-outline" size={15} color={colors.t3} />
              </TouchableOpacity>
            </View>
          ))}
        </AccordionCard>

        {/* ══ REGISTROS ANTERIORES ════════════════════════════════════════════ */}
        <AccordionCard colors={colors} s={s} id="registros" open={open.has('registros')} onToggle={() => toggle('registros')}
          icon="bar-chart-outline" title="Registros Anteriores">

          <Text style={s.cardDesc}>
            Informe o faturamento (e opcionalmente o lucro) de cada mês de {prevYearNum} para gerar a projeção no dashboard.
          </Text>
          {savingPrev && <ActivityIndicator size="small" color={colors.green} style={{ alignSelf: 'flex-start', marginBottom: 8 }} />}

          {MONTH_NAMES.map((name, idx) => {
            const entry = monthEntry(idx);
            return (
              <TouchableOpacity key={idx} style={s.listRow} onPress={() => openMonthModal(idx)}>
                <Text style={[s.listLabel, { width: 90 }]}>{name}</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {entry?.receita
                    ? <Text style={[s.listSub, { color: colors.green }]}>{fmtBRL(entry.receita)}</Text>
                    : <Text style={s.listEmpty}>Toque para adicionar</Text>}
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.t3} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            );
          })}
        </AccordionCard>

        {/* ══ REGRAS DE CLASSIFICAÇÃO ═════════════════════════════════════════ */}
        <AccordionCard colors={colors} s={s} id="regras" open={open.has('regras')} onToggle={() => toggle('regras')}
          icon="git-branch-outline" title="Regras de Classificação">

          {/* Regras automáticas */}
          <View style={s.rowBetween}>
            <Text style={s.subLabel}>REGRAS AUTOMÁTICAS</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setRuleModal(true)}>
              <Ionicons name="add" size={15} color={colors.green} />
              <Text style={s.addBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
          {localRules.length === 0
            ? <Text style={s.emptyText}>Nenhuma regra cadastrada.</Text>
            : localRules.map((rule, i) => (
              <View key={i} style={s.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.listLabel}>{rule.keyword}</Text>
                  <Text style={s.listSub}>→ {rule.category}</Text>
                </View>
                <TouchableOpacity onPress={() => setLocalRules(prev => prev.filter((_, j) => j !== i))} style={s.iconBtn}>
                  <Ionicons name="trash-outline" size={15} color={colors.t3} />
                </TouchableOpacity>
              </View>
            ))}

          {/* Fornecedores */}
          <View style={[s.divider, { marginVertical: 14 }]} />
          <View style={s.rowBetween}>
            <Text style={s.subLabel}>FORNECEDORES</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setFornModal(true)}>
              <Ionicons name="add" size={15} color={colors.green} />
              <Text style={s.addBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
          {localForns.length === 0
            ? <Text style={s.emptyText}>Nenhum fornecedor cadastrado.</Text>
            : localForns.map((forn, i) => (
              <View key={i} style={s.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.listLabel}>{forn.nome}</Text>
                  {forn.kws.length > 0 && <Text style={s.listSub}>{forn.kws.join(', ')}</Text>}
                </View>
                <TouchableOpacity onPress={() => setLocalForns(prev => prev.filter((_, j) => j !== i))} style={s.iconBtn}>
                  <Ionicons name="trash-outline" size={15} color={colors.t3} />
                </TouchableOpacity>
              </View>
            ))}
        </AccordionCard>

        {/* Theme toggle */}
        <View style={s.themeRow}>
          <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.t2} />
          <Text style={s.themeText}>{isDark ? 'Tema escuro' : 'Tema claro'}</Text>
          <Switch
            value={!isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.s3, true: `${colors.green}80` }}
            thumbColor={!isDark ? colors.green : colors.t3}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={() => Alert.alert('Sair', 'Deseja sair da conta?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: logout },
        ])}>
          <Ionicons name="log-out-outline" size={17} color={colors.red} />
          <Text style={s.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modal categoria ── */}
      <Modal visible={!!catModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setCatModal(null)}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>{catModal?.index === -1 ? 'Nova categoria' : 'Editar categoria'}</Text>

            <Text style={s.inputLabel}>NOME</Text>
            <TextInput style={[s.input, { marginBottom: 12 }]}
              value={catModal?.name || ''} onChangeText={v => setCatModal(p => p ? { ...p, name: v } : p)}
              placeholder="ex: Alimentação" placeholderTextColor={colors.t3} />

            <Text style={s.inputLabel}>TIPO</Text>
            <View style={[s.rowBetween, { gap: 8, marginBottom: 12 }]}>
              {([{ label: 'Custo', cost: true, neutral: false }, { label: 'Receita', cost: false, neutral: false }, { label: 'Neutro', cost: false, neutral: true }] as { label: string; cost: boolean; neutral: boolean }[]).map(opt => {
                const active = catModal?.neutral === opt.neutral && catModal?.cost === opt.cost;
                return (
                  <TouchableOpacity key={opt.label} style={[s.toggleOpt, { flex: 1 }, active && s.toggleOptActive]}
                    onPress={() => setCatModal(p => p ? { ...p, cost: opt.cost, neutral: opt.neutral } : p)}>
                    <Text style={[s.toggleOptText, active && { color: colors.green }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {catModal?.neutral && <Text style={s.neutralHint}>Não entra no faturamento nem nos custos da DRE.</Text>}

            <Text style={[s.inputLabel, { marginTop: 4 }]}>COR</Text>
            <View style={s.colorGrid}>
              {CAT_COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c },
                  catModal?.color === c && { borderWidth: 2.5, borderColor: colors.t1 }]}
                  onPress={() => setCatModal(p => p ? { ...p, color: c } : p)} />
              ))}
            </View>

            <TouchableOpacity style={[s.actionBtn, { marginTop: 14 }]} onPress={saveCat}>
              <Text style={s.actionBtnText}>{catModal?.index === -1 ? 'Criar categoria' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal mês anterior ── */}
      <Modal visible={!!monthModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setMonthModal(null); }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={s.sheet}>
                <View style={s.handle} />
                <Text style={s.sheetTitle}>{monthModal ? MONTH_NAMES[monthModal.monthIdx] : ''} {prevYearNum}</Text>

                <Text style={s.inputLabel}>FATURAMENTO (R$)</Text>
                <TextInput style={[s.input, { marginBottom: 12 }]}
                  value={monthModal?.receita || ''} onChangeText={v => setMonthModal(p => p ? { ...p, receita: v } : p)}
                  placeholder="0,00" placeholderTextColor={colors.t3} keyboardType="decimal-pad"
                  returnKeyType="next" />

                <Text style={s.inputLabel}>LUCRO (R$) — opcional</Text>
                <TextInput style={[s.input, { marginBottom: 14 }]}
                  value={monthModal?.lucro || ''} onChangeText={v => setMonthModal(p => p ? { ...p, lucro: v } : p)}
                  placeholder="Deixe em branco se não souber" placeholderTextColor={colors.t3} keyboardType="decimal-pad"
                  returnKeyType="done" onSubmitEditing={saveMonth} />

                <TouchableOpacity style={s.actionBtn} onPress={saveMonth}>
                  <Text style={s.actionBtnText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal regra ── */}
      <Modal visible={ruleModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setRuleModal(false); }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={s.sheet}>
                <View style={s.handle} />
                <Text style={s.sheetTitle}>Nova regra automática</Text>
                <Text style={s.inputLabel}>PALAVRA-CHAVE</Text>
                <TextInput style={[s.input, { marginBottom: 12 }]} value={newKw} onChangeText={setNewKw}
                  placeholder="ex: UBER, GOOGLE ADS" placeholderTextColor={colors.t3} autoCapitalize="characters"
                  returnKeyType="next" />
                <Text style={s.inputLabel}>CATEGORIA</Text>
                <TextInput style={[s.input, { marginBottom: 14 }]} value={newCat} onChangeText={setNewCat}
                  placeholder="ex: Fornecedores" placeholderTextColor={colors.t3}
                  returnKeyType="done" onSubmitEditing={addRule} />
                <TouchableOpacity style={s.actionBtn} onPress={addRule}>
                  <Text style={s.actionBtnText}>Adicionar regra</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal fornecedor ── */}
      <Modal visible={fornModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setFornModal(false); }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={s.sheet}>
                <View style={s.handle} />
                <Text style={s.sheetTitle}>Novo fornecedor</Text>
                <Text style={s.inputLabel}>NOME</Text>
                <TextInput style={[s.input, { marginBottom: 12 }]} value={newFornName} onChangeText={setNewFornName}
                  placeholder="ex: Meta Ads" placeholderTextColor={colors.t3}
                  returnKeyType="next" />
                <Text style={s.inputLabel}>PALAVRAS-CHAVE (vírgula)</Text>
                <TextInput style={[s.input, { marginBottom: 14 }]} value={newFornKw} onChangeText={setNewFornKw}
                  placeholder="ex: FACEBOOK, META" placeholderTextColor={colors.t3} autoCapitalize="characters"
                  returnKeyType="done" onSubmitEditing={addForn} />
                <TouchableOpacity style={s.actionBtn} onPress={addForn}>
                  <Text style={s.actionBtnText}>Adicionar fornecedor</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

