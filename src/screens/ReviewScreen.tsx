import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp, AllTx } from '../context/AppContext';
import { Category } from '../theme/index';
import { useAuth } from '../context/AuthContext';
import { fmtBRL } from '../utils/format';
import { getMemory, saveMemory, memKey } from '../utils/storage';

const BANK_COLORS: Record<string, string> = {
  'Nubank': '#820AD1', 'Mercado Pago': '#009ee3', 'Inter': '#FF7A00',
  'Itaú': '#EC7000', 'Bradesco': '#CC092F', 'Santander': '#EC0000',
  'C6 Bank': '#888', 'Sicoob': '#007A3D',
};
function bankColor(src: string, clrs: any) { return BANK_COLORS[src] || clrs.amber; }
function sourceLabel(src: string) {
  if (!src || src === 'Auto-detectar' || src === 'auto') return 'Extrato';
  return src;
}

type SortOrder = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function ReviewScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { mesKey } = route.params;
  const { allTx, setAllTx, cats, setCats, rules, forns, saveConfig } = useApp();
  const [filterSource, setFilterSource] = useState('todos');
  const [filterCats, setFilterCats] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [search, setSearch] = useState('');
  const [catModal, setCatModal] = useState<AllTx | null>(null);
  const [filterModal, setFilterModal] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4CAF50');
  const newCatRef = useRef<TextInput>(null);

  const allCats = cats.map(c => c.name);

  const s = useMemo(() => StyleSheet.create({
    root:           { flex: 1, backgroundColor: colors.bg },
    topbar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: colors.b1 },
    brand:          { fontSize: 15, fontWeight: '700', color: colors.t1 },
    pills:          { flexDirection: 'row', gap: 6 },
    pill:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.b2 },
    pillActive:     { borderColor: colors.green },
    pillText:       { fontSize: 12, color: colors.t3 },
    pillTextActive: { color: colors.green, fontWeight: '600' },
    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    pageTitle:      { fontSize: 24, fontWeight: '700', color: colors.t1 },
    pageSub:        { fontSize: 12, color: colors.t3, marginTop: 2 },
    verDREBtn:      { borderWidth: 1, borderColor: colors.green, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    verDREText:     { color: colors.green, fontSize: 13, fontWeight: '600' },
    searchRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.s1, borderRadius: colors.rs, marginHorizontal: 12, marginBottom: 8, borderWidth: 0.5, borderColor: colors.b1 },
    searchInput:    { flex: 1, padding: 10, fontSize: 13, color: colors.t1 },
    filterBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8 },
    filterBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.s1, borderRadius: 20, borderWidth: 1, borderColor: colors.b2 },
    filterBtnActive:{ borderColor: colors.green },
    filterBtnText:  { fontSize: 13, color: colors.t2 },
    activeChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: `${colors.green}22`, borderRadius: 20, borderWidth: 1, borderColor: `${colors.green}60`, marginRight: 6 },
    activeChipText: { fontSize: 12, color: colors.green },
    dotXs:          { width: 7, height: 7, borderRadius: 4 },
    card:           { backgroundColor: colors.s1, borderRadius: colors.r, padding: 14, borderWidth: 0.5, borderColor: colors.b1 },
    cardExcluded:   { opacity: 0.4 },
    cardTop:        { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    sourceBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 0.5, marginRight: 8 },
    sourceText:     { fontSize: 10, fontWeight: '700' },
    cardDate:       { fontSize: 11, color: colors.t3, flex: 1 },
    cardVal:        { fontSize: 15, fontWeight: '700' },
    cardDesc:       { fontSize: 14, color: colors.t1, lineHeight: 20, marginBottom: 10 },
    cardBottom:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    catChip:        { borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 2, flex: 1 },
    catChipText:    { fontSize: 13 },
    empRow:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
    empLabel:       { fontSize: 11, color: colors.t3 },
    footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 32, backgroundColor: colors.bg, borderTopWidth: 0.5, borderTopColor: colors.b1 },
    footerSummary:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    footerVal:      { fontSize: 13, fontWeight: '700' },
    footerSep:      { color: colors.t3 },
    nextBtn:        { backgroundColor: colors.green, borderRadius: colors.r, paddingHorizontal: 20, paddingVertical: 12 },
    nextBtnText:    { fontSize: 14, fontWeight: '700', color: '#0a1a0e' },
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet:     { backgroundColor: colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    modalHandle:    { width: 36, height: 4, backgroundColor: colors.b3, borderRadius: 99, alignSelf: 'center', marginBottom: 12 },
    modalTitle:     { fontSize: 15, fontWeight: '700', color: colors.t1, marginBottom: 4 },
    modalSub:       { fontSize: 13, color: colors.t2, marginBottom: 12 },
    catOpt:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 12, borderWidth: 0.5, borderColor: colors.b2 },
    catDot:         { width: 10, height: 10, borderRadius: 5 },
    catOptText:     { fontSize: 14, color: colors.t1, flex: 1 },
    fSection:       { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
    fChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.s2, borderRadius: 20, borderWidth: 1, borderColor: colors.b2 },
    fChipActive:    { borderColor: colors.green, backgroundColor: `${colors.green}22` },
    fChipText:      { fontSize: 13, color: colors.t2 },
    fGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    applyBtn:       { backgroundColor: colors.green, borderRadius: colors.r, padding: 14, alignItems: 'center', marginTop: 16 },
    applyBtnText:   { fontSize: 14, fontWeight: '700', color: '#0a1a0e' },
    addCatBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 4, borderRadius: colors.rs, borderWidth: 1, borderColor: colors.b2, borderStyle: 'dashed' },
    addCatBtnText:  { fontSize: 14, color: colors.t3 },
    addCatForm:     { marginTop: 8, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 12, gap: 10 },
    addCatInput:    { backgroundColor: colors.s1, borderRadius: colors.rs, padding: 10, fontSize: 14, color: colors.t1, borderWidth: 0.5, borderColor: colors.b2 },
    colorRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    colorDot:       { width: 26, height: 26, borderRadius: 13 },
    addCatActions:  { flexDirection: 'row', gap: 8, marginTop: 4 },
    addCatCancel:   { flex: 1, padding: 10, borderRadius: colors.rs, borderWidth: 1, borderColor: colors.b2, alignItems: 'center' },
    addCatSave:     { flex: 1, padding: 10, borderRadius: colors.rs, backgroundColor: colors.green, alignItems: 'center' },
  }), [colors]);

  const sources = useMemo(() =>
    [...new Set(allTx.map(t => t.source).filter(Boolean))],
  [allTx]);

  const activeFilterCount =
    (filterSource !== 'todos' ? 1 : 0) +
    (filterCats.length > 0 ? 1 : 0) +
    (sortOrder !== 'newest' ? 1 : 0);

  const filtered = useMemo(() => {
    let list = allTx;

    if (filterSource === 'transferências') {
      list = list.filter(t => t.isTransfer);
    } else if (filterSource === 'não classif.') {
      list = list.filter(t => t.categoria === 'Outros' && !t.isTransfer);
    } else if (filterSource !== 'todos') {
      list = list.filter(t => t.source === filterSource);
    }

    if (filterCats.length > 0) {
      list = list.filter(t => filterCats.includes(t.categoria));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.descricao.toLowerCase().includes(q) ||
        t.source.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortOrder === 'oldest') sorted.sort((a, b) => a.data.localeCompare(b.data));
    else if (sortOrder === 'newest') sorted.sort((a, b) => b.data.localeCompare(a.data));
    else if (sortOrder === 'highest') sorted.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
    else if (sortOrder === 'lowest') sorted.sort((a, b) => Math.abs(a.valor) - Math.abs(b.valor));
    return sorted;
  }, [allTx, filterSource, filterCats, sortOrder, search]);

  const neutralCats = useMemo(() => new Set(cats.filter(c => c.neutral).map(c => c.name)), [cats]);
  const receita = useMemo(() =>
    allTx.filter(t => t.valor > 0 && !neutralCats.has(t.categoria))
      .reduce((s, t) => s + t.valor, 0), [allTx, neutralCats]);
  const custos = useMemo(() =>
    allTx.filter(t => t.valor < 0 && !neutralCats.has(t.categoria))
      .reduce((s, t) => s + Math.abs(t.valor), 0), [allTx, neutralCats]);

  const toggleEmpresa = (tx: AllTx) =>
    setAllTx(allTx.map(t => t.id === tx.id ? { ...t, empresa: !t.empresa } : t));

  const changeCategoria = async (tx: AllTx, cat: string) => {
    setAllTx(allTx.map(t => t.id === tx.id ? { ...t, categoria: cat } : t));
    const mem = await getMemory(user!.id);
    await saveMemory(user!.id, { ...mem, [memKey(tx.descricao)]: cat });
    setCatModal(null);
  };

  const CAT_COLORS = ['#4CAF50','#2196F3','#FF5722','#9C27B0','#FF9800','#00BCD4','#E91E63','#8BC34A','#FFC107','#607D8B','#F44336','#3F51B5'];

  const handleAddCat = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const newCat: Category = { name, color: newCatColor, cost: true };
    const updated = [...cats, newCat];
    setCats(updated);
    await saveConfig(updated, rules, forns);
    if (catModal) await changeCategoria(catModal, name);
    setAddCatOpen(false);
    setNewCatName('');
    setNewCatColor('#4CAF50');
  };

  const clearFilters = () => {
    setFilterSource('todos');
    setFilterCats([]);
    setSortOrder('newest');
  };

  const getCatColor = (cat: string) => cats.find(c => c.name === cat)?.color || colors.t3;

  const renderItem = ({ item }: { item: AllTx }) => {
    const catColor = getCatColor(item.categoria);
    const isOut = item.valor < 0;
    const srcLabel = sourceLabel(item.source);
    const srcColor = bankColor(item.source, colors);

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => setCatModal(item)}
        activeOpacity={0.75}
      >
        <View style={s.cardTop}>
          <View style={[s.sourceBadge, { backgroundColor: `${srcColor}22`, borderColor: `${srcColor}60` }]}>
            <Text style={[s.sourceText, { color: srcColor }]}>{srcLabel}</Text>
          </View>
          <Text style={s.cardDate}>{item.data}</Text>
          <Text style={[s.cardVal, { color: isOut ? colors.red : colors.green }]}>
            {isOut ? '' : '+'}{fmtBRL(Math.abs(item.valor))}
          </Text>
        </View>

        <Text style={s.cardDesc} numberOfLines={2}>
          {item.descricao}
        </Text>

        <View style={s.cardBottom}>
          <View style={[s.catChip, { borderLeftColor: catColor }]}>
            <Text style={[s.catChipText, { color: colors.t2 }]}>
              {item.categoria}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const sortLabels: Record<SortOrder, string> = {
    newest: 'Mais recentes', oldest: 'Mais antigas',
    highest: 'Maior valor', lowest: 'Menor valor',
  };

  return (
    <View style={s.root}>
      {/* Topbar */}
      <View style={s.topbar}>
        <Text style={s.brand}>DRE<Text style={{ color: colors.green }}>Fácil</Text></Text>
        <View style={s.pills}>
          {['extratos', 'revisar', 'resultado'].map((lbl, i) => (
            <View key={lbl} style={[s.pill, i === 1 && s.pillActive]}>
              <Text style={[s.pillText, i === 1 && s.pillTextActive]}>{lbl}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.t2} />
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.pageTitle}>Revisar</Text>
          <Text style={s.pageSub}>{filtered.length} de {allTx.length} lançamentos</Text>
        </View>
        <TouchableOpacity style={s.verDREBtn} onPress={() => navigation.navigate('Resultado', { mesKey })}>
          <Text style={s.verDREText}>Ver DRE →</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={15} color={colors.t3} style={{ marginLeft: 12 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar lançamento..."
          placeholderTextColor={colors.t3}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 10 }}>
            <Ionicons name="close-circle" size={16} color={colors.t3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter bar */}
      <View style={s.filterBar}>
        <TouchableOpacity
          style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
          onPress={() => setFilterModal(true)}
        >
          <Ionicons name="options-outline" size={14} color={activeFilterCount > 0 ? colors.green : colors.t2} />
          <Text style={[s.filterBtnText, activeFilterCount > 0 && { color: colors.green }]}>
            {activeFilterCount > 0 ? `Filtros (${activeFilterCount})` : 'Filtrar'}
          </Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingLeft: 8 }}>
          {filterSource !== 'todos' && (
            <TouchableOpacity style={s.activeChip} onPress={() => setFilterSource('todos')}>
              <Text style={s.activeChipText}>
                {filterSource === 'não classif.' ? 'Não classif.' : filterSource === 'transferências' ? 'Transferências' : sourceLabel(filterSource)}
              </Text>
              <Ionicons name="close" size={11} color={colors.green} />
            </TouchableOpacity>
          )}
          {filterCats.map(cat => (
            <TouchableOpacity key={cat} style={s.activeChip} onPress={() => setFilterCats(prev => prev.filter(c => c !== cat))}>
              <View style={[s.dotXs, { backgroundColor: getCatColor(cat) }]} />
              <Text style={s.activeChipText}>{cat}</Text>
              <Ionicons name="close" size={11} color={colors.green} />
            </TouchableOpacity>
          ))}
          {sortOrder !== 'newest' && (
            <TouchableOpacity style={s.activeChip} onPress={() => setSortOrder('newest')}>
              <Text style={s.activeChipText}>{sortLabels[sortOrder]}</Text>
              <Ionicons name="close" size={11} color={colors.green} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingTop: 4, paddingBottom: 110 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.footerSummary}>
          <Text style={[s.footerVal, { color: colors.green }]}>{fmtBRL(receita)}</Text>
          <Text style={s.footerSep}>·</Text>
          <Text style={[s.footerVal, { color: colors.red }]}>{fmtBRL(custos)}</Text>
        </View>
        <TouchableOpacity style={s.nextBtn} onPress={() => navigation.navigate('Resultado', { mesKey })}>
          <Text style={s.nextBtnText}>Ver DRE →</Text>
        </TouchableOpacity>
      </View>

      {/* Category modal */}
      <Modal visible={!!catModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => { setCatModal(null); setAddCatOpen(false); setNewCatName(''); }}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle} numberOfLines={2}>{catModal?.descricao}</Text>
              <Text style={s.modalSub}>{catModal ? fmtBRL(Math.abs(catModal.valor)) : ''}</Text>
              <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                {allCats.map(cat => {
                  const catColor = getCatColor(cat);
                  const active = catModal?.categoria === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.catOpt, { marginBottom: 6 }, active && { borderColor: `${catColor}80` }]}
                      onPress={() => catModal && changeCategoria(catModal, cat)}
                    >
                      <View style={[s.catDot, { backgroundColor: catColor }]} />
                      <Text style={[s.catOptText, active && { color: catColor }]}>{cat}</Text>
                      {active && <Ionicons name="checkmark" size={16} color={catColor} style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  );
                })}

                {/* Adicionar nova categoria */}
                {!addCatOpen ? (
                  <TouchableOpacity style={s.addCatBtn} onPress={() => { setAddCatOpen(true); setTimeout(() => newCatRef.current?.focus(), 100); }}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.t3} />
                    <Text style={s.addCatBtnText}>Nova categoria</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.addCatForm}>
                    <TextInput
                      ref={newCatRef}
                      style={s.addCatInput}
                      placeholder="Nome da categoria"
                      placeholderTextColor={colors.t3}
                      value={newCatName}
                      onChangeText={setNewCatName}
                    />
                    <View style={s.colorRow}>
                      {CAT_COLORS.map(c => (
                        <TouchableOpacity key={c} onPress={() => setNewCatColor(c)}>
                          <View style={[s.colorDot, { backgroundColor: c }, newCatColor === c && { borderWidth: 3, borderColor: colors.t1 }]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={s.addCatActions}>
                      <TouchableOpacity style={s.addCatCancel} onPress={() => { setAddCatOpen(false); setNewCatName(''); }}>
                        <Text style={{ color: colors.t2, fontSize: 13 }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.addCatSave} onPress={handleAddCat}>
                        <Text style={{ color: '#0a1a0e', fontSize: 13, fontWeight: '700' }}>Salvar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Filter modal */}
      <Modal visible={filterModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFilterModal(false)}>
          <View style={[s.modalSheet, { maxHeight: '88%', paddingBottom: 20 }]}>
            <View style={s.modalHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Text style={[s.modalTitle, { marginBottom: 0 }]}>Filtros</Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={clearFilters} style={{ marginLeft: 'auto' }}>
                  <Text style={{ color: colors.red, fontSize: 13 }}>Limpar tudo</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Source / bank */}
              <Text style={s.fSection}>CONTA / BANCO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
                {(['todos', ...sources, 'não classif.', 'transferências'] as string[]).map(src => {
                  const active = filterSource === src;
                  const isBank = src !== 'todos' && src !== 'não classif.' && src !== 'transferências';
                  const bc = isBank ? bankColor(src, colors) : colors.t3;
                  return (
                    <TouchableOpacity
                      key={src}
                      style={[s.fChip, active && { borderColor: isBank ? bc : colors.green, backgroundColor: `${isBank ? bc : colors.green}22` }]}
                      onPress={() => setFilterSource(src)}
                    >
                      {isBank && <View style={[s.dotXs, { backgroundColor: bc }]} />}
                      <Text style={[s.fChipText, active && { color: isBank ? bc : colors.green, fontWeight: '600' }]}>
                        {src === 'todos' ? 'Todos' : src === 'não classif.' ? 'Não classif.' : src === 'transferências' ? 'Transferências' : sourceLabel(src)}
                      </Text>
                      {active && <Ionicons name="checkmark" size={12} color={isBank ? bc : colors.green} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Category */}
              <Text style={s.fSection}>CATEGORIA</Text>
              <View style={s.fGrid}>
                {allCats.map(cat => {
                  const active = filterCats.includes(cat);
                  const cc = getCatColor(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.fChip, active && { borderColor: cc, backgroundColor: `${cc}22` }]}
                      onPress={() => setFilterCats(prev => active ? prev.filter(c => c !== cat) : [...prev, cat])}
                    >
                      <View style={[s.dotXs, { backgroundColor: cc }]} />
                      <Text style={[s.fChipText, active && { color: cc, fontWeight: '600' }]}>{cat}</Text>
                      {active && <Ionicons name="checkmark" size={12} color={cc} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sort */}
              <Text style={s.fSection}>ORDENAR POR</Text>
              <View style={s.fGrid}>
                {([
                  { key: 'newest' as SortOrder, label: 'Mais recentes' },
                  { key: 'oldest' as SortOrder, label: 'Mais antigas' },
                  { key: 'highest' as SortOrder, label: 'Maior valor' },
                  { key: 'lowest' as SortOrder, label: 'Menor valor' },
                ]).map(opt => {
                  const active = sortOrder === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[s.fChip, active && s.fChipActive]}
                      onPress={() => setSortOrder(opt.key)}
                    >
                      <Text style={[s.fChipText, active && { color: colors.green, fontWeight: '600' }]}>{opt.label}</Text>
                      {active && <Ionicons name="checkmark" size={12} color={colors.green} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity style={s.applyBtn} onPress={() => setFilterModal(false)}>
              <Text style={s.applyBtnText}>Ver {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

