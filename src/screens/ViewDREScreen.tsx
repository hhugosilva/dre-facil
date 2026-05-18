import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getDREApi } from '../services/api';

type DREData = { period: string; receita: number; custos: Record<string,number>; total_custo: number; lucro: number; by_forn_raw?: Record<string,number> };

function fmt(v: number) {
  return `R$ ${Math.abs(v).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${((part/total)*100).toFixed(1)}%`;
}

export default function ViewDREScreen({ navigation, route }: any) {
  const { mesKey } = route.params;
  const [dre, setDre] = useState<DREData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);

  useEffect(() => {
    getDREApi(mesKey).then(({ data }) => setDre(data.dre)).catch(() => {}).finally(() => setLoading(false));
  }, [mesKey]);

  const masked = (v: number) => hideValues ? '••••••' : fmt(v);

  const handleShare = async () => {
    if (!dre) return;
    const lines = [
      `DRE Fácil — ${dre.period}`,
      `Receita:    ${fmt(dre.receita)}`,
      `Custos:     ${fmt(dre.total_custo)}`,
      `Lucro:      ${fmt(dre.lucro)} (${pct(dre.lucro, dre.receita)})`,
      '',
      'Por categoria:',
      ...Object.entries(dre.custos||{}).map(([k,v]) => `  ${k}: ${fmt(v)}`),
    ];
    await Share.share({ message: lines.join('\n') });
  };

  if (loading) return <View style={s.root}><ActivityIndicator color={colors.green} style={{marginTop:100}} /></View>;
  if (!dre) return <View style={s.root}><Text style={{color:colors.t2,textAlign:'center',marginTop:100}}>DRE não encontrada.</Text></View>;

  const lucroColor = dre.lucro >= 0 ? colors.green : colors.red;
  const margem = dre.receita > 0 ? (dre.lucro/dre.receita)*100 : 0;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.t2} /></TouchableOpacity>
        <Text style={s.headerTitle}>{dre.period}</Text>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={() => setHideValues(!hideValues)} style={s.iconBtn}>
            <Ionicons name={hideValues ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.t2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={s.iconBtn}>
            <Ionicons name="share-outline" size={20} color={colors.t2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Result card */}
        <View style={[s.resultCard, { borderColor: `${lucroColor}40` }]}>
          <Text style={s.resultLabel}>RESULTADO DO MÊS</Text>
          <Text style={[s.resultValue, { color: lucroColor }]}>{masked(dre.lucro)}</Text>
          <Text style={[s.resultMargem, { color: lucroColor }]}>Margem: {margem.toFixed(1)}%</Text>
        </View>

        {/* DRE lines */}
        <View style={s.dreBox}>
          <Text style={s.dreBoxTitle}>DRE</Text>

          <View style={s.dreLine}>
            <Text style={s.dreLineLabel}>Receita bruta</Text>
            <Text style={[s.dreLineVal, { color: colors.green }]}>{masked(dre.receita)}</Text>
          </View>

          {Object.entries(dre.custos||{}).map(([cat, val]) => (
            <View key={cat} style={[s.dreLine, s.dreLineIndent]}>
              <Text style={s.dreLineSub}>(-) {cat}</Text>
              <Text style={[s.dreLineVal, { color: colors.red, fontSize: 13 }]}>{masked(val)}</Text>
            </View>
          ))}

          <View style={[s.dreLine, s.dreLineSeparator]}>
            <Text style={s.dreLineLabel}>(-) Total custos</Text>
            <Text style={[s.dreLineVal, { color: colors.red }]}>{masked(dre.total_custo)}</Text>
          </View>

          <View style={[s.dreLine, { paddingTop: 12 }]}>
            <Text style={[s.dreLineLabel, { fontWeight: '800', color: lucroColor }]}>= Lucro líquido</Text>
            <Text style={[s.dreLineVal, { color: lucroColor, fontSize: 16, fontWeight: '800' }]}>{masked(dre.lucro)}</Text>
          </View>
        </View>

        {/* Fornecedores */}
        {dre.by_forn_raw && Object.keys(dre.by_forn_raw).length > 0 && (
          <View style={s.dreBox}>
            <Text style={s.dreBoxTitle}>Gastos por fornecedor</Text>
            {Object.entries(dre.by_forn_raw)
              .sort(([,a],[,b]) => b-a)
              .map(([forn, val]) => (
                <View key={forn} style={s.dreLine}>
                  <Text style={s.dreLineSub} numberOfLines={1}>{forn}</Text>
                  <Text style={[s.dreLineVal, { color: colors.t2, fontSize: 13 }]}>{masked(val)}</Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: colors.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  headerTitle:      { fontSize: 17, fontWeight: '700', color: colors.t1 },
  headerRight:      { flexDirection: 'row', gap: 8 },
  iconBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.s1, borderRadius: 18, borderWidth: 0.5, borderColor: colors.b1 },
  scroll:           { padding: 16, gap: 16, paddingBottom: 40 },
  resultCard:       { backgroundColor: colors.s1, borderRadius: colors.r, padding: 24, alignItems: 'center', borderWidth: 1, gap: 6 },
  resultLabel:      { fontSize: 10, color: colors.t3, letterSpacing: 0.8, fontWeight: '600', textTransform: 'uppercase' },
  resultValue:      { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  resultMargem:     { fontSize: 13, fontWeight: '600' },
  dreBox:           { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1, gap: 2 },
  dreBoxTitle:      { fontSize: 13, fontWeight: '700', color: colors.t2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  dreLine:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  dreLineIndent:    { paddingLeft: 12 },
  dreLineLabel:     { fontSize: 14, fontWeight: '600', color: colors.t1 },
  dreLineSub:       { fontSize: 13, color: colors.t2, flex: 1 },
  dreLineVal:       { fontSize: 14, fontWeight: '700' },
  dreLineSeparator: { borderTopWidth: 0.5, borderTopColor: colors.b1, marginTop: 4, paddingTop: 12 },
});
