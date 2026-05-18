import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { forgotPasswordApi } from '../services/api';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { Alert.alert('Campo obrigatório', 'Informe seu e-mail.'); return; }
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim().toLowerCase());
      setSent(true);
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Não foi possível enviar o e-mail.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={colors.t2} />
        </TouchableOpacity>

        <Text style={s.logoText}>DRE<Text style={s.logoAccent}>.fácil</Text></Text>
        <Text style={s.title}>Recuperar senha</Text>

        {!sent ? (
          <>
            <Text style={s.desc}>Informe seu e-mail e enviaremos um link para redefinir sua senha.</Text>
            <Text style={s.label}>E-MAIL</Text>
            <TextInput
              style={s.input} value={email} onChangeText={setEmail}
              placeholder="seu@email.com" placeholderTextColor={colors.t3}
              keyboardType="email-address" autoCapitalize="none"
            />
            <TouchableOpacity style={s.btnPrimary} onPress={handleSend} disabled={loading}>
              {loading ? <ActivityIndicator color="#0a1a0e" /> : <Text style={s.btnPrimaryText}>Enviar link</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.successBox}>
            <Ionicons name="mail-outline" size={48} color={colors.green} />
            <Text style={s.successTitle}>E-mail enviado!</Text>
            <Text style={s.successDesc}>Verifique sua caixa de entrada e clique no link para redefinir sua senha.</Text>
            <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('Login')}>
              <Text style={s.btnPrimaryText}>Voltar ao login</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={s.byText}>By DREX</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.bg },
  inner:        { flex: 1, padding: 24, paddingTop: 60 },
  back:         { marginBottom: 32 },
  logoText:     { fontSize: 28, fontWeight: '700', color: colors.t1, marginBottom: 4 },
  logoAccent:   { color: colors.green },
  title:        { fontSize: 22, fontWeight: '700', color: colors.t1, marginBottom: 12 },
  desc:         { fontSize: 14, color: colors.t2, lineHeight: 22, marginBottom: 28 },
  label:        { fontSize: 10, fontWeight: '600', color: colors.t3, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  input:        { backgroundColor: colors.s1, borderRadius: colors.rs, borderWidth: 0.5, borderColor: colors.b2, color: colors.t1, padding: 14, fontSize: 15, marginBottom: 20 },
  btnPrimary:   { backgroundColor: colors.green, borderRadius: colors.rs, padding: 16, alignItems: 'center', marginTop: 8 },
  btnPrimaryText:{ color: '#0a1a0e', fontWeight: '700', fontSize: 15 },
  successBox:   { alignItems: 'center', gap: 16, marginTop: 40 },
  successTitle: { fontSize: 20, fontWeight: '700', color: colors.t1 },
  successDesc:  { fontSize: 14, color: colors.t2, textAlign: 'center', lineHeight: 22 },
  byText:       { textAlign: 'center', color: colors.t3, fontSize: 11, position: 'absolute', bottom: 32, alignSelf: 'center' },
});
