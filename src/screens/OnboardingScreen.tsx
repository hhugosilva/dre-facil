import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp, Rule } from '../context/AppContext';
import { Category } from '../theme';
import { suggestCategoriesApi } from '../services/api';

// ─── Templates por tipo de negócio ────────────────────────────────────────────
type BizTemplate = {
  label: string;
  icon: string;
  cats: Category[];
  rules: Rule[];
};

const CAT_COLORS = [
  '#f87171','#60a5fa','#a78bfa','#fbbf24','#fb923c',
  '#34d399','#94a3b8','#f472b6','#22d3ee','#818cf8',
  '#e879f9','#2dd4bf',
];

const TEMPLATES: Record<string, BizTemplate> = {
  restaurante: {
    label: 'Restaurante\nAlimentação', icon: '🍽️',
    cats: [
      { name: 'Fornecedores (Alimentos)', color: '#f87171', cost: true },
      { name: 'Funcionários / Salários',  color: '#60a5fa', cost: true },
      { name: 'Aluguel',                  color: '#a78bfa', cost: true },
      { name: 'Energia / Água / Gás',     color: '#fbbf24', cost: true },
      { name: 'Embalagens',               color: '#fb923c', cost: true },
      { name: 'Marketing',                color: '#34d399', cost: true },
      { name: 'Manutenção',               color: '#94a3b8', cost: true },
      { name: 'Impostos / Taxas',         color: '#f472b6', cost: true },
    ],
    rules: [
      { keyword: 'IFOOD',      category: 'Receita' },
      { keyword: 'RAPPI',      category: 'Receita' },
      { keyword: 'UBER EATS',  category: 'Receita' },
      { keyword: 'GAS',        category: 'Energia / Água / Gás' },
      { keyword: 'COMGAS',     category: 'Energia / Água / Gás' },
      { keyword: 'SABESP',     category: 'Energia / Água / Gás' },
      { keyword: 'ENEL',       category: 'Energia / Água / Gás' },
      { keyword: 'CPFL',       category: 'Energia / Água / Gás' },
      { keyword: 'ALUGUEL',    category: 'Aluguel' },
      { keyword: 'SALARIO',    category: 'Funcionários / Salários' },
      { keyword: 'FOLHA',      category: 'Funcionários / Salários' },
      { keyword: 'INSS',       category: 'Impostos / Taxas' },
      { keyword: 'DAS',        category: 'Impostos / Taxas' },
      { keyword: 'DARF',       category: 'Impostos / Taxas' },
      { keyword: 'GOOGLE ADS', category: 'Marketing' },
      { keyword: 'FACEBOOK',   category: 'Marketing' },
    ],
  },
  comercio: {
    label: 'Comércio\nLoja', icon: '🛍️',
    cats: [
      { name: 'Fornecedores / Mercadoria', color: '#f87171', cost: true },
      { name: 'Funcionários / Salários',   color: '#60a5fa', cost: true },
      { name: 'Aluguel',                   color: '#a78bfa', cost: true },
      { name: 'Energia / Água',            color: '#fbbf24', cost: true },
      { name: 'Frete / Logística',         color: '#fb923c', cost: true },
      { name: 'Marketing',                 color: '#34d399', cost: true },
      { name: 'Impostos / Taxas',          color: '#f472b6', cost: true },
      { name: 'Sistema / Software',        color: '#22d3ee', cost: true },
    ],
    rules: [
      { keyword: 'MERCADO PAGO',  category: 'Receita' },
      { keyword: 'SHOPEE',        category: 'Receita' },
      { keyword: 'MERCADO LIVRE', category: 'Receita' },
      { keyword: 'STONE',         category: 'Receita' },
      { keyword: 'FRETE',         category: 'Frete / Logística' },
      { keyword: 'CORREIOS',      category: 'Frete / Logística' },
      { keyword: 'JADLOG',        category: 'Frete / Logística' },
      { keyword: 'INSS',          category: 'Impostos / Taxas' },
      { keyword: 'DAS',           category: 'Impostos / Taxas' },
      { keyword: 'ALUGUEL',       category: 'Aluguel' },
      { keyword: 'ENEL',          category: 'Energia / Água' },
      { keyword: 'CPFL',          category: 'Energia / Água' },
      { keyword: 'GOOGLE ADS',    category: 'Marketing' },
      { keyword: 'FACEBOOK',      category: 'Marketing' },
    ],
  },
  servicos: {
    label: 'Serviços\nConsultoria', icon: '💼',
    cats: [
      { name: 'Funcionários / Salários', color: '#60a5fa', cost: true },
      { name: 'Aluguel / Coworking',     color: '#a78bfa', cost: true },
      { name: 'Software / Assinaturas',  color: '#22d3ee', cost: true },
      { name: 'Marketing',               color: '#34d399', cost: true },
      { name: 'Transporte',              color: '#fb923c', cost: true },
      { name: 'Impostos / Taxas',        color: '#f472b6', cost: true },
      { name: 'Treinamento / Cursos',    color: '#818cf8', cost: true },
    ],
    rules: [
      { keyword: 'INSS',       category: 'Impostos / Taxas' },
      { keyword: 'DAS',        category: 'Impostos / Taxas' },
      { keyword: 'ISS',        category: 'Impostos / Taxas' },
      { keyword: 'UBER',       category: 'Transporte' },
      { keyword: 'ALUGUEL',    category: 'Aluguel / Coworking' },
      { keyword: 'COWORKING',  category: 'Aluguel / Coworking' },
      { keyword: 'MICROSOFT',  category: 'Software / Assinaturas' },
      { keyword: 'GOOGLE',     category: 'Software / Assinaturas' },
      { keyword: 'SLACK',      category: 'Software / Assinaturas' },
      { keyword: 'GOOGLE ADS', category: 'Marketing' },
      { keyword: 'FACEBOOK',   category: 'Marketing' },
      { keyword: 'UDEMY',      category: 'Treinamento / Cursos' },
    ],
  },
  freelancer: {
    label: 'Freelancer\nAutônomo', icon: '💻',
    cats: [
      { name: 'Software / Assinaturas', color: '#22d3ee', cost: true },
      { name: 'Equipamentos',           color: '#94a3b8', cost: true },
      { name: 'Marketing / Site',       color: '#34d399', cost: true },
      { name: 'Transporte',             color: '#fb923c', cost: true },
      { name: 'Impostos / Taxas',       color: '#f472b6', cost: true },
      { name: 'Cursos / Capacitação',   color: '#818cf8', cost: true },
      { name: 'Home Office',            color: '#fbbf24', cost: true },
    ],
    rules: [
      { keyword: 'INSS',       category: 'Impostos / Taxas' },
      { keyword: 'DAS',        category: 'Impostos / Taxas' },
      { keyword: 'UBER',       category: 'Transporte' },
      { keyword: 'UDEMY',      category: 'Cursos / Capacitação' },
      { keyword: 'ALURA',      category: 'Cursos / Capacitação' },
      { keyword: 'INTERNET',   category: 'Home Office' },
      { keyword: 'ENEL',       category: 'Home Office' },
      { keyword: 'GOOGLE ADS', category: 'Marketing / Site' },
      { keyword: 'FACEBOOK',   category: 'Marketing / Site' },
    ],
  },
  saude: {
    label: 'Saúde\nClínica', icon: '🏥',
    cats: [
      { name: 'Materiais / Insumos',     color: '#f87171', cost: true },
      { name: 'Funcionários / Salários', color: '#60a5fa', cost: true },
      { name: 'Aluguel / Consultório',   color: '#a78bfa', cost: true },
      { name: 'Equipamentos',            color: '#94a3b8', cost: true },
      { name: 'Energia / Água',          color: '#fbbf24', cost: true },
      { name: 'Marketing',               color: '#34d399', cost: true },
      { name: 'Impostos / Taxas',        color: '#f472b6', cost: true },
      { name: 'Software / Sistema',      color: '#22d3ee', cost: true },
    ],
    rules: [
      { keyword: 'INSS',    category: 'Impostos / Taxas' },
      { keyword: 'DAS',     category: 'Impostos / Taxas' },
      { keyword: 'ALUGUEL', category: 'Aluguel / Consultório' },
      { keyword: 'SABESP',  category: 'Energia / Água' },
      { keyword: 'ENEL',    category: 'Energia / Água' },
      { keyword: 'FOLHA',   category: 'Funcionários / Salários' },
      { keyword: 'FACEBOOK',category: 'Marketing' },
    ],
  },
  construcao: {
    label: 'Construção\nReformas', icon: '🔨',
    cats: [
      { name: 'Materiais de Construção', color: '#f87171', cost: true },
      { name: 'Mão de Obra',             color: '#60a5fa', cost: true },
      { name: 'Ferramentas',             color: '#94a3b8', cost: true },
      { name: 'Transporte / Frete',      color: '#fb923c', cost: true },
      { name: 'Impostos / Taxas',        color: '#f472b6', cost: true },
      { name: 'Marketing',               color: '#34d399', cost: true },
    ],
    rules: [
      { keyword: 'INSS',       category: 'Impostos / Taxas' },
      { keyword: 'DAS',        category: 'Impostos / Taxas' },
      { keyword: 'LEROY',      category: 'Materiais de Construção' },
      { keyword: 'TELHANORTE', category: 'Materiais de Construção' },
      { keyword: 'CORREIOS',   category: 'Transporte / Frete' },
      { keyword: 'FRETE',      category: 'Transporte / Frete' },
    ],
  },
  educacao: {
    label: 'Educação\nCursos', icon: '📚',
    cats: [
      { name: 'Professores / Instrutores', color: '#60a5fa', cost: true },
      { name: 'Plataforma / Software',     color: '#22d3ee', cost: true },
      { name: 'Aluguel / Espaço',          color: '#a78bfa', cost: true },
      { name: 'Marketing',                 color: '#34d399', cost: true },
      { name: 'Material Didático',         color: '#fbbf24', cost: true },
      { name: 'Impostos / Taxas',          color: '#f472b6', cost: true },
    ],
    rules: [
      { keyword: 'HOTMART',    category: 'Plataforma / Software' },
      { keyword: 'KIWIFY',     category: 'Plataforma / Software' },
      { keyword: 'INSS',       category: 'Impostos / Taxas' },
      { keyword: 'DAS',        category: 'Impostos / Taxas' },
      { keyword: 'GOOGLE ADS', category: 'Marketing' },
      { keyword: 'FACEBOOK',   category: 'Marketing' },
    ],
  },
};

