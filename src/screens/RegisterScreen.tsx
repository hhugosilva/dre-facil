import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { registerApi } from '../services/api';

const PRIVACY_URL = 'https://frontend-six-topaz-83.vercel.app/privacidade';

export default function RegisterScreen({ navigation }: any) {
  const [nome, setNome] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [aceitouPolitica, setAceitouPolitica] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nome.trim() || !email.trim() || !senha || !nomeEmpresa.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos.');
      return;
    }
    if (senha.length < 8) {
      Alert.alert('Senha fraca', 'A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirma) {
      Alert.alert('Senhas diferentes', 'As senhas não coincidem.');
      return;
    }
    if (!aceitouPolitica) {
      Alert.alert('Política de Privacidade', 'Você precisa aceitar a Política de Privacidade para continuar.');
      return;
    }
    setLoading(true);
    try {
      await registerApi(nome.trim(), email.trim().toLowerCase(), senha, nomeEmpresa.trim());
      Alert.alert(
        '✅ Conta criada!',
        'Um e-mail de verificação foi enviado. Confirme antes de entrar.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Não foi possível criar a conta.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <View style={s.logoArea}>
          <Text style={s.logoText}>DRE<Text style={s.logoAccent}>.fácil</Text></Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Criar conta</Text>

          <Text style={s.label}>SEU NOME</Text>
          <TextInput style={s.input} value={nome} onChangeText={setNome}
            placeholder="Nome completo" placeholderTextColor={colors.t3} autoCapitalize="words" />

          <Text style={s.label}>NOME DA EMPRESA</Text>
          <TextInput style={s.input} value={nomeEmpresa} onChangeText={setNomeEmpresa}
            placeholder="Ex: Padaria do João ME" placeholderTextColor={colors.t3} autoCapitalize="words" />

          <Text style={s.label}>E-MAIL</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            placeholder="seu@email.com" placeholderTextColor={colors.t3}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

          <Text style={s.label}>SENHA</Text>
          <View style={s.inputRow}>
            <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={senha} onChangeText={setSenha}
              placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.t3}
              secureTextEntry={!showSenha} autoComplete="new-password" />
            <TouchableOpacity onPress={() => setShowSenha(!showSenha)} style={s.eyeBtn}>
              <Ionicons name={showSenha ? 'eye-off' : 'eye'} size={20} color={colors.t3} />
            </TouchableOpacity>
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>CONFIRMAR SENHA</Text>
          <TextInput style={s.input} value={confirma} onChangeText={setConfirma}
            placeholder="Repita a senha" placeholderTextColor={colors.t3}
            secureTextEntry={!showSenha} autoComplete="new-password" />

          {/* Política de Privacidade */}
          <TouchableOpacity style={s.checkRow} onPress={() => setAceitouPolitica(!aceitouPolitica)} activeOpacity={0.8}>
            <View style={[s.checkbox, aceitouPolitica && s.checkboxActive]}>
              {aceitouPolitica && <Ionicons name="checkmark" size={14} color="#0a1a0e" />}
            </View>
            <Text style={s.checkText}>
              Li e aceito a{' '}
              <Text style={s.checkLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
                Política de Privacidade
              </Text>
              {' '}e os Termos de Uso do DRE Fácil, em conformidade com a LGPD.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnPrimary} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#0a1a0e" /> : <Text style={s.btnPrimaryText}>Criar conta</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24 }}>
          <Text style={s.switchText}>Já tem conta? <Text style={s.switchLink}>Entrar</Text></Text>
        </TouchableOpacity>

        <Text style={s.byText}>By DREX</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: colors.bg },
  scroll:         { flexGrow: 1, padding: 24, paddingTop: 48 },
  logoArea:       { alignItems: 'center', marginBottom: 32 },
  logoText:       { fontSize: 32, fontWeight: '700', color: colors.t1, letterSpacing: -1 },
  logoAccent:     { color: colors.green },
  card:           { backgroundColor: colors.s1, borderRadius: colors.r, padding: 24, borderWidth: 0.5, borderColor: colors.b2 },
  cardTitle:      { fontSize: 22, fontWeight: '700', color: colors.t1, marginBottom: 20 },
  label:          { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input:          { backgroundColor: colors.s2, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 14, fontSize: 15, marginBottom: 16 },
  inputRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  eyeBtn:         { padding: 14 },
  checkRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20, marginTop: 4 },
  checkbox:       { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.b2, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  checkboxActive: { backgroundColor: colors.green, borderColor: colors.green },
  checkText:      { flex: 1, fontSize: 13, color: colors.t2, lineHeight: 20 },
  checkLink:      { color: colors.green, fontWeight: '600' },
  btnPrimary:     { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center' },
  btnPrimaryText: { color: '#0a1a0e', fontWeight: '700', fontSize: 15 },
  switchText:     { textAlign: 'center', color: colors.t2, fontSize: 14 },
  switchLink:     { color: colors.green, fontWeight: '600' },
  byText:         { textAlign: 'center', color: colors.t3, fontSize: 11, marginTop: 32 },
});
