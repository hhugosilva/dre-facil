import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Category } from '../theme';
import { Rule } from '../context/AppContext';

// ─── Templates por tipo de negócio ────────────────────────────────────────────
type BizTemplate = {
  label: string;
  icon: string;
  cats: Category[];
  rules: Rule[];
};

const TEMPLATES: Record<string, BizTemplate> = {
  restaurante: {
    label: 'Restaurante\nAlimentação',
    icon: '🍽️',
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
      { keyword: 'GOOMER',     category: 'Receita' },
      { keyword: 'GAS',        category: 'Energia / Água / Gás' },
      { keyword: 'COMGAS',     category: 'Energia / Água / Gás' },
      { keyword: 'SABESP',     category: 'Energia / Água / Gás' },
      { keyword: 'ENEL',       category: 'Energia / Água / Gás' },
      { keyword: 'CPFL',       category: 'Energia / Água / Gás' },
      { keyword: 'ALUGUEL',    category: 'Aluguel' },
      { keyword: 'CONDOMINIO', category: 'Aluguel' },
      { keyword: 'SALARIO',    category: 'Funcionários / Salários' },
      { keyword: 'FOLHA',      category: 'Funcionários / Salários' },
      { keyword: 'INSS',       category: 'Impostos / Taxas' },
      { keyword: 'DAS',        category: 'Impostos / Taxas' },
      { keyword: 'DARF',       category: 'Impostos / Taxas' },
      { keyword: 'GOOGLE ADS', category: 'Marketing' },
      { keyword: 'FACEBOOK',   category: 'Marketing' },
      { keyword: 'META ADS',   category: 'Marketing' },
    ],
  },
  comercio: {
    label: 'Comércio\nLoja',
    icon: '🛍️',
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
      { keyword: 'CIELO',         category: 'Receita' },
      { keyword: 'FRETE',         category: 'Frete / Logística' },
      { keyword: 'CORREIOS',      category: 'Frete / Logística' },
      { keyword: 'JADLOG',        category: 'Frete / Logística' },
      { keyword: 'TOTAL EXPRESS', category: 'Frete / Logística' },
      { keyword: 'INSS',          category: 'Impostos / Taxas' },
      { keyword: 'DAS',           category: 'Impostos / Taxas' },
      { keyword: 'ALUGUEL',       category: 'Aluguel' },
      { keyword: 'GOOGLE ADS',    category: 'Marketing' },
      { keyword: 'FACEBOOK',      category: 'Marketing' },
      { keyword: 'ENEL',          category: 'Energia / Água' },
      { keyword: 'CPFL',          category: 'Energia / Água' },
      { keyword: 'SABESP',        category: 'Energia / Água' },
    ],
  },
  servicos: {
    label: 'Serviços\nConsultoria',
    icon: '💼',
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
      { keyword: '99POP',      category: 'Transporte' },
      { keyword: 'ALUGUEL',    category: 'Aluguel / Coworking' },
      { keyword: 'COWORKING',  category: 'Aluguel / Coworking' },
      { keyword: 'MICROSOFT',  category: 'Software / Assinaturas' },
      { keyword: 'GOOGLE',     category: 'Software / Assinaturas' },
      { keyword: 'SLACK',      category: 'Software / Assinaturas' },
      { keyword: 'DROPBOX',    category: 'Software / Assinaturas' },
      { keyword: 'GOOGLE ADS', category: 'Marketing' },
      { keyword: 'FACEBOOK',   category: 'Marketing' },
      { keyword: 'UDEMY',      category: 'Treinamento / Cursos' },
      { keyword: 'ALURA',      category: 'Treinamento / Cursos' },
    ],
  },
  freelancer: {
    label: 'Freelancer\nAutônomo',
    icon: '💻',
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
      { keyword: '99POP',      category: 'Transporte' },
      { keyword: 'UDEMY',      category: 'Cursos / Capacitação' },
      { keyword: 'ALURA',      category: 'Cursos / Capacitação' },
      { keyword: 'COURSERA',   category: 'Cursos / Capacitação' },
      { keyword: 'INTERNET',   category: 'Home Office' },
      { keyword: 'ENEL',       category: 'Home Office' },
      { keyword: 'CPFL',       category: 'Home Office' },
      { keyword: 'GOOGLE ADS', category: 'Marketing / Site' },
      { keyword: 'FACEBOOK',   category: 'Marketing / Site' },
    ],
  },
  saude: {
    label: 'Saúde\nClínica',
    icon: '🏥',
    cats: [
      { name: 'Materiais / Insumos',   color: '#f87171', cost: true },
      { name: 'Funcionários / Salários', color: '#60a5fa', cost: true },
      { name: 'Aluguel / Consultório', color: '#a78bfa', cost: true },
      { name: 'Equipamentos',          color: '#94a3b8', cost: true },
      { name: 'Energia / Água',        color: '#fbbf24', cost: true },
      { name: 'Marketing',             color: '#34d399', cost: true },
      { name: 'Impostos / Taxas',      color: '#f472b6', cost: true },
      { name: 'Software / Sistema',    color: '#22d3ee', cost: true },
    ],
    rules: [
      { keyword: 'INSS',     category: 'Impostos / Taxas' },
      { keyword: 'DAS',      category: 'Impostos / Taxas' },
      { keyword: 'CRM',      category: 'Impostos / Taxas' },
      { keyword: 'CFM',      category: 'Impostos / Taxas' },
      { keyword: 'ALUGUEL',  category: 'Aluguel / Consultório' },
      { keyword: 'SABESP',   category: 'Energia / Água' },
      { keyword: 'ENEL',     category: 'Energia / Água' },
      { keyword: 'CPFL',     category: 'Energia / Água' },
      { keyword: 'FOLHA',    category: 'Funcionários / Salários' },
      { keyword: 'SALARIO',  category: 'Funcionários / Salários' },
      { keyword: 'FACEBOOK', category: 'Marketing' },
    ],
  },
  construcao: {
    label: 'Construção\nReformas',
    icon: '🔨',
    cats: [
      { name: 'Materiais de Construção', color: '#f87171', cost: true },
      { name: 'Mão de Obra',             color: '#60a5fa', cost: true },
      { name: 'Ferramentas',             color: '#94a3b8', cost: true },
      { name: 'Transporte / Frete',      color: '#fb923c', cost: true },
      { name: 'Impostos / Taxas',        color: '#f472b6', cost: true },
      { name: 'Marketing',               color: '#34d399', cost: true },
    ],
    rules: [
      { keyword: 'INSS',         category: 'Impostos / Taxas' },
      { keyword: 'DAS',          category: 'Impostos / Taxas' },
      { keyword: 'LEROY',        category: 'Materiais de Construção' },
      { keyword: 'TELHANORTE',   category: 'Materiais de Construção' },
      { keyword: 'CASTORAMA',    category: 'Materiais de Construção' },
      { keyword: 'CORREIOS',     category: 'Transporte / Frete' },
      { keyword: 'FRETE',        category: 'Transporte / Frete' },
      { keyword: 'FACEBOOK',     category: 'Marketing' },
    ],
  },
  educacao: {
    label: 'Educação\nCursos',
    icon: '📚',
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
      { keyword: 'EDUZZ',      category: 'Plataforma / Software' },
      { keyword: 'KIWIFY',     category: 'Plataforma / Software' },
      { keyword: 'INSS',       category: 'Impostos / Taxas' },
      { keyword: 'DAS',        category: 'Impostos / Taxas' },
      { keyword: 'YOUTUBE',    category: 'Marketing' },
      { keyword: 'GOOGLE ADS', category: 'Marketing' },
      { keyword: 'FACEBOOK',   category: 'Marketing' },
    ],
  },
  outro: {
    label: 'Outro\nNegócio',
    icon: '🏢',
    cats: [
      { name: 'Fornecedores',          color: '#f87171', cost: true },
      { name: 'Funcionários / Salários', color: '#60a5fa', cost: true },
      { name: 'Aluguel',               color: '#a78bfa', cost: true },
      { name: 'Energia / Água',        color: '#fbbf24', cost: true },
      { name: 'Marketing',             color: '#34d399', cost: true },
      { name: 'Impostos / Taxas',      color: '#f472b6', cost: true },
      { name: 'Operacional',           color: '#94a3b8', cost: true },
    ],
    rules: [
      { keyword: 'INSS',       category: 'Impostos / Taxas' },
      { keyword: 'DAS',        category: 'Impostos / Taxas' },
      { keyword: 'DARF',       category: 'Impostos / Taxas' },
      { keyword: 'ALUGUEL',    category: 'Aluguel' },
      { keyword: 'GOOGLE ADS', category: 'Marketing' },
      { keyword: 'FACEBOOK',   category: 'Marketing' },
      { keyword: 'SALARIO',    category: 'Funcionários / Salários' },
      { keyword: 'FOLHA',      category: 'Funcionários / Salários' },
    ],
  },
};

