// ============================================================
// DRE Fácil — arquivo único para snack.expo.dev
// Cole este conteúdo no App.js do Snack.
//
// Adicione no package.json do Snack:
//   "@react-native-async-storage/async-storage": "^2.1.2",
//   "@react-navigation/native": "^6.1.18",
//   "@react-navigation/stack": "^6.4.1",
//   "axios": "^1.7.7",
//   "expo-document-picker": "~13.0.1",
//   "expo-file-system": "~18.0.4",
//   "react-native-screens": "~4.4.0",
//   "react-native-safe-area-context": "4.12.0",
//   "xlsx": "^0.18.5"
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, FlatList, Modal, Share, RefreshControl, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';

// ─── THEME ───────────────────────────────────────────────────
const colors = {
  bg: '#0a0e0b', s1: '#111714', s2: '#1a2020',
  green: '#4ade80', greenDim: '#22c55e', red: '#f87171',
  t1: '#f0fdf4', t2: '#9ca3af', t3: '#4b5563',
  b1: 'rgba(255,255,255,0.06)', b2: 'rgba(255,255,255,0.10)',
  rs: 12, r: 16,
};

// ─── API ─────────────────────────────────────────────────────
const BASE_URL = 'https://dre-backend-v2-production.up.railway.app';
const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('dreToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(r => r, async (err) => {
  if (err.response?.status === 401) await AsyncStorage.removeItem('dreToken');
  return Promise.reject(err);
});

const loginApi          = (email, senha) => api.post('/api/auth/login', { email, senha });
const registerApi       = (nome, email, senha, nomeEmpresa) => api.post('/api/auth/register', { nome, email, senha, nome_empresa: nomeEmpresa });
const meApi             = () => api.get('/api/auth/me');
const forgotPasswordApi = (email) => api.post('/api/auth/forgot-password', { email });
const listDREApi        = () => api.get('/api/dre/list');
const saveDREApi        = (data) => api.post('/api/dre/save', data);
const getDREApi         = (mesKey) => api.get(`/api/dre/${mesKey}`);
const deleteDREApi      = (mesKey) => api.delete(`/api/dre/${mesKey}`);
const getConfigApi      = () => api.get('/api/config');
const saveConfigApi     = (data) => api.put('/api/config', data);
const classifyApi       = (transactions, rules, fornConfig) => api.post('/api/ai/classify', { transactions, rules, fornConfig });

