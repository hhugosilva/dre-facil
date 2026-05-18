import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Dimensions, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { fmtBRL, mesLabel } from '../utils/format';
import { saveDREApi } from '../services/api';

const W = Dimensions.get('window').width;

// ─── Donut chart SVG ─────────────────────────────────────────────────────────
function DonutChart({ slices, size = 220 }: { slices: { value: number; color: string }[]; size?: number }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const r = size * 0.37;
  const sw = size * 0.17;
  const c = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  let cumulative = 0;
  return (
    <Svg width={size} height={size}>
      {/* Background track */}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.s3} strokeWidth={sw} />
      {slices.filter(s => s.value > 0).map((slice, i) => {
        const dash = (slice.value / total) * c;
        const offset = c / 4 - cumulative;
        cumulative += dash;
        return (
          <Circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={slice.color}
            strokeWidth={sw - 2}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={offset}
          />
        );
      })}
    </Svg>
  );
}

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function ResultadoScreen({ navigation, route }: any) {
  const { mesKey } = route.params;
  const { allTx, cats, loadData } = useApp();
  const [saving, setSaving]               = useState(false);
  const [selectedMesKey, setSelectedMesKey] = useState<string>(mesKey);
  const [pickerOpen, setPickerOpen]       = useState(false);

  const currentYear = new Date().getFullYear();
  const selYear  = parseInt(selectedMesKey.split('-')[0]);
  const selMonth = parseInt(selectedMesKey.split('-')[1]);

  const neutralCats = useMemo(() => new Set(cats.filter(c => c.neutral).map(c => c.name)), [cats]);
  const included = useMemo(() =>
    allTx.filter(t => t.empresa && !t.isTransfer && !neutralCats.has(t.categoria)),
  [allTx, neutralCats]);
  const receita = useMemo(() => included.filter(t => t.valor > 0).reduce((s, t) => s + t.valor, 0), [included]);

  const custosByCat = useMemo(() => {
    const map: Record<string, number> = {};
    included.filter(t => t.valor < 0).forEach(t => {
      map[t.categoria] = (map[t.categoria] || 0) + Math.abs(t.valor);
    });
    return map;
  }, [included]);

  const totalCusto = useMemo(() => Object.values(custosByCat).reduce((s, v) => s + v, 0), [custosByCat]);
  const lucro = receita - totalCusto;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  const sortedCustos = useMemo(() =>
    Object.entries(custosByCat).sort(([, a], [, b]) => b - a), [custosByCat]);

  const getCatColor = (cat: string) => cats.find(c => c.name === cat)?.color || colors.t3;

  const donutSlices = sortedCustos.map(([cat, val]) => ({ value: val, color: getCatColor(cat) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const byFornRaw: Record<string, number> = {};
      included.filter(t => t.valor < 0 && t.categoria === 'Fornecedores').forEach(t => {
        byFornRaw[t.descricao] = (byFornRaw[t.descricao] || 0) + Math.abs(t.valor);
      });
      await saveDREApi({
        mes_key: selectedMesKey, period: selectedMesKey, receita,
        custos: custosByCat, total_custo: totalCusto, lucro,
        by_forn_raw: byFornRaw, saved_at: new Date().toISOString(),
      });
      await loadData();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      {/* Topbar */}
      <View style={s.topbar}>
        <Text style={s.brand}>DRE<Text style={{ color: colors.green }}>.</Text>mensal</Text>
        <View style={s.pills}>
          {['extratos', 'revisar', 'resultado'].map((lbl, i) => (
            <View key={lbl} style={[s.pill, i === 2 && s.pillActive]}>
              <Text style={[s.pillText, i === 2 && s.pillTextActive]}>{lbl}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.t2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Título com seletor de mês */}
        <TouchableOpacity style={s.pageTitleRow} onPress={() => setPickerOpen(true)} activeOpacity={0.75}>
          <Text style={s.pageTitle}>DRE — {mesLabel(selectedMesKey)}</Text>
          <View style={s.changePeriodBtn}>
            <Ionicons name="calendar-outline" size={13} color={colors.green} />
            <Text style={s.changePeriodText}>Alterar período</Text>
          </View>
        </TouchableOpacity>

        {/* KPIs */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Receita</Text>
            <Text style={[s.kpiVal, { color: colors.green }]}>{fmtBRL(receita)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Lucro</Text>
            <Text style={[s.kpiVal, { color: lucro >= 0 ? colors.green : colors.red }]}>{fmtBRL(lucro)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Margem</Text>
            <Text style={[s.kpiVal, { color: margem >= 0 ? colors.green : colors.red }]}>{margem.toFixed(1)}%</Text>
          </View>
        </View>

        {/* DRE Lines */}
        <View style={s.dreCard}>
          <Text style={s.sectionTitle}>Demonstrativo de Resultado</Text>

          <View style={s.dreRow}>
            <Text style={s.dreLabel}>Receita Bruta</Text>
            <Text style={[s.dreVal, { color: colors.green }]}>{fmtBRL(receita)}</Text>
          </View>

          <Text style={[s.sectionTitle, { marginTop: 14, marginBottom: 6 }]}>Custos Operacionais</Text>

          {sortedCustos.map(([cat, val]) => {
            const catColor = getCatColor(cat);
            return (
              <View key={cat} style={s.dreRow}>
                <View style={s.dreLabelRow}>
                  <View style={[s.catDot, { backgroundColor: catColor }]} />
                  <Text style={s.dreLabel}>{cat} {'>'}</Text>
                </View>
                <Text style={[s.dreVal, { color: colors.red }]}>- {fmtBRL(val)}</Text>
              </View>
            );
          })}

          <View style={[s.dreSep, { marginVertical: 10 }]} />
          <View style={s.dreRow}>
            <Text style={[s.dreLabel, { fontWeight: '700', color: colors.t1 }]}>Total de custos</Text>
            <Text style={[s.dreVal, { color: colors.red, fontWeight: '700' }]}>- {fmtBRL(totalCusto)}</Text>
          </View>
          <View style={[s.dreSep, { marginVertical: 10 }]} />
          <View style={s.dreRow}>
            <Text style={[s.dreLabel, { fontWeight: '700', fontSize: 16, color: colors.t1 }]}>
              {lucro >= 0 ? 'Lucro' : 'Prejuízo'}
            </Text>
            <Text style={[s.dreVal, { fontWeight: '700', fontSize: 16, color: lucro >= 0 ? colors.green : colors.red }]}>
              {lucro >= 0 ? '' : '- '}{fmtBRL(Math.abs(lucro))}
            </Text>
          </View>
          <Text style={s.margemText}>Margem líquida {margem.toFixed(1)}%</Text>
        </View>

        {/* Donut chart */}
        {donutSlices.length > 0 && (
          <View style={s.dreCard}>
            <Text style={s.sectionTitle}>Composição dos Custos</Text>
            <View style={s.donutWrap}>
              <DonutChart slices={donutSlices} size={W - 80} />
            </View>
            {/* Legend */}
            <View style={s.legendWrap}>
              {sortedCustos.map(([cat, val]) => (
                <View key={cat} style={s.legendRow}>
                  <View style={[s.legendDot, { backgroundColor: getCatColor(cat) }]} />
                  <Text style={s.legendText}>{cat} — {fmtBRL(val)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Custos na receita bars */}
        {sortedCustos.length > 0 && (
          <View style={s.dreCard}>
            <Text style={s.sectionTitle}>Custos na receita</Text>
            {sortedCustos.map(([cat, val]) => {
              const catColor = getCatColor(cat);
              const pct = receita > 0 ? (val / receita * 100) : 0;
              return (
                <View key={cat} style={s.barRow}>
                  <View style={s.barLabelRow}>
                    <View style={[s.catDot, { backgroundColor: catColor }]} />
                    <Text style={s.barLabel}>{cat}</Text>
                    <Text style={s.barPct}>{pct.toFixed(1)}%</Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: catColor }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#0a1a0e" />
            : <>
                <Ionicons name="save-outline" size={18} color="#0a1a0e" />
                <Text style={s.saveBtnText}>Salvar DRE</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Modal seletor de período */}
      <Modal visible={pickerOpen} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Período da DRE</Text>
            <Text style={s.modalSub}>Selecione o mês e ano a que este resultado se refere.</Text>

            {/* Ano */}
            <Text style={s.pickerLabel}>ANO</Text>
            <View style={s.pickerRow}>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <TouchableOpacity
                  key={y}
                  style={[s.pickerChip, selYear === y && s.pickerChipActive]}
                  onPress={() => setSelectedMesKey(`${y}-${String(selMonth).padStart(2, '0')}`)}
                >
                  <Text style={[s.pickerChipText, selYear === y && { color: colors.green, fontWeight: '700' }]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mês */}
            <Text style={[s.pickerLabel, { marginTop: 16 }]}>MÊS</Text>
            <View style={s.monthGrid}>
              {MONTHS_SHORT.map((m, i) => {
                const active = selMonth === i + 1;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.pickerChip, active && s.pickerChipActive]}
                    onPress={() => setSelectedMesKey(`${selYear}-${String(i + 1).padStart(2, '0')}`)}
                  >
                    <Text style={[s.pickerChipText, active && { color: colors.green, fontWeight: '700' }]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={s.confirmBtn} onPress={() => setPickerOpen(false)}>
              <Text style={s.confirmBtnText}>Confirmar — {mesLabel(selectedMesKey)}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.bg },
  topbar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: colors.b1 },
  brand:       { fontSize: 15, fontWeight: '700', color: colors.t1 },
  pills:       { flexDirection: 'row', gap: 6 },
  pill:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.b2 },
  pillActive:  { borderColor: colors.green },
  pillText:    { fontSize: 12, color: colors.t3 },
  pillTextActive: { color: colors.green, fontWeight: '600' },
  scroll:          { padding: 16, paddingBottom: 40 },
  pageTitleRow:    { marginBottom: 14 },
  pageTitle:       { fontSize: 22, fontWeight: '700', color: colors.t1 },
  changePeriodBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  changePeriodText:{ fontSize: 12, color: colors.green },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 44 },
  modalHandle:     { width: 36, height: 4, backgroundColor: colors.b3, borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
  modalTitle:      { fontSize: 16, fontWeight: '700', color: colors.t1, marginBottom: 4 },
  modalSub:        { fontSize: 13, color: colors.t2, marginBottom: 16 },
  pickerLabel:     { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 },
  pickerRow:       { flexDirection: 'row', gap: 8 },
  monthGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerChip:      { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.s2, borderRadius: 20, borderWidth: 1, borderColor: colors.b2 },
  pickerChipActive:{ borderColor: colors.green, backgroundColor: `${colors.green}18` },
  pickerChipText:  { fontSize: 14, color: colors.t2 },
  confirmBtn:      { backgroundColor: colors.green, borderRadius: colors.r, padding: 14, alignItems: 'center', marginTop: 20 },
  confirmBtnText:  { fontSize: 14, fontWeight: '700', color: '#0a1a0e' },
  kpiRow:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard:     { flex: 1, backgroundColor: colors.s1, borderRadius: colors.r, padding: 12, borderWidth: 0.5, borderColor: colors.b1, alignItems: 'center' },
  kpiLabel:    { fontSize: 9, color: colors.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  kpiVal:      { fontSize: 14, fontWeight: '700' },
  dreCard:     { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1, marginBottom: 12 },
  sectionTitle:{ fontSize: 10, fontWeight: '600', color: colors.t3, textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 10 },
  dreRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  dreLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dreLabel:    { fontSize: 13, color: colors.t2 },
  dreVal:      { fontSize: 13 },
  dreSep:      { height: 0.5, backgroundColor: colors.b2 },
  catDot:      { width: 8, height: 8, borderRadius: 4 },
  margemText:  { fontSize: 11, color: colors.t3, marginTop: 6, textAlign: 'right' },
  donutWrap:   { alignItems: 'center', marginVertical: 8 },
  legendWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 11, color: colors.t2 },
  barRow:      { marginBottom: 10 },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  barLabel:    { fontSize: 12, color: colors.t2, flex: 1 },
  barPct:      { fontSize: 10, color: colors.t3 },
  barBg:       { height: 5, backgroundColor: colors.s3, borderRadius: 3 },
  barFill:     { height: 5, borderRadius: 3 },
  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.green, borderRadius: colors.r, padding: 16, marginTop: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#0a1a0e' },
});
