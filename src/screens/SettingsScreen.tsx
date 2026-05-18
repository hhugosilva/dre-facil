import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getConfigApi, saveConfigApi } from '../services/api';

type Rule = { keyword: string; category: string };
type Forn = { name: string; color: string };

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [forns, setForns] = useState<Forn[]>([]);
  const [newKw, setNewKw] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newForn, setNewForn] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getConfigApi().then(({ data }) => {
      setRules(data.config?.rules || []);
      setForns(data.config?.fornecedores || []);
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveConfigApi({ rules, fornecedores: forns });
      Alert.alert('Salvo!', 'Configurações salvas com sucesso.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    }
    setSaving(false);
  };

  const addRule = () => {
    if (!newKw.trim() || !newCat.trim()) return;
    setRules(prev => [...prev, { keyword: newKw.trim(), category: newCat.trim() }]);
    setNewKw(''); setNewCat('');
  };

  const removeRule = (i: number) => setRules(prev => prev.filter((_,j) => j!==i));

  const addForn = () => {
    if (!newForn.trim()) return;
    setForns(prev => [...prev, { name: newForn.trim(), color: '#4ade80' }]);
    setNewForn('');
  };

  const removeForn = (i: number) => setForns(prev => prev.filter((_,j) => j!==i));

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const Row = ({ icon, title, sub, onPress, danger }: any) => (
    <TouchableOpacity style={s.settRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? colors.red : colors.t2} />
      <View style={{ flex: 1 }}>
        <Text style={[s.settTitle, danger && { color: colors.red }]}>{title}</Text>
        {sub && <Text style={s.settSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.t3} />
    </TouchableOpacity>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.t2} /></TouchableOpacity>
        <Text style={s.headerTitle}>Configurações</Text>
        <TouchableOpacity onPress={save}><Text style={s.saveLink}>{saving ? 'Salvando...' : 'Salvar'}</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Account */}
        <Text style={s.section}>CONTA</Text>
        <View style={s.card}>
          <Text style={s.accountName}>{user?.nome}</Text>
          <Text style={s.accountEmail}>{user?.email}</Text>
          {user?.nome_empresa && <Text style={s.accountCompany}>{user.nome_empresa}</Text>}
        </View>

        {/* Rules */}
        <Text style={s.section}>REGRAS DE CLASSIFICAÇÃO</Text>
        <Text style={s.sectionSub}>Palavra-chave no extrato → categoria automática</Text>
        <View style={s.card}>
          {rules.map((r, i) => (
            <View key={i} style={s.ruleRow}>
              <Text style={s.ruleKw}>{r.keyword}</Text>
              <Text style={s.ruleArrow}>→</Text>
              <Text style={s.ruleCat}>{r.category}</Text>
              <TouchableOpacity onPress={() => removeRule(i)}><Ionicons name="close-circle" size={18} color={colors.t3} /></TouchableOpacity>
            </View>
          ))}
          <View style={s.addRow}>
            <TextInput style={[s.input, {flex:1}]} value={newKw} onChangeText={setNewKw} placeholder="Palavra-chave" placeholderTextColor={colors.t3} />
            <TextInput style={[s.input, {flex:1}]} value={newCat} onChangeText={setNewCat} placeholder="Categoria" placeholderTextColor={colors.t3} />
            <TouchableOpacity style={s.addBtn} onPress={addRule}><Ionicons name="add" size={20} color={colors.green} /></TouchableOpacity>
          </View>
        </View>

        {/* Fornecedores */}
        <Text style={s.section}>FORNECEDORES</Text>
        <View style={s.card}>
          {forns.map((f, i) => (
            <View key={i} style={s.ruleRow}>
              <Text style={s.ruleKw}>{f.name}</Text>
              <TouchableOpacity onPress={() => removeForn(i)} style={{ marginLeft: 'auto' }}><Ionicons name="close-circle" size={18} color={colors.t3} /></TouchableOpacity>
            </View>
          ))}
          <View style={s.addRow}>
            <TextInput style={[s.input, {flex:1}]} value={newForn} onChangeText={setNewForn} placeholder="Nome do fornecedor" placeholderTextColor={colors.t3} />
            <TouchableOpacity style={s.addBtn} onPress={addForn}><Ionicons name="add" size={20} color={colors.green} /></TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <Text style={s.section}>OUTROS</Text>
        <View style={s.card}>
          <Row icon="log-out-outline" title="Sair da conta" danger onPress={handleLogout} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: colors.t1 },
  saveLink:      { color: colors.green, fontWeight: '600', fontSize: 14 },
  scroll:        { padding: 16, gap: 8, paddingBottom: 40 },
  section:       { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  sectionSub:    { fontSize: 11, color: colors.t3, marginBottom: 8 },
  card:          { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1, gap: 10 },
  accountName:   { fontSize: 17, fontWeight: '700', color: colors.t1 },
  accountEmail:  { fontSize: 13, color: colors.t2 },
  accountCompany:{ fontSize: 12, color: colors.t3, marginTop: 2 },
  ruleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleKw:        { fontSize: 13, color: colors.t1, flex: 1 },
  ruleArrow:     { fontSize: 13, color: colors.t3 },
  ruleCat:       { fontSize: 13, color: colors.green, flex: 1 },
  addRow:        { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input:         { backgroundColor: colors.s2, borderRadius: 8, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 10, fontSize: 13 },
  addBtn:        { width: 38, height: 38, backgroundColor: `${colors.green}20`, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  settTitle:     { fontSize: 14, color: colors.t1, fontWeight: '600' },
  settSub:       { fontSize: 12, color: colors.t3 },
});