// ─── AUTH CONTEXT ────────────────────────────────────────────
const AuthContext = createContext({});

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('dreToken');
        if (stored) {
          setToken(stored);
          const { data } = await meApi();
          setUser(data.user);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async (email, senha) => {
    const { data } = await loginApi(email, senha);
    await AsyncStorage.setItem('dreToken', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('dreToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

// ─── HELPERS ─────────────────────────────────────────────────
function fmt(v) {
  return `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function mesLabel(key) {
  const [y, m] = key.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[parseInt(m) - 1]} ${y}`;
}
function ns(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

// ─── SCREENS ─────────────────────────────────────────────────

// LOGIN
function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) { Alert.alert('Campos obrigatórios', 'Preencha e-mail e senha.'); return; }
    setLoading(true);
    try { await login(email.trim().toLowerCase(), senha); }
    catch (e) { Alert.alert('Erro ao entrar', e.response?.data?.error || 'Verifique suas credenciais.'); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={ls.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={ls.scroll} keyboardShouldPersistTaps="handled">
        <View style={ls.logoArea}>
          <Text style={ls.logoText}>DRE<Text style={ls.logoAccent}>.fácil</Text></Text>
          <Text style={ls.logoSub}>Finanças na palma da mão</Text>
        </View>
        <View style={ls.card}>
          <Text style={ls.cardTitle}>Entrar</Text>
          <Text style={ls.label}>E-MAIL</Text>
          <TextInput style={ls.input} value={email} onChangeText={setEmail}
            placeholder="seu@email.com" placeholderTextColor={colors.t3}
            keyboardType="email-address" autoCapitalize="none" />
          <Text style={ls.label}>SENHA</Text>
          <View style={ls.inputRow}>
            <TextInput style={[ls.input, { flex: 1, marginBottom: 0 }]} value={senha} onChangeText={setSenha}
              placeholder="••••••••" placeholderTextColor={colors.t3} secureTextEntry={!showSenha} />
            <TouchableOpacity onPress={() => setShowSenha(!showSenha)} style={ls.eyeBtn}>
              <Ionicons name={showSenha ? 'eye-off' : 'eye'} size={20} color={colors.t3} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={ls.forgotLink}>
            <Text style={ls.forgotText}>Esqueci minha senha</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ls.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#0a1a0e" /> : <Text style={ls.btnPrimaryText}>Entrar</Text>}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 24 }}>
          <Text style={ls.switchText}>Não tem conta? <Text style={ls.switchLink}>Criar conta</Text></Text>
        </TouchableOpacity>
        <Text style={ls.byText}>By DREX</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const ls = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 36, fontWeight: '700', color: colors.t1, letterSpacing: -1 },
  logoAccent: { color: colors.green },
  logoSub: { fontSize: 13, color: colors.t2, marginTop: 6 },
  card: { backgroundColor: colors.s1, borderRadius: colors.r, padding: 24, borderWidth: 0.5, borderColor: colors.b2 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.t1, marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: colors.s2, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 14, fontSize: 15, marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eyeBtn: { padding: 14 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: colors.green, fontSize: 13 },
  btnPrimary: { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnPrimaryText: { color: '#0a1a0e', fontWeight: '700', fontSize: 15 },
  switchText: { textAlign: 'center', color: colors.t2, fontSize: 14 },
  switchLink: { color: colors.green, fontWeight: '600' },
  byText: { textAlign: 'center', color: colors.t3, fontSize: 11, marginTop: 32 },
});

// REGISTER
function RegisterScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [aceitouPolitica, setAceitouPolitica] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nome.trim() || !email.trim() || !senha || !nomeEmpresa.trim()) { Alert.alert('Campos obrigatórios', 'Preencha todos os campos.'); return; }
    if (senha.length < 8) { Alert.alert('Senha fraca', 'Mínimo 8 caracteres.'); return; }
    if (senha !== confirma) { Alert.alert('Senhas diferentes', 'As senhas não coincidem.'); return; }
    if (!aceitouPolitica) { Alert.alert('Política de Privacidade', 'Aceite a Política de Privacidade.'); return; }
    setLoading(true);
    try {
      await registerApi(nome.trim(), email.trim().toLowerCase(), senha, nomeEmpresa.trim());
      Alert.alert('✅ Conta criada!', 'E-mail de verificação enviado.', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
    } catch (e) { Alert.alert('Erro', e.response?.data?.error || 'Não foi possível criar a conta.'); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={rs.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={rs.scroll} keyboardShouldPersistTaps="handled">
        <View style={rs.logoArea}><Text style={rs.logoText}>DRE<Text style={{ color: colors.green }}>.fácil</Text></Text></View>
        <View style={rs.card}>
          <Text style={rs.cardTitle}>Criar conta</Text>
          {[['SEU NOME', nome, setNome, 'Nome completo', 'words', false],
            ['NOME DA EMPRESA', nomeEmpresa, setNomeEmpresa, 'Ex: Padaria do João ME', 'words', false],
            ['E-MAIL', email, setEmail, 'seu@email.com', 'none', false]].map(([lbl, val, setter, ph, cap, sec]) => (
            <View key={lbl}>
              <Text style={rs.label}>{lbl}</Text>
              <TextInput style={rs.input} value={val} onChangeText={setter} placeholder={ph}
                placeholderTextColor={colors.t3} autoCapitalize={cap} secureTextEntry={sec} />
            </View>
          ))}
          <Text style={rs.label}>SENHA</Text>
          <View style={rs.inputRow}>
            <TextInput style={[rs.input, { flex: 1, marginBottom: 0 }]} value={senha} onChangeText={setSenha}
              placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.t3} secureTextEntry={!showSenha} />
            <TouchableOpacity onPress={() => setShowSenha(!showSenha)} style={rs.eyeBtn}>
              <Ionicons name={showSenha ? 'eye-off' : 'eye'} size={20} color={colors.t3} />
            </TouchableOpacity>
          </View>
          <Text style={[rs.label, { marginTop: 16 }]}>CONFIRMAR SENHA</Text>
          <TextInput style={rs.input} value={confirma} onChangeText={setConfirma}
            placeholder="Repita a senha" placeholderTextColor={colors.t3} secureTextEntry={!showSenha} />
          <TouchableOpacity style={rs.checkRow} onPress={() => setAceitouPolitica(!aceitouPolitica)}>
            <View style={[rs.checkbox, aceitouPolitica && rs.checkboxActive]}>
              {aceitouPolitica && <Ionicons name="checkmark" size={14} color="#0a1a0e" />}
            </View>
            <Text style={rs.checkText}>
              Li e aceito a{' '}
              <Text style={{ color: colors.green, fontWeight: '600' }} onPress={() => Linking.openURL('https://frontend-six-topaz-83.vercel.app/privacidade')}>
                Política de Privacidade
              </Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={rs.btnPrimary} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#0a1a0e" /> : <Text style={rs.btnPrimaryText}>Criar conta</Text>}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24 }}>
          <Text style={rs.switchText}>Já tem conta? <Text style={{ color: colors.green, fontWeight: '600' }}>Entrar</Text></Text>
        </TouchableOpacity>
        <Text style={rs.byText}>By DREX</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const rs = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoText: { fontSize: 32, fontWeight: '700', color: colors.t1, letterSpacing: -1 },
  card: { backgroundColor: colors.s1, borderRadius: colors.r, padding: 24, borderWidth: 0.5, borderColor: colors.b2 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.t1, marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: colors.s2, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 14, fontSize: 15, marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  eyeBtn: { padding: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.b2, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  checkboxActive: { backgroundColor: colors.green, borderColor: colors.green },
  checkText: { flex: 1, fontSize: 13, color: colors.t2, lineHeight: 20 },
  btnPrimary: { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center' },
  btnPrimaryText: { color: '#0a1a0e', fontWeight: '700', fontSize: 15 },
  switchText: { textAlign: 'center', color: colors.t2, fontSize: 14 },
  byText: { textAlign: 'center', color: colors.t3, fontSize: 11, marginTop: 32 },
});

// FORGOT PASSWORD
function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { Alert.alert('Campo obrigatório', 'Informe seu e-mail.'); return; }
    setLoading(true);
    try { await forgotPasswordApi(email.trim().toLowerCase()); setSent(true); }
    catch (e) { Alert.alert('Erro', e.response?.data?.error || 'Não foi possível enviar o e-mail.'); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={fps.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={fps.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={fps.back}>
          <Ionicons name="arrow-back" size={22} color={colors.t2} />
        </TouchableOpacity>
        <Text style={fps.logoText}>DRE<Text style={{ color: colors.green }}>.fácil</Text></Text>
        <Text style={fps.title}>Recuperar senha</Text>
        {!sent ? (
          <>
            <Text style={fps.desc}>Informe seu e-mail e enviaremos um link para redefinir sua senha.</Text>
            <Text style={fps.label}>E-MAIL</Text>
            <TextInput style={fps.input} value={email} onChangeText={setEmail}
              placeholder="seu@email.com" placeholderTextColor={colors.t3}
              keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={fps.btnPrimary} onPress={handleSend} disabled={loading}>
              {loading ? <ActivityIndicator color="#0a1a0e" /> : <Text style={fps.btnPrimaryText}>Enviar link</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <View style={fps.successBox}>
            <Ionicons name="mail-outline" size={48} color={colors.green} />
            <Text style={fps.successTitle}>E-mail enviado!</Text>
            <Text style={fps.successDesc}>Verifique sua caixa de entrada e clique no link.</Text>
            <TouchableOpacity style={fps.btnPrimary} onPress={() => navigation.navigate('Login')}>
              <Text style={fps.btnPrimaryText}>Voltar ao login</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={fps.byText}>By DREX</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
const fps = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 32 },
  logoText: { fontSize: 28, fontWeight: '700', color: colors.t1, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.t1, marginBottom: 12 },
  desc: { fontSize: 14, color: colors.t2, lineHeight: 22, marginBottom: 28 },
  label: { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: colors.s1, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 14, fontSize: 15, marginBottom: 20 },
  btnPrimary: { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#0a1a0e', fontWeight: '700', fontSize: 15 },
  successBox: { alignItems: 'center', gap: 16, marginTop: 40 },
  successTitle: { fontSize: 20, fontWeight: '700', color: colors.t1 },
  successDesc: { fontSize: 14, color: colors.t2, textAlign: 'center', lineHeight: 22 },
  byText: { textAlign: 'center', color: colors.t3, fontSize: 11, position: 'absolute', bottom: 32, alignSelf: 'center' },
});

// DASHBOARD
function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [dres, setDres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideValues, setHideValues] = useState(false);

  const load = async () => {
    try { const { data } = await listDREApi(); setDres(data.list || []); }
    catch { setDres([]); }
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = (mesKey, period) => {
    Alert.alert('Apagar DRE', `Apagar ${period}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        try { await deleteDREApi(mesKey); setDres(prev => prev.filter(d => d.mes_key !== mesKey)); }
        catch { Alert.alert('Erro', 'Não foi possível apagar.'); }
      }},
    ]);
  };

  const masked = (v) => hideValues ? '••••••' : fmt(v);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={ds.card} onPress={() => navigation.navigate('ViewDRE', { mesKey: item.mes_key })}>
      <View style={ds.cardTop}>
        <Text style={ds.cardMonth}>{item.period || mesLabel(item.mes_key)}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.mes_key, item.period || mesLabel(item.mes_key))}>
          <Ionicons name="trash-outline" size={18} color={colors.t3} />
        </TouchableOpacity>
      </View>
      <View style={ds.cardRow}>
        {[['RECEITA', item.receita, colors.green], ['CUSTOS', item.total_custo, colors.red],
          ['LUCRO', item.lucro, item.lucro >= 0 ? colors.green : colors.red]].map(([lbl, val, clr]) => (
          <View key={lbl} style={ds.cardCol}>
            <Text style={ds.cardLabel}>{lbl}</Text>
            <Text style={[ds.cardValue, { color: clr }]}>{masked(val)}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={ds.root}>
      <View style={ds.header}>
        <View>
          <Text style={ds.headerGreet}>Olá, {user?.nome?.split(' ')[0] || 'usuário'}</Text>
          <Text style={ds.headerCompany}>{user?.nome_empresa || ''}</Text>
        </View>
        <View style={ds.headerRight}>
          <TouchableOpacity onPress={() => setHideValues(!hideValues)} style={ds.iconBtn}>
            <Ionicons name={hideValues ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.t2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={ds.iconBtn}>
            <Ionicons name="settings-outline" size={22} color={colors.t2} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={ds.newBtn} onPress={() => navigation.navigate('NewDRE')}>
        <View style={ds.newBtnIcon}><Ionicons name="add" size={22} color={colors.green} /></View>
        <View>
          <Text style={ds.newBtnTitle}>Nova DRE</Text>
          <Text style={ds.newBtnSub}>Carregar extratos do mês</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.t3} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} /> : (
        <FlatList data={dres} keyExtractor={i => i.mes_key} renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          ListEmptyComponent={
            <View style={ds.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.t3} />
              <Text style={ds.emptyText}>Nenhuma DRE salva ainda.</Text>
              <Text style={ds.emptySubText}>Toque em "Nova DRE" para começar.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
const ds = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  headerGreet: { fontSize: 18, fontWeight: '700', color: colors.t1 },
  headerCompany: { fontSize: 12, color: colors.t2, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.s1, borderRadius: 20, borderWidth: 0.5, borderColor: colors.b1 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, margin: 16, marginTop: 4, backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 1, borderColor: `${colors.green}33` },
  newBtnIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: `${colors.green}18`, alignItems: 'center', justifyContent: 'center' },
  newBtnTitle: { fontSize: 15, fontWeight: '700', color: colors.t1 },
  newBtnSub: { fontSize: 12, color: colors.t2, marginTop: 2 },
  card: { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardMonth: { fontSize: 15, fontWeight: '700', color: colors.t1 },
  cardRow: { flexDirection: 'row', gap: 8 },
  cardCol: { flex: 1 },
  cardLabel: { fontSize: 9, color: colors.t3, letterSpacing: 0.6, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  cardValue: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.t2 },
  emptySubText: { fontSize: 13, color: colors.t3 },
});

// NEW DRE
const BANKS = {
  auto: { name: 'Auto-detectar', color: colors.green },
  nubank: { name: 'Nubank', color: '#820AD1' },
  mercadopago: { name: 'Mercado Pago', color: '#009ee3' },
  inter: { name: 'Banco Inter', color: '#ff8700' },
  bradesco: { name: 'Bradesco', color: '#cc0000' },
  itau: { name: 'Itaú', color: '#ec7000' },
  santander: { name: 'Santander', color: '#ec0000' },
  outro: { name: 'Outro banco', color: '#555' },
};

const FH = {
  data: ['release_date','data lancamento','data lançamento','data','date','dt'],
  descricao: ['transaction_type','titulo','título','descricao','descrição','desc','memo','historico','histórico','estabelecimento','lancamento','lançamento','transaction','merchant'],
  valor: ['transaction_net_amount','valor','value','amount','montante','vlr','movimentacao','movimentação'],
  entrada: ['entrada','credito','crédito','credit'],
  saida: ['saida','saída','débito','debito','debit'],
};

function gc(cols, field) {
  const hints = FH[field] || [];
  return cols.find(c => hints.includes(ns(c))) || cols.find(c => hints.some(h => h.length > 2 && ns(c).includes(h))) || null;
}

function parseVal(raw) {
  if (!raw && raw !== 0) return 0;
  if (typeof raw === 'number') return raw;
  let s = String(raw).trim().replace(/[R$\s ]/g, '');
  if (!s || s === '-') return 0;
  const neg = s.startsWith('-') || (s.startsWith('(') && s.endsWith(')'));
  s = s.replace(/^-/, '').replace(/^\((.+)\)$/, '$1');
  const ld = s.lastIndexOf('.'), lc = s.lastIndexOf(',');
  if (ld >= 0 && lc >= 0) { s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''); }
  else if (lc >= 0) { s = s.slice(lc + 1).length <= 2 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''); }
  const val = parseFloat(s) || 0;
  return neg ? -val : val;
}

function normalizeRows(rows) {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]).filter(c => String(c).trim());
  const cDesc = gc(cols, 'descricao');
  const cE = gc(cols, 'entrada'), cS = gc(cols, 'saida');
  const cV = (!cE && !cS) ? gc(cols, 'valor') : null;
  const cData = gc(cols, 'data');
  if (!cDesc) throw new Error('Coluna de descrição não encontrada. Colunas: ' + cols.join(', '));
  return rows.flatMap(r => {
    const desc = String(r[cDesc] || '').trim();
    if (!desc) return [];
    let valor;
    if (cE || cS) {
      const ent = parseVal(cE ? r[cE] : 0), sai = parseVal(cS ? r[cS] : 0);
      if (ent === 0 && sai === 0) return [];
      valor = ent > 0 ? ent : -sai;
    } else {
      valor = parseVal(r[cV]);
      if (valor === 0) return [];
    }
    return [{ data: cData ? String(r[cData] || '') : '', descricao: desc, valor }];
  });
}

async function parseXLSX(uri) {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const wb = xlsxRead(b64, { type: 'base64', raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  let hr = 0, best = -1;
  for (let i = 0; i < Math.min(20, allRows.length); i++) {
    const tc = allRows[i].filter(c => { const s = String(c || '').trim(); return s && s.length >= 2 && isNaN(Number(s.replace(/[.,]/g, ''))); });
    if (tc.length >= 3) {
      const hdrs = allRows[i].map(h => String(h || '').trim());
      const score = Object.values(FH).reduce((n, a) => n + (a.some(x => hdrs.some(h => ns(h) === ns(x) || ns(h).includes(ns(x)))) ? 1 : 0), 0);
      if (score > best) { best = score; hr = i; }
    }
  }
  const hdrs = allRows[hr].map(h => String(h || '').trim());
  const rows = allRows.slice(hr + 1)
    .filter(r => r.some(c => String(c || '').trim()))
    .map(r => { const o = {}; hdrs.forEach((h, i) => { if (h) o[h] = r[i] !== undefined ? String(r[i]) : ''; }); return o; })
    .filter(r => Object.keys(r).length > 1);
  return normalizeRows(rows);
}

async function parseCSV(uri, bankId) {
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sep = lines[0]?.includes(';') ? ';' : ',';
  let hi = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].split(sep).filter(c => c.trim()).length >= 3) { hi = i; break; }
  }
  const headers = lines[hi].split(sep).map(h => h.replace(/"/g, '').trim());
  if (bankId === 'nubank' || (headers.some(h => ns(h) === 'data') && headers.some(h => ns(h) === 'valor') && headers.some(h => ns(h).includes('descri')))) {
    const iD = headers.findIndex(h => ns(h) === 'data');
    const iV = headers.findIndex(h => ns(h) === 'valor');
    const iDesc = headers.findIndex(h => ns(h).includes('descri'));
    return lines.slice(hi + 1).filter(l => l.trim()).flatMap(line => {
      const vals = line.split(sep).map(v => v.replace(/"/g, '').trim());
      const valor = parseVal(vals[iV]); if (valor === 0) return [];
      return [{ data: vals[iD] || '', descricao: vals[iDesc] || '', valor }];
    });
  }
  const rows = lines.slice(hi + 1).filter(l => l.trim()).map(line => {
    const vals = line.split(sep).map(v => v.replace(/"/g, '').trim());
    const o = {}; headers.forEach((h, i) => { if (h) o[h] = vals[i] || ''; }); return o;
  });
  return normalizeRows(rows);
}

function NewDREScreen({ navigation }) {
  const [slots, setSlots] = useState([]);
  const [slotCtr, setSlotCtr] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [receita, setReceita] = useState('');
  const [processing, setProcessing] = useState(false);

  const addFile = async (bankId) => {
    setShowPicker(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const id = slotCtr; setSlotCtr(c => c + 1);
      const bank = BANKS[bankId] || BANKS.outro;
      setSlots(prev => [...prev, { id, file: { name: file.name, uri: file.uri }, bankId, bankName: bank.name }]);
    } catch (e) { if (!e.message?.includes('cancel')) Alert.alert('Erro', 'Não foi possível ler o arquivo.'); }
  };

  const handleProcess = async () => {
    if (!slots.length) { Alert.alert('Atenção', 'Adicione pelo menos um extrato.'); return; }
    const recVal = parseVal(receita);
    setProcessing(true);
    try {
      let all = [];
      for (const slot of slots) {
        const name = slot.file.name.toLowerCase();
        const txns = (name.endsWith('.xlsx') || name.endsWith('.xls'))
          ? await parseXLSX(slot.file.uri)
          : await parseCSV(slot.file.uri, slot.bankId);
        all = [...all, ...txns];
      }
      if (!all.length) { Alert.alert('Arquivo vazio', 'Nenhuma transação encontrada.'); setProcessing(false); return; }
      const { data: cfg } = await getConfigApi();
      const { data } = await classifyApi(all, cfg.config?.rules || [], cfg.config?.fornecedores || []);
      navigation.navigate('Review', { transactions: data.classified || all.map(t => ({ ...t, categoria: 'Pessoal' })), receita: recVal, mesKey: data.mesKey });
    } catch (e) { Alert.alert('Erro', e.response?.data?.error || e.message || 'Falha ao processar extratos.'); }
    setProcessing(false);
  };

  return (
    <View style={ns2.root}>
      <View style={ns2.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.t2} /></TouchableOpacity>
        <Text style={ns2.headerTitle}>Nova DRE</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={ns2.scroll}>
        <Text style={ns2.sectionTitle}>Carregar extratos</Text>
        <Text style={ns2.sectionSub}>Adicione quantos extratos precisar — a IA classifica e monta o DRE.</Text>
        {slots.map(slot => {
          const bank = BANKS[slot.bankId] || BANKS.outro;
          return (
            <View key={slot.id} style={ns2.slotRow}>
              <View style={ns2.slotFile}>
                <Ionicons name="document-text-outline" size={20} color={colors.t2} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={ns2.slotName} numberOfLines={1}>{slot.file.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setSlots(prev => prev.filter(s => s.id !== slot.id))}>
                  <Ionicons name="close" size={18} color={colors.t3} />
                </TouchableOpacity>
              </View>
              <View style={[ns2.bankBadge, { backgroundColor: bank.color }]}>
                <Text style={ns2.bankBadgeText}>{bank.name}</Text>
              </View>
            </View>
          );
        })}
        {!showPicker ? (
          <TouchableOpacity style={ns2.addBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="add" size={20} color={colors.t3} />
            <Text style={ns2.addBtnText}>{slots.length === 0 ? 'Adicionar extrato...' : 'Adicionar outro extrato...'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={ns2.picker}>
            <Text style={ns2.pickerTitle}>SELECIONAR BANCO</Text>
            {Object.entries(BANKS).map(([id, bank]) => (
              <TouchableOpacity key={id} style={ns2.pickerOpt} onPress={() => addFile(id)}>
                <View style={[ns2.bankDot, { backgroundColor: bank.color }]} />
                <Text style={ns2.pickerOptName}>{bank.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={ns2.pickerCancel}>Cancelar</Text></TouchableOpacity>
          </View>
        )}
        <View style={ns2.receitaBox}>
          <Text style={ns2.sectionTitle}>Receita do mês</Text>
          <Text style={ns2.sectionSub}>Informe a receita total se não estiver no extrato.</Text>
          <TextInput style={ns2.input} value={receita} onChangeText={setReceita}
            placeholder="R$ 0,00" placeholderTextColor={colors.t3} keyboardType="decimal-pad" />
        </View>
        <TouchableOpacity style={[ns2.btnProcess, !slots.length && ns2.btnDisabled]} onPress={handleProcess} disabled={!slots.length || processing}>
          {processing ? <ActivityIndicator color="#0a1a0e" /> : <Text style={ns2.btnProcessText}>Processar extratos →</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const ns2 = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.t1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.t1 },
  sectionSub: { fontSize: 12, color: colors.t2 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotFile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s1, borderRadius: colors.rs, borderWidth: 0.5, borderColor: `${colors.green}40`, padding: 12 },
  slotName: { fontSize: 13, fontWeight: '600', color: colors.green },
  bankBadge: { borderRadius: colors.rs, paddingHorizontal: 10, paddingVertical: 6 },
  bankBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s1, borderRadius: colors.rs, borderWidth: 0.5, borderStyle: 'dashed', borderColor: colors.b2, padding: 14 },
  addBtnText: { color: colors.t3, fontSize: 13 },
  picker: { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b2, gap: 10 },
  pickerTitle: { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, textTransform: 'uppercase' },
  pickerOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 12, borderWidth: 0.5, borderColor: colors.b2 },
  bankDot: { width: 12, height: 12, borderRadius: 6 },
  pickerOptName: { fontSize: 14, fontWeight: '600', color: colors.t1 },
  pickerCancel: { textAlign: 'center', color: colors.t3, fontSize: 12, paddingTop: 4 },
  receitaBox: { gap: 8, marginTop: 8 },
  input: { backgroundColor: colors.s1, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 14, fontSize: 15 },
  btnProcess: { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnProcessText: { color: '#0a1a0e', fontWeight: '700', fontSize: 15 },
});

// REVIEW
const CAT_COLORS = {
  Fornecedores: '#818cf8', Operacional: '#fb923c', Pessoal: '#94a3b8',
  Impostos: '#f472b6', Financeiro: '#38bdf8', Outros: '#a3a3a3',
};

function ReviewScreen({ navigation, route }) {
  const { transactions: initial, receita, mesKey } = route.params;
  const [txns, setTxns] = useState(initial);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const CATS = Object.keys(CAT_COLORS);

  const changeCategory = (cat) => {
    if (!selected) return;
    setTxns(prev => prev.map(t => t === selected ? { ...t, categoria: cat } : t));
    setSelected(null);
  };

  const totalCustos = txns.filter(t => t.valor < 0).reduce((s, t) => s + Math.abs(t.valor), 0);
  const receitas = receita || txns.filter(t => t.valor > 0).reduce((s, t) => s + t.valor, 0);
  const lucro = receitas - totalCustos;

  const handleSave = async () => {
    setSaving(true);
    try {
      const custosByCat = {};
      txns.filter(t => t.valor < 0).forEach(t => { custosByCat[t.categoria] = (custosByCat[t.categoria] || 0) + Math.abs(t.valor); });
      const byForn = {};
      txns.forEach(t => { if (t.categoria === 'Fornecedores' && t.fornecedor) byForn[t.fornecedor] = (byForn[t.fornecedor] || 0) + Math.abs(t.valor); });
      await saveDREApi({ mes_key: mesKey, period: mesKey, receita: receitas, custos: custosByCat, total_custo: totalCustos, lucro, by_forn_raw: byForn, saved_at: new Date().toISOString() });
      navigation.navigate('Dashboard');
    } catch (e) { Alert.alert('Erro', e.response?.data?.error || 'Não foi possível salvar.'); }
    setSaving(false);
  };

  return (
    <View style={rvs.root}>
      <View style={rvs.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.t2} /></TouchableOpacity>
        <Text style={rvs.headerTitle}>Revisão</Text>
        <TouchableOpacity style={rvs.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#0a1a0e" size="small" /> : <Text style={rvs.saveBtnText}>Salvar</Text>}
        </TouchableOpacity>
      </View>
      <View style={rvs.summary}>
        {[['RECEITA', receitas, colors.green], ['CUSTOS', totalCustos, colors.red], ['LUCRO', lucro, lucro >= 0 ? colors.green : colors.red]].map(([lbl, val, clr]) => (
          <View key={lbl} style={rvs.summaryCol}>
            <Text style={rvs.summaryLabel}>{lbl}</Text>
            <Text style={[rvs.summaryVal, { color: clr }]}>{fmt(val)}</Text>
          </View>
        ))}
      </View>
      <Text style={rvs.hint}>Toque em uma transação para mudar a categoria</Text>
      <FlatList data={txns} keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, gap: 6 }}
        renderItem={({ item }) => {
          const color = CAT_COLORS[item.categoria] || CAT_COLORS.Outros;
          return (
            <TouchableOpacity style={rvs.txnRow} onPress={() => setSelected(item)}>
              <View style={[rvs.catDot, { backgroundColor: color }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={rvs.txnDesc} numberOfLines={1}>{item.descricao}</Text>
                <Text style={rvs.txnCat}>{item.categoria} · {item.data}</Text>
              </View>
              <Text style={[rvs.txnVal, { color: item.valor >= 0 ? colors.green : colors.red }]}>
                {item.valor >= 0 ? '+' : ''}{fmt(item.valor)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <Modal visible={!!selected} transparent animationType="slide">
        <TouchableOpacity style={rvs.modalOverlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={rvs.modalSheet}>
            <Text style={rvs.modalTitle} numberOfLines={2}>{selected?.descricao}</Text>
            <Text style={rvs.modalSub}>{selected ? fmt(selected.valor) : ''}</Text>
            {CATS.map(cat => (
              <TouchableOpacity key={cat} style={[rvs.catOpt, selected?.categoria === cat && rvs.catOptActive]} onPress={() => changeCategory(cat)}>
                <View style={[rvs.catDot, { backgroundColor: CAT_COLORS[cat] }]} />
                <Text style={rvs.catOptText}>{cat}</Text>
                {selected?.categoria === cat && <Ionicons name="checkmark" size={18} color={colors.green} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
const rvs = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.t1 },
  saveBtn: { backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { color: '#0a1a0e', fontWeight: '700', fontSize: 14 },
  summary: { flexDirection: 'row', margin: 16, backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1 },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 9, color: colors.t3, letterSpacing: 0.6, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  summaryVal: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 11, color: colors.t3, marginLeft: 16, marginBottom: 8 },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.s1, borderRadius: colors.rs, padding: 14, borderWidth: 0.5, borderColor: colors.b1 },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  txnDesc: { fontSize: 13, fontWeight: '600', color: colors.t1 },
  txnCat: { fontSize: 11, color: colors.t3, marginTop: 2 },
  txnVal: { fontSize: 13, fontWeight: '700', flexShrink: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.s1, borderRadius: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 24, gap: 10 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: colors.t1 },
  modalSub: { fontSize: 13, color: colors.t2, marginBottom: 4 },
  catOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 14, borderWidth: 0.5, borderColor: colors.b2 },
  catOptActive: { borderColor: `${colors.green}60` },
  catOptText: { fontSize: 14, color: colors.t1, fontWeight: '600' },
});

// VIEW DRE
function ViewDREScreen({ navigation, route }) {
  const { mesKey } = route.params;
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hideValues, setHideValues] = useState(false);

  useEffect(() => {
    getDREApi(mesKey).then(({ data }) => setDre(data.dre)).catch(() => {}).finally(() => setLoading(false));
  }, [mesKey]);

  const masked = (v) => hideValues ? '••••••' : fmt(v);

  const handleShare = async () => {
    if (!dre) return;
    const lines = [`DRE Fácil — ${dre.period}`, `Receita: ${fmt(dre.receita)}`, `Custos: ${fmt(dre.total_custo)}`, `Lucro: ${fmt(dre.lucro)}`];
    await Share.share({ message: lines.join('\n') });
  };

  if (loading) return <View style={vs.root}><ActivityIndicator color={colors.green} style={{ marginTop: 100 }} /></View>;
  if (!dre) return <View style={vs.root}><Text style={{ color: colors.t2, textAlign: 'center', marginTop: 100 }}>DRE não encontrada.</Text></View>;

  const lucroColor = dre.lucro >= 0 ? colors.green : colors.red;
  const margem = dre.receita > 0 ? (dre.lucro / dre.receita) * 100 : 0;

  return (
    <View style={vs.root}>
      <View style={vs.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.t2} /></TouchableOpacity>
        <Text style={vs.headerTitle}>{dre.period}</Text>
        <View style={vs.headerRight}>
          <TouchableOpacity onPress={() => setHideValues(!hideValues)} style={vs.iconBtn}>
            <Ionicons name={hideValues ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.t2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={vs.iconBtn}>
            <Ionicons name="share-outline" size={20} color={colors.t2} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={vs.scroll}>
        <View style={[vs.resultCard, { borderColor: `${lucroColor}40` }]}>
          <Text style={vs.resultLabel}>RESULTADO DO MÊS</Text>
          <Text style={[vs.resultValue, { color: lucroColor }]}>{masked(dre.lucro)}</Text>
          <Text style={[vs.resultMargem, { color: lucroColor }]}>Margem: {margem.toFixed(1)}%</Text>
        </View>
        <View style={vs.dreBox}>
          <Text style={vs.dreBoxTitle}>DRE</Text>
          <View style={vs.dreLine}>
            <Text style={vs.dreLineLabel}>Receita bruta</Text>
            <Text style={[vs.dreLineVal, { color: colors.green }]}>{masked(dre.receita)}</Text>
          </View>
          {Object.entries(dre.custos || {}).map(([cat, val]) => (
            <View key={cat} style={[vs.dreLine, vs.dreLineIndent]}>
              <Text style={vs.dreLineSub}>(-) {cat}</Text>
              <Text style={[vs.dreLineVal, { color: colors.red, fontSize: 13 }]}>{masked(val)}</Text>
            </View>
          ))}
          <View style={[vs.dreLine, vs.dreLineSeparator]}>
            <Text style={vs.dreLineLabel}>(-) Total custos</Text>
            <Text style={[vs.dreLineVal, { color: colors.red }]}>{masked(dre.total_custo)}</Text>
          </View>
          <View style={[vs.dreLine, { paddingTop: 12 }]}>
            <Text style={[vs.dreLineLabel, { fontWeight: '800', color: lucroColor }]}>= Lucro líquido</Text>
            <Text style={[vs.dreLineVal, { color: lucroColor, fontSize: 16, fontWeight: '800' }]}>{masked(dre.lucro)}</Text>
          </View>
        </View>
        {dre.by_forn_raw && Object.keys(dre.by_forn_raw).length > 0 && (
          <View style={vs.dreBox}>
            <Text style={vs.dreBoxTitle}>Gastos por fornecedor</Text>
            {Object.entries(dre.by_forn_raw).sort(([, a], [, b]) => b - a).map(([forn, val]) => (
              <View key={forn} style={vs.dreLine}>
                <Text style={vs.dreLineSub} numberOfLines={1}>{forn}</Text>
                <Text style={[vs.dreLineVal, { color: colors.t2, fontSize: 13 }]}>{masked(val)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
const vs = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.t1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.s1, borderRadius: 18, borderWidth: 0.5, borderColor: colors.b1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  resultCard: { backgroundColor: colors.s1, borderRadius: colors.r, padding: 24, alignItems: 'center', borderWidth: 1, gap: 6 },
  resultLabel: { fontSize: 10, color: colors.t3, letterSpacing: 0.8, fontWeight: '600', textTransform: 'uppercase' },
  resultValue: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  resultMargem: { fontSize: 13, fontWeight: '600' },
  dreBox: { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1, gap: 2 },
  dreBoxTitle: { fontSize: 13, fontWeight: '700', color: colors.t2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  dreLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  dreLineIndent: { paddingLeft: 12 },
  dreLineLabel: { fontSize: 14, fontWeight: '600', color: colors.t1 },
  dreLineSub: { fontSize: 13, color: colors.t2, flex: 1 },
  dreLineVal: { fontSize: 14, fontWeight: '700' },
  dreLineSeparator: { borderTopWidth: 0.5, borderTopColor: colors.b1, marginTop: 4, paddingTop: 12 },
});

// SETTINGS
function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [rules, setRules] = useState([]);
  const [forns, setForns] = useState([]);
  const [newKw, setNewKw] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newForn, setNewForn] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getConfigApi().then(({ data }) => { setRules(data.config?.rules || []); setForns(data.config?.fornecedores || []); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try { await saveConfigApi({ rules, fornecedores: forns }); Alert.alert('Salvo!', 'Configurações salvas.'); }
    catch { Alert.alert('Erro', 'Não foi possível salvar.'); }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da conta?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: logout }]);
  };

  return (
    <View style={ss.root}>
      <View style={ss.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.t2} /></TouchableOpacity>
        <Text style={ss.headerTitle}>Configurações</Text>
        <TouchableOpacity onPress={save}><Text style={ss.saveLink}>{saving ? 'Salvando...' : 'Salvar'}</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={ss.scroll}>
        <Text style={ss.section}>CONTA</Text>
        <View style={ss.card}>
          <Text style={ss.accountName}>{user?.nome}</Text>
          <Text style={ss.accountEmail}>{user?.email}</Text>
          {user?.nome_empresa && <Text style={ss.accountCompany}>{user.nome_empresa}</Text>}
        </View>
        <Text style={ss.section}>REGRAS DE CLASSIFICAÇÃO</Text>
        <View style={ss.card}>
          {rules.map((r, i) => (
            <View key={i} style={ss.ruleRow}>
              <Text style={ss.ruleKw}>{r.keyword}</Text>
              <Text style={ss.ruleArrow}>→</Text>
              <Text style={ss.ruleCat}>{r.category}</Text>
              <TouchableOpacity onPress={() => setRules(prev => prev.filter((_, j) => j !== i))}>
                <Ionicons name="close-circle" size={18} color={colors.t3} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={ss.addRow}>
            <TextInput style={[ss.input, { flex: 1 }]} value={newKw} onChangeText={setNewKw} placeholder="Palavra-chave" placeholderTextColor={colors.t3} />
            <TextInput style={[ss.input, { flex: 1 }]} value={newCat} onChangeText={setNewCat} placeholder="Categoria" placeholderTextColor={colors.t3} />
            <TouchableOpacity style={ss.addBtn} onPress={() => { if (newKw.trim() && newCat.trim()) { setRules(p => [...p, { keyword: newKw.trim(), category: newCat.trim() }]); setNewKw(''); setNewCat(''); } }}>
              <Ionicons name="add" size={20} color={colors.green} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={ss.section}>FORNECEDORES</Text>
        <View style={ss.card}>
          {forns.map((f, i) => (
            <View key={i} style={ss.ruleRow}>
              <Text style={ss.ruleKw}>{f.name}</Text>
              <TouchableOpacity onPress={() => setForns(prev => prev.filter((_, j) => j !== i))} style={{ marginLeft: 'auto' }}>
                <Ionicons name="close-circle" size={18} color={colors.t3} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={ss.addRow}>
            <TextInput style={[ss.input, { flex: 1 }]} value={newForn} onChangeText={setNewForn} placeholder="Nome do fornecedor" placeholderTextColor={colors.t3} />
            <TouchableOpacity style={ss.addBtn} onPress={() => { if (newForn.trim()) { setForns(p => [...p, { name: newForn.trim(), color: '#4ade80' }]); setNewForn(''); } }}>
              <Ionicons name="add" size={20} color={colors.green} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={ss.section}>OUTROS</Text>
        <View style={ss.card}>
          <TouchableOpacity style={ss.settRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.red} />
            <Text style={[ss.settTitle, { color: colors.red }]}>Sair da conta</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.t3} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.t1 },
  saveLink: { color: colors.green, fontWeight: '600', fontSize: 14 },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  section: { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  card: { backgroundColor: colors.s1, borderRadius: colors.r, padding: 16, borderWidth: 0.5, borderColor: colors.b1, gap: 10 },
  accountName: { fontSize: 17, fontWeight: '700', color: colors.t1 },
  accountEmail: { fontSize: 13, color: colors.t2 },
  accountCompany: { fontSize: 12, color: colors.t3, marginTop: 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleKw: { fontSize: 13, color: colors.t1, flex: 1 },
  ruleArrow: { fontSize: 13, color: colors.t3 },
  ruleCat: { fontSize: 13, color: colors.green, flex: 1 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { backgroundColor: colors.s2, borderRadius: 8, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 10, fontSize: 13 },
  addBtn: { width: 38, height: 38, backgroundColor: `${colors.green}20`, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  settTitle: { fontSize: 14, color: colors.t1, fontWeight: '600', flex: 1 },
});

// ─── NAVIGATION ──────────────────────────────────────────────
const Stack = createStackNavigator();
const screenOpts = { headerShown: false, cardStyle: { backgroundColor: colors.bg } };

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="NewDRE" component={NewDREScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen name="ViewDRE" component={ViewDREScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