const BIZ_ORDER = ['restaurante','comercio','servicos','freelancer','saude','construcao','educacao'];

// ─── Tela ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { completeOnboarding } = useApp();

  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [selectedBiz, setSelectedBiz] = useState<string | null>(null);
  const [bizDesc, setBizDesc]         = useState('');       // campo "Outro"
  const [aiLoading, setAiLoading]     = useState(false);

  // Categorias editáveis no passo 2
  const [editCats, setEditCats]   = useState<Category[]>([]);
  const [editRules, setEditRules] = useState<Rule[]>([]);
  const [bizLabel, setBizLabel]   = useState('');

  // Adicionar nova categoria
  const [addName,  setAddName]  = useState('');
  const [addColor, setAddColor] = useState(CAT_COLORS[0]);
  const [showAdd,  setShowAdd]  = useState(false);

  const [saving, setSaving] = useState(false);
  const [dreInfoVisible, setDreInfoVisible] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    root:        { flex: 1, backgroundColor: colors.bg },
    scroll:      { flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 40 },
    brand:       { fontSize: 22, fontWeight: '900', color: colors.t1 },
    brandGreen:  { color: colors.green },
    dots:        { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 24 },
    dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.b3 },
    dotActive:   { backgroundColor: colors.green, width: 20 },
    title:       { fontSize: 24, fontWeight: '800', color: colors.t1, marginBottom: 6 },
    sub:         { fontSize: 14, color: colors.t2, lineHeight: 21, marginBottom: 20 },
    grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
    bizCard:     { width: '47%', backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 1.5, borderColor: colors.b2, alignItems: 'center', gap: 6 },
    bizCardSel:  { borderColor: colors.green, backgroundColor: `${colors.green}10` },
    bizEmoji:    { fontSize: 32 },
    bizLabel:    { fontSize: 12, fontWeight: '700', color: colors.t2, textAlign: 'center', lineHeight: 17 },
    bizLabelSel: { color: colors.green },
    outroPill:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 1.5, borderColor: colors.b2, marginTop: 4 },
    outroPillSel:{ borderColor: colors.green, backgroundColor: `${colors.green}10` },
    outroPillText:{ fontSize: 14, fontWeight: '700', color: colors.t2 },
    outroPillTextSel:{ color: colors.green },
    descBox:     { backgroundColor: colors.s2, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginTop: 12 },
    btn:         { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center', marginTop: 20 },
    btnText:     { color: '#0a1a0e', fontWeight: '800', fontSize: 15 },
    btnDisabled: { opacity: 0.4 },
    backRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    backText:    { fontSize: 13, color: colors.t3 },
    // Categoria row
    catRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: colors.b1 },
    catDot:      { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
    catName:     { flex: 1, fontSize: 14, color: colors.t1, fontWeight: '500' },
    delBtn:      { padding: 6 },
    // Adicionar categoria
    addRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4 },
    addInput:    { flex: 1, backgroundColor: colors.s2, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 11, fontSize: 13 },
    addConfirm:  { backgroundColor: colors.green, borderRadius: colors.rs, paddingHorizontal: 14, paddingVertical: 11 },
    colorGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    colorDot:    { width: 28, height: 28, borderRadius: 14 },
    colorDotSel: { borderWidth: 3, borderColor: colors.t1 },
    addTrigger:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 },
    addTriggerTxt:{ fontSize: 13, color: colors.green, fontWeight: '600' },
    hint:        { fontSize: 12, color: colors.t3, marginTop: 14, textAlign: 'center', lineHeight: 18 },
    // Link DRE info
    dreLink:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    dreLinkText: { fontSize: 13, color: colors.green, fontWeight: '600', textDecorationLine: 'underline' },
    // Modal DRE info
    modalOverlay:{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalSheet:  { backgroundColor: colors.s1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 44 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.b2, alignSelf: 'center', marginBottom: 20 },
    modalTitle:  { fontSize: 22, fontWeight: '900', color: colors.t1, marginBottom: 4 },
    modalSub:    { fontSize: 13, color: colors.t3, marginBottom: 20 },
    benefitRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    benefitIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.green}18`, alignItems: 'center', justifyContent: 'center' },
    benefitText: { flex: 1, fontSize: 14, color: colors.t2, lineHeight: 21 },
    benefitBold: { color: colors.t1, fontWeight: '700' },
    divider:     { height: 0.5, backgroundColor: colors.b1, marginVertical: 18 },
    // Success
    successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.green}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    successTitle:{ fontSize: 26, fontWeight: '800', color: colors.t1, textAlign: 'center', marginBottom: 10 },
    successSub:  { fontSize: 14, color: colors.t2, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  }), [colors]);

  // ── Navegação passo 1 → 2 ───────────────────────────────────────────────────
  const goToStep2 = async () => {
    if (!selectedBiz) return;

    if (selectedBiz === 'outro') {
      if (!bizDesc.trim()) { Alert.alert('Atenção', 'Descreva o que sua empresa faz.'); return; }
      setAiLoading(true);
      try {
        const { data } = await suggestCategoriesApi(bizDesc.trim());
        setEditCats(data.categories || []);
        setEditRules(data.rules || []);
        setBizLabel(data.businessLabel || 'Outro');
      } catch {
        Alert.alert('Erro', 'Não foi possível gerar as categorias. Tente novamente.');
        setAiLoading(false);
        return;
      }
      setAiLoading(false);
    } else {
      const tmpl = TEMPLATES[selectedBiz];
      setEditCats([...tmpl.cats]);
      setEditRules([...tmpl.rules]);
      setBizLabel(tmpl.label.replace('\n', ' '));
    }
    setShowAdd(false);
    setAddName('');
    setStep(2);
  };

  // ── Remover categoria ───────────────────────────────────────────────────────
  const removeCat = (name: string) => {
    setEditCats(prev => prev.filter(c => c.name !== name));
    setEditRules(prev => prev.filter(r => r.category !== name));
  };

  // ── Adicionar categoria ─────────────────────────────────────────────────────
  const addCat = () => {
    if (!addName.trim()) return;
    const name = addName.trim();
    if (editCats.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Atenção', 'Já existe uma categoria com esse nome.'); return;
    }
    setEditCats(prev => [...prev, { name, color: addColor, cost: true }]);
    setAddName(''); setShowAdd(false);
  };

  // ── Salvar ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (editCats.length === 0) { Alert.alert('Atenção', 'Adicione pelo menos uma categoria.'); return; }
    setSaving(true);
    try {
      const type = selectedBiz === 'outro' ? `outro_${bizLabel}` : selectedBiz!;
      await completeOnboarding(type, editCats, editRules, []);
      setStep(3);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
    setSaving(false);
  };

  // ── Step 3: Sucesso ──────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={[s.root, s.successWrap]}>
        <View style={s.successIcon}>
          <Ionicons name="checkmark-circle" size={44} color={colors.green} />
        </View>
        <Text style={s.successTitle}>Tudo pronto!</Text>
        <Text style={s.successSub}>
          {editCats.length} categorias configuradas.{'\n'}
          Importe seu primeiro extrato e a IA{'\n'}já vai classificar corretamente.
        </Text>
        <TouchableOpacity style={s.btn} onPress={() => {}}>
          <Text style={s.btnText}>Ir para o Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Cabeçalho */}
        <Text style={s.brand}>DRE<Text style={s.brandGreen}>Fácil</Text></Text>
        <View style={s.dots}>
          <View style={[s.dot, step >= 1 && s.dotActive]} />
          <View style={[s.dot, step >= 2 && s.dotActive]} />
          <View style={s.dot} />
        </View>

        {/* ── PASSO 1: Tipo de negócio ── */}
        {step === 1 && (
          <>
            <Text style={s.title}>Qual é o seu negócio?</Text>
            <Text style={s.sub}>Vamos configurar as categorias certas para a IA classificar suas transações corretamente desde o início.</Text>

            <TouchableOpacity style={s.dreLink} onPress={() => setDreInfoVisible(true)} activeOpacity={0.7}>
              <Ionicons name="information-circle-outline" size={16} color={colors.green} />
              <Text style={s.dreLinkText}>Você sabe o que é uma DRE?</Text>
            </TouchableOpacity>

            <View style={s.grid}>
              {BIZ_ORDER.map(key => {
                const t = TEMPLATES[key];
                const sel = selectedBiz === key;
                return (
                  <TouchableOpacity key={key} style={[s.bizCard, sel && s.bizCardSel]} onPress={() => setSelectedBiz(key)} activeOpacity={0.75}>
                    <Text style={s.bizEmoji}>{t.icon}</Text>
                    <Text style={[s.bizLabel, sel && s.bizLabelSel]}>{t.label}</Text>
                    {sel && <Ionicons name="checkmark-circle" size={16} color={colors.green} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Opção "Outro" como card largo */}
            <TouchableOpacity
              style={[s.outroPill, selectedBiz === 'outro' && s.outroPillSel]}
              onPress={() => setSelectedBiz('outro')}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 22 }}>🏢</Text>
              <Text style={[s.outroPillText, selectedBiz === 'outro' && s.outroPillTextSel]}>Outro tipo de negócio</Text>
              {selectedBiz === 'outro' && <Ionicons name="checkmark-circle" size={18} color={colors.green} />}
            </TouchableOpacity>

            {/* Campo de descrição aparece apenas para "Outro" */}
            {selectedBiz === 'outro' && (
              <TextInput
                style={s.descBox}
                value={bizDesc}
                onChangeText={setBizDesc}
                placeholder="Ex: Vendo roupas no atacado para revendedores, atuo com transporte escolar, faço manutenção de computadores..."
                placeholderTextColor={colors.t3}
                multiline
                returnKeyType="done"
                blurOnSubmit
              />
            )}

            <TouchableOpacity
              style={[s.btn, (!selectedBiz || (selectedBiz === 'outro' && !bizDesc.trim()) || aiLoading) && s.btnDisabled]}
              onPress={goToStep2}
              disabled={!selectedBiz || (selectedBiz === 'outro' && !bizDesc.trim()) || aiLoading}
            >
              {aiLoading
                ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color="#0a1a0e" size="small" />
                    <Text style={s.btnText}>A IA está criando suas categorias...</Text>
                  </View>
                : <Text style={s.btnText}>Continuar</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── PASSO 2: Editar categorias ── */}
        {step === 2 && (
          <>
            <TouchableOpacity style={s.backRow} onPress={() => setStep(1)}>
              <Ionicons name="arrow-back" size={16} color={colors.t3} />
              <Text style={s.backText}>Voltar</Text>
            </TouchableOpacity>

            <Text style={s.title}>Categorias para{'\n'}{bizLabel}</Text>
            <Text style={s.sub}>Remova as que não usa ou adicione novas. Você pode editar qualquer hora em Configurações.</Text>

            {/* Lista editável */}
            {editCats.map((cat, i) => (
              <View key={`${cat.name}_${i}`} style={s.catRow}>
                <View style={[s.catDot, { backgroundColor: cat.color }]} />
                <Text style={s.catName}>{cat.name}</Text>
                <TouchableOpacity style={s.delBtn} onPress={() => removeCat(cat.name)}>
                  <Ionicons name="close-circle" size={20} color={colors.t3} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Adicionar nova categoria */}
            {showAdd ? (
              <View style={{ marginTop: 16 }}>
                <View style={s.colorGrid}>
                  {CAT_COLORS.map(c => (
                    <TouchableOpacity key={c} onPress={() => setAddColor(c)}>
                      <View style={[s.colorDot, { backgroundColor: c }, addColor === c && s.colorDotSel]} />
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.addRow}>
                  <TextInput
                    style={s.addInput}
                    value={addName}
                    onChangeText={setAddName}
                    placeholder="Nome da categoria"
                    placeholderTextColor={colors.t3}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={addCat}
                  />
                  <TouchableOpacity style={s.addConfirm} onPress={addCat}>
                    <Ionicons name="checkmark" size={20} color="#0a1a0e" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.delBtn, { marginLeft: 2 }]} onPress={() => { setShowAdd(false); setAddName(''); }}>
                    <Ionicons name="close" size={20} color={colors.t3} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={s.addTrigger} onPress={() => setShowAdd(true)}>
                <Ionicons name="add-circle-outline" size={20} color={colors.green} />
                <Text style={s.addTriggerTxt}>Adicionar categoria</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[s.btn, (saving || editCats.length === 0) && s.btnDisabled]}
              onPress={handleSave}
              disabled={saving || editCats.length === 0}
            >
              {saving
                ? <ActivityIndicator color="#0a1a0e" />
                : <Text style={s.btnText}>Usar estas {editCats.length} categorias</Text>}
            </TouchableOpacity>

            {editRules.length > 0 && (
              <Text style={s.hint}>
                {editRules.length} regras automáticas de palavras-chave também serão ativadas.
              </Text>
            )}
          </>
        )}

      </ScrollView>

      {/* ── Modal: O que é uma DRE? ── */}
      <Modal visible={dreInfoVisible} transparent animationType="slide" onRequestClose={() => setDreInfoVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDreInfoVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>O que é uma DRE?</Text>
              <Text style={s.modalSub}>Demonstração do Resultado do Exercício</Text>

              <View style={s.benefitRow}>
                <View style={s.benefitIcon}><Text style={{ fontSize: 18 }}>📊</Text></View>
                <Text style={s.benefitText}>
                  <Text style={s.benefitBold}>Radiografia financeira do mês. </Text>
                  A DRE mostra quanto seu negócio faturou, quanto gastou e qual foi o lucro real — tudo em um só lugar.
                </Text>
              </View>

              <View style={s.benefitRow}>
                <View style={s.benefitIcon}><Text style={{ fontSize: 18 }}>🎯</Text></View>
                <Text style={s.benefitText}>
                  <Text style={s.benefitBold}>Sabe onde está perdendo dinheiro. </Text>
                  Veja quais categorias consomem mais e tome decisões com base em números, não em achismo.
                </Text>
              </View>

              <View style={s.benefitRow}>
                <View style={s.benefitIcon}><Text style={{ fontSize: 18 }}>📈</Text></View>
                <Text style={s.benefitText}>
                  <Text style={s.benefitBold}>Acompanha a evolução do negócio. </Text>
                  Compare meses, identifique tendências e planeje com antecedência.
                </Text>
              </View>

              <View style={s.benefitRow}>
                <View style={s.benefitIcon}><Text style={{ fontSize: 18 }}>⚡</Text></View>
                <Text style={s.benefitText}>
                  <Text style={s.benefitBold}>Aqui é automático. </Text>
                  Importe o extrato do banco e a IA classifica tudo — sua DRE fica pronta em segundos.
                </Text>
              </View>

              <View style={s.divider} />

              <TouchableOpacity style={s.btn} onPress={() => setDreInfoVisible(false)}>
                <Text style={s.btnText}>Entendi, vamos configurar!</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}
