import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, RefreshControl, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useApp, HistEntry } from '../context/AppContext';
import { fmtBRL, mesLabel, mesLabelFull } from '../utils/format';
import { deleteDREApi, getDREApi } from '../services/api';
import { getPrevYear, PrevYearData } from '../utils/storage';

const W = Dimensions.get('window').width;
const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Gráfico de área/linha ────────────────────────────────────────────────────
function MonthlyChart({
  actual, projected, width, height, colors,
}: {
  actual: number[];     // 12 posições, NaN = sem dado
  projected: number[];  // 12 posições, NaN = sem projeção
  width: number;
  height: number;
  colors: any;
}) {
  const PL = 40, PR = 10, PT = 14, PB = 26;
  const cW = width - PL - PR;
  const cH = height - PT - PB;

  const allVals = [...actual, ...projected].filter(v => isFinite(v) && v > 0);
  if (!allVals.length) return null;

  const maxVal = Math.max(...allVals) * 1.18;
  const xOf = (i: number) => PL + (i / 11) * cW;
  const yOf = (v: number) => PT + cH - (v / maxVal) * cH;
  const fmtY = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v.toFixed(0)}`;

  // Pontos reais
  const realPts = actual
    .map((v, i) => ({ x: xOf(i), y: isFinite(v) ? yOf(v) : null, i }))
    .filter((p): p is { x: number; y: number; i: number } => p.y !== null);

  // Pontos projetados
  const projPts = projected
    .map((v, i) => ({ x: xOf(i), y: isFinite(v) ? yOf(v) : null, i }))
    .filter((p): p is { x: number; y: number; i: number } => p.y !== null);

  // Path da linha real
  const linePath = realPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Path da área preenchida
  const bottom = PT + cH;
  const areaPath = realPts.length > 1
    ? `${linePath} L${realPts[realPts.length - 1].x.toFixed(1)},${bottom} L${realPts[0].x.toFixed(1)},${bottom} Z`
    : '';

  // Path da projeção (conecta a partir do último ponto real)
  const projConnected = realPts.length > 0 && projPts.length > 0
    ? [realPts[realPts.length - 1], ...projPts]
    : projPts;
  const projPath = projConnected.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="areaGrd" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.green} stopOpacity="0.28" />
          <Stop offset="100%" stopColor={colors.green} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Linhas de grade horizontais */}
      {[0.25, 0.5, 0.75, 1.0].map(pct => (
        <Line key={pct}
          x1={PL} y1={PT + cH * (1 - pct)}
          x2={PL + cW} y2={PT + cH * (1 - pct)}
          stroke={colors.b1} strokeWidth={0.5}
        />
      ))}

      {/* Labels Y */}
      {[0.5, 1.0].map(pct => (
        <SvgText key={pct}
          x={PL - 4} y={PT + cH * (1 - pct) + 4}
          fontSize={8} fill={colors.t3} textAnchor="end"
        >
          {fmtY(maxVal * pct)}
        </SvgText>
      ))}

      {/* Área preenchida */}
      {!!areaPath && <Path d={areaPath} fill="url(#areaGrd)" />}

      {/* Linha real */}
      {!!linePath && (
        <Path d={linePath} fill="none" stroke={colors.green}
          strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* Linha de projeção tracejada */}
      {!!projPath && (
        <Path d={projPath} fill="none" stroke={colors.t2}
          strokeWidth={1.5} strokeDasharray="5,4" strokeLinecap="round" />
      )}

      {/* Círculos nos pontos reais */}
      {realPts.map(p => (
        <Circle key={p.i} cx={p.x} cy={p.y} r={3} fill={colors.green} />
      ))}

      {/* Labels X - meses */}
      {MONTH_LABELS.map((m, i) => (
        <SvgText key={i} x={xOf(i)} y={height - 4}
          fontSize={9} fill={colors.t3} textAnchor="middle"
        >
          {m}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { hist, loadData } = useApp();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail]         = useState<HistEntry | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [prevYear, setPrevYear]     = useState<PrevYearData | null>(null);
  const [hideValues, setHideValues] = useState(false);

  const mask = (v: number) => hideValues ? '••••' : fmtBRL(v);
  const maskPct = (v: number) => hideValues ? '—' : `${v.toFixed(1)}%`;

  const s = useMemo(() => StyleSheet.create({
    root:          { flex: 1, backgroundColor: colors.bg },
    topbar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, borderBottomWidth: 0.5, borderBottomColor: colors.b1 },
    brand:         { fontSize: 16, fontWeight: '700', color: colors.t1, letterSpacing: 0.05 },
    scroll:        { padding: 16, paddingBottom: 40 },
    dashHeader:    { marginBottom: 16 },
    dashGreeting:  { fontSize: 24, fontWeight: '700', color: colors.t1 },
    dashEmpresa:   { fontSize: 13, color: colors.green, marginTop: 2, fontWeight: '500' },
    dashSub:       { fontSize: 13, color: colors.t2, marginTop: 4 },
    kpiGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    kpiCard:       { flex: 1, minWidth: '45%', backgroundColor: colors.s1, borderRadius: colors.r, padding: 14, borderWidth: 0.5, borderColor: colors.b1 },
    kpiLabel:      { fontSize: 10, color: colors.t3, letterSpacing: 0.07, textTransform: 'uppercase', marginBottom: 6 },
    kpiVal:        { fontSize: 17, fontWeight: '600', lineHeight: 22 },
    kpiSub:        { fontSize: 10, color: colors.t3, marginTop: 4 },
    chartCard:     { backgroundColor: colors.s1, borderRadius: colors.r, padding: 14, borderWidth: 0.5, borderColor: colors.b1, marginBottom: 14 },
    chartHeader:   { marginBottom: 8 },
    sectionTitle:  { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.1, textTransform: 'uppercase' },
    chartLegend:   { flexDirection: 'row', gap: 16, marginTop: 10 },
    legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot:     { width: 8, height: 8, borderRadius: 4 },
    legendDash:    { width: 16, height: 2, backgroundColor: colors.t2, borderRadius: 1 },
    legendText:    { fontSize: 10, color: colors.t2 },
    novaDreBtn:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 1, borderColor: `${colors.green}40`, marginBottom: 14 },
    novaDreIcon:   { width: 44, height: 44, borderRadius: 10, backgroundColor: `${colors.green}18`, alignItems: 'center', justifyContent: 'center' },
    novaDreTitle:  { fontSize: 15, fontWeight: '600', color: colors.t1 },
    novaDreSub:    { fontSize: 12, color: colors.t2, marginTop: 2 },
    listTitle:     { fontSize: 13, fontWeight: '600', color: colors.t1, marginBottom: 10 },
    mesCard:       { backgroundColor: colors.s1, borderRadius: colors.r, padding: 14, borderWidth: 0.5, borderColor: colors.b1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    mesLeft:       {},
    mesMes:        { fontSize: 11, color: colors.t3, marginBottom: 3 },
    mesLucro:      { fontSize: 18, fontWeight: '600' },
    mesMargem:     { fontSize: 10, color: colors.t3, marginTop: 3 },
    mesRight:      { alignItems: 'flex-end' },
    mesRec:        { fontSize: 11, color: colors.green },
    mesCst:        { fontSize: 11, color: colors.red, marginTop: 3 },
    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet:    { backgroundColor: colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    modalHandle:   { width: 36, height: 4, backgroundColor: colors.b3, borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
    modalTitle:    { fontSize: 16, fontWeight: '600', color: colors.t1, marginBottom: 14 },
    detailGrid:    { flexDirection: 'row', gap: 8, marginBottom: 16 },
    detailCard:    { flex: 1, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 10 },
    detailLabel:   { fontSize: 9, color: colors.t3, textTransform: 'uppercase', letterSpacing: 0.06, marginBottom: 4 },
    detailVal:     { fontSize: 15, fontWeight: '600' },
    detailRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: colors.b1 },
    detailRowLabel:{ fontSize: 12, color: colors.t2 },
    detailRowVal:  { fontSize: 12, color: colors.red },
  }), [colors]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([loadData(), getPrevYear(user!.id).then(setPrevYear)]).finally(() => setLoading(false));
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), getPrevYear(user!.id).then(setPrevYear)]);
    setRefreshing(false);
  };

  const handleDelete = (mesKey: string) => {
    Alert.alert('Apagar DRE', `Apagar ${mesLabel(mesKey)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        try { await deleteDREApi(mesKey); await loadData(); }
        catch { Alert.alert('Erro', 'Não foi possível apagar.'); }
      }},
    ]);
  };

  const showDetail = async (mesKey: string) => {
    setLoadingDetail(true);
    try {
      const { data } = await getDREApi(mesKey);
      setDetail(data.dre || data);
    } catch {}
    setLoadingDetail(false);
  };

  const totalReceita = hist.reduce((s, h) => s + h.receita, 0);
  const totalCusto   = hist.reduce((s, h) => s + h.total_custo, 0);
  const totalLucro   = hist.reduce((s, h) => s + h.lucro, 0);
  const melhor       = hist.length ? [...hist].sort((a, b) => b.lucro - a.lucro)[0] : null;

  // Monta arrays de 12 posições para o gráfico (ano atual)
  const currentYear = new Date().getFullYear();
  const prevYearNum = currentYear - 1;

  const actualData = Array<number>(12).fill(NaN);
  hist.forEach(h => {
    const [y, m] = h.mes_key.split('-');
    if (Number(y) === currentYear) actualData[Number(m) - 1] = h.receita;
  });

  const prevData = Array<number>(12).fill(NaN);
  if (prevYear && prevYear.year === prevYearNum) {
    Object.entries(prevYear.months).forEach(([m, v]) => {
      prevData[Number(m) - 1] = v.receita;
    });
  }

  // Fator de crescimento: média atual vs média mesmo período ano passado
  const sharedIdx = actualData.map((v, i) => (!isNaN(v) && !isNaN(prevData[i])) ? i : -1).filter(i => i >= 0);
  let growthFactor = 1;
  if (sharedIdx.length > 0) {
    const cSum = sharedIdx.reduce((s, i) => s + actualData[i], 0);
    const pSum = sharedIdx.reduce((s, i) => s + prevData[i], 0);
    if (pSum > 0) growthFactor = cSum / pSum;
  }

  // Projeção: meses sem dado real, usando ano anterior escalado
  const projectedData = actualData.map((v, i) => {
    if (!isNaN(v)) return NaN;
    if (isNaN(prevData[i])) return NaN;
    return prevData[i] * growthFactor;
  });

  const hasChart = actualData.some(v => !isNaN(v));
  const hasProjection = projectedData.some(v => !isNaN(v));

  return (
    <View style={s.root}>
      {/* Topbar */}
      <View style={s.topbar}>
        <Text style={s.brand}>DRE<Text style={{ color: colors.green }}>Fácil</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <TouchableOpacity onPress={() => setHideValues(v => !v)}>
            <Ionicons name={hideValues ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.t3} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Sair', 'Deseja sair?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: logout },
          ])}>
            <Ionicons name="log-out-outline" size={22} color={colors.t3} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        >
          <View style={s.dashHeader}>
            <Text style={s.dashGreeting}>
              Olá, {user?.nome?.split(' ')[0] || 'bem-vindo'} 👋
            </Text>
            {user?.nome_empresa && (
              <Text style={s.dashEmpresa}>{user.nome_empresa}</Text>
            )}
            <Text style={s.dashSub}>
              {hist.length
                ? `${hist.length} ${hist.length === 1 ? 'mês salvo' : 'meses salvos'}`
                : 'Nenhum mês salvo ainda — crie uma Nova DRE'}
            </Text>
          </View>

          {/* KPIs */}
          <View style={s.kpiGrid}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Faturamento</Text>
              <Text style={[s.kpiVal, { color: colors.green }]}>{mask(totalReceita)}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Lucro</Text>
              <Text style={[s.kpiVal, { color: totalLucro >= 0 ? colors.green : colors.red }]}>{mask(totalLucro)}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Custo</Text>
              <Text style={[s.kpiVal, { color: colors.red }]}>{mask(totalCusto)}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Melhor mês</Text>
              <Text style={[s.kpiVal, { color: colors.green, fontSize: 14 }]}>{melhor ? mask(melhor.lucro) : '—'}</Text>
              {melhor && <Text style={s.kpiSub}>{melhor.mes_key}</Text>}
            </View>
          </View>

          {/* Gráfico de evolução */}
          {hasChart && (
            <View style={s.chartCard}>
              <View style={s.chartHeader}>
                <Text style={s.sectionTitle}>Evolução anual — faturamento</Text>
              </View>
              <MonthlyChart
                actual={actualData}
                projected={projectedData}
                width={W - 64}
                height={180}
                colors={colors}
              />
              <View style={s.chartLegend}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: colors.green }]} />
                  <Text style={s.legendText}>Realizado {currentYear}</Text>
                </View>
                {hasProjection && (
                  <View style={s.legendItem}>
                    <View style={[s.legendDash]} />
                    <Text style={s.legendText}>Projeção (base {prevYearNum})</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Lista de meses */}
          {hist.length > 0 && (
            <>
              <Text style={s.listTitle}>Meses salvos</Text>
              {[...hist].reverse().map(h => {
                const margin = h.receita > 0 ? (h.lucro / h.receita * 100) : 0;
                return (
                  <TouchableOpacity key={h.mes_key} style={s.mesCard} onPress={() => showDetail(h.mes_key)}>
                    <View style={s.mesLeft}>
                      <Text style={s.mesMes}>{mesLabelFull(h.mes_key)}</Text>
                      <Text style={[s.mesLucro, { color: h.lucro >= 0 ? colors.green : colors.red }]}>
                        {hideValues ? '••••' : `${h.lucro >= 0 ? '+' : ''}${fmtBRL(h.lucro)}`}
                      </Text>
                      <Text style={s.mesMargem}>margem {maskPct(margin)}</Text>
                    </View>
                    <View style={s.mesRight}>
                      <Text style={s.mesRec}>↑ {mask(h.receita)}</Text>
                      <Text style={s.mesCst}>↓ {mask(h.total_custo)}</Text>
                      <TouchableOpacity onPress={() => handleDelete(h.mes_key)} style={{ marginTop: 6 }}>
                        <Ionicons name="trash-outline" size={16} color={colors.t3} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* Modal de detalhe do mês */}
      <Modal visible={!!detail || loadingDetail} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setDetail(null)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            {loadingDetail ? (
              <ActivityIndicator color={colors.green} style={{ margin: 40 }} />
            ) : detail ? (
              <>
                <Text style={s.modalTitle}>DRE — {detail.mes_key}</Text>
                <View style={s.detailGrid}>
                  {([
                    ['Faturamento', mask(detail.receita), colors.green],
                    ['Custos', mask(detail.total_custo), colors.red],
                    ['Lucro', mask(detail.lucro), detail.lucro >= 0 ? colors.green : colors.red],
                  ] as [string, string, string][]).map(([lbl, val, clr]) => (
                    <View key={lbl} style={s.detailCard}>
                      <Text style={s.detailLabel}>{lbl}</Text>
                      <Text style={[s.detailVal, { color: clr }]}>{val}</Text>
                    </View>
                  ))}
                </View>
                {detail.custos && Object.entries(detail.custos)
                  .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
                  .map(([cat, val]) => (
                    <View key={cat} style={s.detailRow}>
                      <Text style={s.detailRowLabel}>{cat}</Text>
                      <Text style={s.detailRowVal}>{mask(val as number)}</Text>
                    </View>
                  ))}
              </>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