const BIZ_ORDER = ['restaurante','comercio','servicos','freelancer','saude','construcao','educacao','outro'];

// ─── Tela ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { completeOnboarding } = useApp();

  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [selectedBiz, setSelectedBiz] = useState<string | null>(null);
  const [enabledCats, setEnabledCats] = useState<Set<string>>(new Set());
  const [saving, setSaving]           = useState(false);

  const s = useMemo(() => StyleSheet.create({
    root:       { flex: 1, backgroundColor: colors.bg },
    scroll:     { flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 40 },
    header:     { marginBottom: 28 },
    brand:      { fontSize: 22, fontWeight: '900', color: colors.t1 },
    brandGreen: { color: colors.green },
    step:       { fontSize: 12, color: colors.t3, marginTop: 4, fontWeight: '600', letterSpacing: 0.5 },
    title:      { fontSize: 24, fontWeight: '800', color: colors.t1, marginBottom: 6, marginTop: 20 },
    sub:        { fontSize: 14, color: colors.t2, lineHeight: 21 },
    grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
    bizCard:    { width: '47%', backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 1.5, borderColor: colors.b2, alignItems: 'center', gap: 6 },
    bizCardSel: { borderColor: colors.green, backgroundColor: `${colors.green}10` },
    bizEmoji:   { fontSize: 32 },
    bizLabel:   { fontSize: 12, fontWeight: '700', color: colors.t2, textAlign: 'center', lineHeight: 17 },
    bizLabelSel:{ color: colors.green },
    catRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.b1 },
    catDot:     { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
    catName:    { flex: 1, fontSize: 14, color: colors.t1, fontWeight: '500' },
    check:      { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.b3, alignItems: 'center', justifyContent: 'center' },
    checkOn:    { backgroundColor: colors.green, borderColor: colors.green },
    btn:        { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center', marginTop: 24 },
    btnText:    { color: '#0a1a0e', fontWeight: '800', fontSize: 15 },
    btnDisabled:{ opacity: 0.4 },
    backRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    backText:   { fontSize: 13, color: colors.t3 },
    successWrap:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    successIcon:{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.green}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    successTitle:{ fontSize: 26, fontWeight: '800', color: colors.t1, textAlign: 'center', marginBottom: 10 },
    successSub: { fontSize: 14, color: colors.t2, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    dots:       { flexDirection: 'row', gap: 6, marginBottom: 28 },
    dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.b3 },
    dotActive:  { backgroundColor: colors.green, width: 20 },
    hint:       { fontSize: 12, color: colors.t3, marginTop: 16, textAlign: 'center', lineHeight: 18 },
  }), [colors]);

  const goToStep2 = () => {
    if (!selectedBiz) return;
    const tmpl = TEMPLATES[selectedBiz];
    setEnabledCats(new Set(tmpl.cats.map(c => c.name)));
    setStep(2);
  };

  const handleSave = async () => {
    if (!selectedBiz) return;
    setSaving(true);
    try {
      const tmpl = TEMPLATES[selectedBiz];
      const finalCats = tmpl.cats.filter(c => enabledCats.has(c.name));
      const finalRules = tmpl.rules.filter(r => enabledCats.has(r.category) || r.category === 'Receita');
      await completeOnboarding(selectedBiz, finalCats, finalRules, []);
      setStep(3);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
    setSaving(false);
  };

  const toggleCat = (name: string) => {
    setEnabledCats(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
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
          Suas categorias estão configuradas.{'\n'}
          Importe seu primeiro extrato e a IA{'\n'}já vai classificar corretamente.
        </Text>
        <TouchableOpacity style={s.btn} onPress={() => {/* AppContext businessType já setado, navigator re-renderiza */}}>
          <Text style={s.btnText}>Ir para o Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo + passos */}
        <View style={s.header}>
          <Text style={s.brand}>DRE<Text style={s.brandGreen}>Fácil</Text></Text>
          <View style={s.dots}>
            <View style={[s.dot, step >= 1 && s.dotActive]} />
            <View style={[s.dot, step >= 2 && s.dotActive]} />
            <View style={[s.dot]} />
          </View>
          {step === 1 && (
            <>
              <Text style={s.title}>Qual é o seu negócio?</Text>
              <Text style={s.sub}>Vamos configurar as categorias certas para que a IA classifique suas transações corretamente desde o início.</Text>
            </>
          )}
          {step === 2 && (
            <>
              <TouchableOpacity style={s.backRow} onPress={() => setStep(1)}>
                <Ionicons name="arrow-back" size={16} color={colors.t3} />
                <Text style={s.backText}>Voltar</Text>
              </TouchableOpacity>
              <Text style={s.title}>Categorias sugeridas</Text>
              <Text style={s.sub}>Estas categorias foram criadas para {TEMPLATES[selectedBiz!].label.replace('\n', ' ')}. Desmarque as que não se aplicam.</Text>
            </>
          )}
        </View>

        {/* ── Step 1: Seleção do tipo de negócio ── */}
        {step === 1 && (
          <>
            <View style={s.grid}>
              {BIZ_ORDER.map(key => {
                const t = TEMPLATES[key];
                const sel = selectedBiz === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.bizCard, sel && s.bizCardSel]}
                    onPress={() => setSelectedBiz(key)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.bizEmoji}>{t.icon}</Text>
                    <Text style={[s.bizLabel, sel && s.bizLabelSel]}>{t.label}</Text>
                    {sel && <Ionicons name="checkmark-circle" size={16} color={colors.green} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.btn, !selectedBiz && s.btnDisabled]}
              onPress={goToStep2}
              disabled={!selectedBiz}
            >
              <Text style={s.btnText}>Continuar</Text>
            </TouchableOpacity>
            <Text style={s.hint}>Você pode editar categorias e adicionar mais depois em Configurações.</Text>
          </>
        )}

        {/* ── Step 2: Toggle de categorias ── */}
        {step === 2 && selectedBiz && (
          <>
            {TEMPLATES[selectedBiz].cats.map(cat => {
              const on = enabledCats.has(cat.name);
              return (
                <TouchableOpacity key={cat.name} style={s.catRow} onPress={() => toggleCat(cat.name)} activeOpacity={0.7}>
                  <View style={[s.catDot, { backgroundColor: cat.color }]} />
                  <Text style={s.catName}>{cat.name}</Text>
                  <View style={[s.check, on && s.checkOn]}>
                    {on && <Ionicons name="checkmark" size={14} color="#0a1a0e" />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[s.btn, (saving || enabledCats.size === 0) && s.btnDisabled]}
              onPress={handleSave}
              disabled={saving || enabledCats.size === 0}
            >
              {saving
                ? <ActivityIndicator color="#0a1a0e" />
                : <Text style={s.btnText}>Usar estas categorias</Text>}
            </TouchableOpacity>
            <Text style={s.hint}>
              {TEMPLATES[selectedBiz].rules.length} regras automáticas também serão ativadas para palavras-chave comuns do seu setor.
            </Text>
          </>
        )}

      </ScrollView>
    </View>
  );
}
