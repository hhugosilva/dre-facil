import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { meApi } from '../services/api';
import { setToken } from '../utils/storage';

WebBrowser.maybeCompleteAuthSession();

type View = 'login' | 'register' | 'forgot';

// ─── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <View style={s.logoWrap}>
      <View style={s.logoMark}>
        <Text style={s.logoMarkText}>D</Text>
      </View>
      <View>
        <Text style={s.brand}>
          DRE<Text style={{ color: colors.green }}>Fácil</Text>
        </Text>
        <Text style={s.brandSub}>Finanças na palma da mão</Text>
      </View>
    </View>
  );
}

// ─── Botão social ──────────────────────────────────────────────────────────────
function SocialButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.socialBtn} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon as any} size={20} color={colors.t1} />
      <Text style={s.socialBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Tela principal ────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { login, register, setUser } = useAuth();
  const [view, setView]     = useState<View>('login');
  const [nome, setNome]     = useState('');
  const [empresa, setEmpresa] = useState('');
  const [email, setEmail]   = useState('');
  const [senha, setSenha]   = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState('');
  const [privOk, setPrivOk] = useState(false);
  const [privModal, setPrivModal] = useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Pós-cadastro: aguardar verificação de e-mail
  const [pendingVerify, setPendingVerify] = useState(false);


  const reset = () => {
    setErr(''); setNome(''); setEmpresa(''); setEmail(''); setSenha('');
    setPrivOk(false); setPendingVerify(false); setForgotEmail(''); setForgotSent(false);
  };

  const goTo = (v: View) => { reset(); setView(v); };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setErr('');
    if (!email.trim() || !senha) { setErr('Preencha todos os campos.'); return; }
    setLoading(true);
    try { await login(email.trim().toLowerCase(), senha); }
    catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Erro de conexão.';
      setErr(msg);
    }
    setLoading(false);
  };

  // ── Cadastro ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setErr('');
    if (!nome.trim() || !email.trim() || !senha) { setErr('Preencha todos os campos obrigatórios.'); return; }
    if (senha.length < 6) { setErr('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (!privOk) { setErr('Aceite a Política de Privacidade para continuar.'); return; }
    setLoading(true);
    try {
      await register(nome.trim(), email.trim().toLowerCase(), senha, empresa.trim() || undefined);
      setPendingVerify(true);
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Erro ao criar conta.';
      setErr(msg);
    }
    setLoading(false);
  };

  // ── Recuperar senha ────────────────────────────────────────────────────────
  const handleForgot = async () => {
    if (!forgotEmail.trim()) { Alert.alert('Atenção', 'Digite seu e-mail.'); return; }
    setForgotLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email: forgotEmail.trim().toLowerCase() });
      setForgotSent(true);
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Não foi possível enviar o e-mail.');
    }
    setForgotLoading(false);
  };

  // ── Social ─────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const returnUrl  = Linking.createURL('google-auth');
    const startUrl   = `https://dre-backend-v2-production.up.railway.app/api/auth/google/start?session=${encodeURIComponent(sessionId)}&return=${encodeURIComponent(returnUrl)}`;

    setLoading(true);
    setErr('');
    try {
      const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token  = parsed.queryParams?.token as string | undefined;
        if (token) {
          await setToken(token);
          const { data } = await meApi();
          setUser(data.user);
          return;
        }
      }
      if (result.type !== 'cancel') setErr('Não foi possível entrar com Google.');
    } catch {
      setErr('Erro ao entrar com Google.');
    }
    setLoading(false);
  };


  // ─────────────────────────────────────────────────────────────────────────────
  // Vista: Aguardando verificação de e-mail
  if (pendingVerify) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Ionicons name="mail-open-outline" size={64} color={colors.green} />
        <Text style={[s.brand, { marginTop: 24, fontSize: 22, textAlign: 'center' }]}>Verifique seu e-mail</Text>
        <Text style={[s.brandSub, { textAlign: 'center', marginTop: 12, lineHeight: 22 }]}>
          Enviamos um link de confirmação para{'\n'}
          <Text style={{ color: colors.t1, fontWeight: '600' }}>{email}</Text>
          {'\n\n'}Clique no link do e-mail para ativar sua conta.
        </Text>
        <TouchableOpacity style={[s.btn, { marginTop: 32, width: '100%' }]} onPress={() => goTo('login')}>
          <Text style={s.btnText}>Já confirmei — Entrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setPendingVerify(false)}>
          <Text style={s.link}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.byDrex}>by DREX</Text>
      </View>
    );
  }

  // Vista: Recuperar senha
  if (view === 'forgot') {
    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Logo />
          <View style={s.box}>
            <TouchableOpacity style={s.backRow} onPress={() => goTo('login')}>
              <Ionicons name="arrow-back" size={16} color={colors.t3} />
              <Text style={s.backText}>Voltar ao login</Text>
            </TouchableOpacity>
            <Text style={s.title}>Recuperar senha</Text>

            {forgotSent ? (
              <View style={s.successBox}>
                <Ionicons name="checkmark-circle" size={32} color={colors.green} />
                <Text style={s.successTitle}>E-mail enviado!</Text>
                <Text style={s.successSub}>
                  Verifique sua caixa de entrada em{'\n'}
                  <Text style={{ color: colors.t1 }}>{forgotEmail}</Text>{'\n'}
                  e clique no link para redefinir sua senha.
                </Text>
                <TouchableOpacity style={[s.btn, { marginTop: 20 }]} onPress={() => goTo('login')}>
                  <Text style={s.btnText}>Voltar ao login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={s.forgotDesc}>
                  Digite o e-mail da sua conta e enviaremos um link para redefinir a senha.
                </Text>
                <Text style={s.label}>E-MAIL</Text>
                <TextInput style={[s.input, { marginBottom: 16 }]}
                  value={forgotEmail} onChangeText={setForgotEmail}
                  placeholder="seu@email.com" placeholderTextColor={colors.t3}
                  keyboardType="email-address" autoCapitalize="none" />
                <TouchableOpacity style={s.btn} onPress={handleForgot} disabled={forgotLoading}>
                  {forgotLoading
                    ? <ActivityIndicator color="#0a1a0e" />
                    : <Text style={s.btnText}>Enviar link de recuperação</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={s.byDrex}>by DREX</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Vista: Login / Cadastro
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Logo />

        <View style={s.box}>
          <Text style={s.title}>{view === 'login' ? 'Entrar na conta' : 'Criar conta'}</Text>

          {/* ── Cadastro: nome + empresa ── */}
          {view === 'register' && (
            <>
              <Text style={s.label}>NOME COMPLETO *</Text>
              <TextInput style={s.input} value={nome} onChangeText={setNome}
                placeholder="Seu nome" placeholderTextColor={colors.t3} autoCapitalize="words" />

              <Text style={s.label}>NOME DA EMPRESA</Text>
              <TextInput style={s.input} value={empresa} onChangeText={setEmpresa}
                placeholder="Nome da empresa (opcional)" placeholderTextColor={colors.t3} autoCapitalize="words" />
            </>
          )}

          {/* ── E-mail ── */}
          <Text style={s.label}>E-MAIL *</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            placeholder="seu@email.com" placeholderTextColor={colors.t3}
            keyboardType="email-address" autoCapitalize="none" />

          {/* ── Senha ── */}
          <Text style={s.label}>SENHA *</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={senha} onChangeText={setSenha}
              placeholder={view === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
              placeholderTextColor={colors.t3} secureTextEntry={!showSenha}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowSenha(v => !v)}>
              <Ionicons name={showSenha ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.t3} />
            </TouchableOpacity>
          </View>

          {/* ── Esqueci a senha (só login) ── */}
          {view === 'login' && (
            <TouchableOpacity style={s.forgotLink} onPress={() => goTo('forgot')}>
              <Text style={s.link}>Esqueci minha senha</Text>
            </TouchableOpacity>
          )}

          {/* ── Política de privacidade (só cadastro) ── */}
          {view === 'register' && (
            <TouchableOpacity style={s.privRow} onPress={() => setPrivOk(v => !v)} activeOpacity={0.8}>
              <View style={[s.checkbox, privOk && s.checkboxOn]}>
                {privOk && <Ionicons name="checkmark" size={13} color="#0a1a0e" />}
              </View>
              <Text style={s.privText}>
                Li e aceito os{' '}
                <Text style={s.privLink} onPress={() => setPrivModal(true)}>Termos de Uso e Política de Privacidade</Text>
              </Text>
            </TouchableOpacity>
          )}

          {!!err && <Text style={s.err}>{err}</Text>}

          {/* ── Botão principal ── */}
          <TouchableOpacity
            style={[s.btn, { marginTop: err ? 8 : (view === 'login' ? 0 : 8) }]}
            onPress={view === 'login' ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#0a1a0e" />
              : <Text style={s.btnText}>{view === 'login' ? 'Entrar' : 'Criar conta'}</Text>}
          </TouchableOpacity>

          {/* ── Divisor social ── */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>ou continue com</Text>
            <View style={s.dividerLine} />
          </View>

          {/* ── Botões sociais ── */}
          <View style={s.socialRow}>
            <SocialButton icon="logo-google" label="Google" onPress={handleGoogle} />
          </View>
        </View>

        {/* ── Trocar modo ── */}
        <TouchableOpacity onPress={() => goTo(view === 'login' ? 'register' : 'login')} style={{ marginTop: 20 }}>
          <Text style={s.switchText}>
            {view === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
            <Text style={{ color: colors.green, fontWeight: '600' }}>
              {view === 'login' ? 'Criar conta' : 'Entrar'}
            </Text>
          </Text>
        </TouchableOpacity>

        <Text style={s.byDrex}>by DREX</Text>
      </ScrollView>

      {/* ── Modal Política de Privacidade ── */}
      <Modal visible={privModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Política de Privacidade</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <Text style={s.privBody}>
                <Text style={s.privSection}>1. Coleta de dados{'\n'}</Text>
                Coletamos seu nome, e-mail e dados financeiros inseridos no app para gerar relatórios DRE personalizados.{'\n\n'}

                <Text style={s.privSection}>2. Uso dos dados{'\n'}</Text>
                Os dados são usados exclusivamente para gerar seus relatórios financeiros e não são compartilhados com terceiros sem seu consentimento.{'\n\n'}

                <Text style={s.privSection}>3. Segurança{'\n'}</Text>
                Suas informações são armazenadas de forma criptografada e protegidas por autenticação JWT.{'\n\n'}

                <Text style={s.privSection}>4. Seus direitos{'\n'}</Text>
                Você pode solicitar a exclusão da sua conta e todos os dados associados a qualquer momento pelo suporte.{'\n\n'}

                <Text style={s.privSection}>5. Contato{'\n'}</Text>
                Para dúvidas sobre sua privacidade, entre em contato: contato@drex.com.br
              </Text>
            </ScrollView>
            <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={() => { setPrivOk(true); setPrivModal(false); }}>
              <Text style={s.btnText}>Li e aceito</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 10, alignItems: 'center' }} onPress={() => setPrivModal(false)}>
              <Text style={s.link}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.bg },
  scroll:       { flexGrow: 1, padding: 24, paddingTop: 60, justifyContent: 'center' },

  // Logo
  logoWrap:     { flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 36 },
  logoMark:     { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { fontSize: 24, fontWeight: '900', color: '#0a1a0e' },
  brand:        { fontSize: 28, fontWeight: '800', color: colors.t1, letterSpacing: -0.5 },
  brandSub:     { fontSize: 12, color: colors.t2, marginTop: 2 },

  // Box
  box:          { backgroundColor: colors.s1, borderRadius: colors.r, padding: 22, borderWidth: 0.5, borderColor: colors.b2 },
  title:        { fontSize: 20, fontWeight: '700', color: colors.t1, marginBottom: 18 },
  label:        { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.7, marginBottom: 6, textTransform: 'uppercase' },
  input:        { backgroundColor: colors.s2, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 13, fontSize: 14, marginBottom: 14 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  eyeBtn:       { position: 'absolute', right: 12, top: 14 },
  forgotLink:   { alignSelf: 'flex-end', marginBottom: 16, marginTop: 2 },
  link:         { color: colors.green, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  err:          { color: colors.red, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 4 },

  // Política
  privRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14, marginTop: 4 },
  checkbox:     { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.b3, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn:   { backgroundColor: colors.green, borderColor: colors.green },
  privText:     { fontSize: 12, color: colors.t2, flex: 1, lineHeight: 18 },
  privLink:     { color: colors.green, fontWeight: '600' },

  // Botão principal
  btn:          { backgroundColor: colors.green, borderRadius: colors.rs, padding: 15, alignItems: 'center' },
  btnText:      { color: '#0a1a0e', fontWeight: '700', fontSize: 14 },

  // Social
  dividerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine:  { flex: 1, height: 0.5, backgroundColor: colors.b2 },
  dividerText:  { fontSize: 11, color: colors.t3 },
  socialRow:    { flexDirection: 'row', gap: 10 },
  socialBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.s2, borderRadius: colors.rs, padding: 13, borderWidth: 0.5, borderColor: colors.b2 },
  socialBtnText:{ fontSize: 13, fontWeight: '600', color: colors.t1 },

  // Switch mode
  switchText:   { textAlign: 'center', color: colors.t2, fontSize: 13 },
  byDrex:       { textAlign: 'center', color: colors.t3, fontSize: 11, marginTop: 28 },

  // Forgot
  backRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText:     { fontSize: 13, color: colors.t3 },
  forgotDesc:   { fontSize: 13, color: colors.t2, lineHeight: 20, marginBottom: 18 },
  successBox:   { alignItems: 'center', paddingVertical: 12 },
  successTitle: { fontSize: 18, fontWeight: '700', color: colors.t1, marginTop: 12 },
  successSub:   { fontSize: 13, color: colors.t2, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // Modal privacidade
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHandle:  { width: 36, height: 4, backgroundColor: colors.b3, borderRadius: 99, alignSelf: 'center', marginBottom: 14 },
  modalTitle:   { fontSize: 17, fontWeight: '700', color: colors.t1, marginBottom: 14 },
  privBody:     { fontSize: 13, color: colors.t2, lineHeight: 21 },
  privSection:  { fontWeight: '700', color: colors.t1 },
});
