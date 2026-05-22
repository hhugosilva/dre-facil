# DRE Fácil — Frontend (Mobile)

Aplicativo mobile para geração de relatórios DRE (Demonstração do Resultado do Exercício) para pequenos empreendedores.

**Backend:** `https://dre-backend-v2-production.up.railway.app`

---

## Tecnologias utilizadas

| Tecnologia | Versão | Função |
|---|---|---|
| React Native | 0.81.5 | Framework mobile multiplataforma |
| Expo | SDK 54 | Ferramentas e bibliotecas nativas |
| TypeScript | 5.3 | Tipagem estática |
| React Navigation | 7.x | Navegação entre telas |
| Axios | 1.7 | Requisições HTTP para a API |
| AsyncStorage | 2.x | Persistência local no dispositivo |
| Expo Document Picker | 14 | Seleção de arquivos PDF |
| Expo File System | 19 | Leitura de arquivos locais |
| react-native-svg | 15 | Gráfico de evolução anual (área/linha) |
| Expo Web Browser | 15 | OAuth Google (abre browser nativo) |

---

## Estrutura do projeto

```
dre-facil/
├── App.tsx                    # Ponto de entrada
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx    # Estado global de autenticação (usuário, token)
│   │   ├── AppContext.tsx     # Estado global do app (histórico, config)
│   │   └── ThemeContext.tsx   # Tema claro/escuro
│   ├── screens/
│   │   ├── LoginScreen.tsx    # Login, cadastro, recuperação de senha, 2FA
│   │   ├── DashboardScreen.tsx# Painel principal com KPIs e gráfico
│   │   ├── UploadScreen.tsx   # Importação de extrato (PDF ou texto) + IA
│   │   ├── ReviewScreen.tsx   # Revisão e edição dos lançamentos
│   │   └── ConfigScreen.tsx   # Configurações (conta, categorias, segurança)
│   ├── services/
│   │   └── api.ts             # Todas as chamadas à API REST
│   ├── navigation/
│   │   └── AppNavigator.tsx   # Rotas e tabs da navegação
│   ├── utils/
│   │   ├── storage.ts         # AsyncStorage (token, memória IA, dados prev)
│   │   └── format.ts          # Formatação de moeda e datas
│   └── theme/
│       └── index.ts           # Cores (dark/light), categorias padrão
```

---

## Telas

### LoginScreen
- Login com e-mail e senha
- Cadastro com verificação de e-mail (código OTP)
- Recuperação de senha por link
- Login social com Google (OAuth)
- Verificação em 2 etapas (MFA) — código OTP após login

### DashboardScreen
- Saudação personalizada com nome e empresa
- **KPIs:** faturamento total, lucro total, custo total, melhor mês
- **Gráfico de área** com evolução mensal do faturamento (linha real + projeção)
- Lista de meses salvos com lucro, receita e custo
- Modal de detalhe com breakdown por categoria
- **Botão olho** para ocultar todos os valores (privacidade)
- Pull-to-refresh

### UploadScreen
- Importação de extrato bancário via **PDF** (Anthropic Claude lê e extrai)
- Importação via **texto colado** (copia e cola do banco)
- Detecção automática do banco (hint ao usuário)
- Envio para IA classificar as transações por categoria

### ReviewScreen
- Lista de lançamentos classificados pela IA
- Edição manual de categoria, descrição e valor
- Adicionar/remover lançamentos
- **Memória inteligente:** aprende reclassificações do usuário e aplica automaticamente
- Resumo: receita, custo e lucro calculados em tempo real
- Salvar DRE do mês

### ConfigScreen (Configurações)
- **Minha Conta:** editar nome, empresa, CNPJ, alterar senha, excluir conta
- **Segurança:** ativar/desativar verificação em 2 etapas (MFA)
- **Categorias:** criar, editar, excluir categorias de custo/receita
- **Registros Anteriores:** inserir faturamento de meses do ano anterior (para projeção)
- **Regras de Classificação:** regras automáticas por palavra-chave
- **Tema:** alternância entre modo escuro e claro

---

## Fluxo principal do usuário

```
1. Cadastro → código OTP por e-mail → conta criada
2. Login → (2FA se ativado) → Dashboard
3. Upload → importa extrato PDF ou texto
4. IA classifica os lançamentos automaticamente
5. Revisão → usuário ajusta e salva
6. Dashboard atualiza com os novos dados do mês
```

---

## Autenticação e estado global

### AuthContext
```typescript
type User = {
  id: number;
  nome: string;
  email: string;
  nome_empresa?: string | null;
  cnpj?: string | null;
  two_factor_enabled?: boolean;
}
```
- Token JWT salvo no AsyncStorage com a chave `dreToken`
- Ao abrir o app, chama `/api/auth/me` para restaurar a sessão

### ThemeContext
```typescript
{ isDark: boolean; colors: Colors; toggleTheme: () => void }
```
- Preferência salva no AsyncStorage (`appTheme`)
- Padrão: modo escuro

---

## Dados locais (AsyncStorage)

| Chave | Conteúdo |
|---|---|
| `dreToken` | JWT do usuário logado |
| `appTheme` | `'dark'` ou `'light'` |
| `dreMemory_${userId}` | Memória de reclassificações da IA (por usuário) |
| `drePrevYear_${userId}` | Faturamento do ano anterior (por usuário) |

Todas as chaves são isoladas por `userId` — dados de contas diferentes nunca se misturam.

---

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- App **Expo Go** no celular (iOS ou Android)

### Instalação
```bash
cd dre-facil
npm install
npx expo start --tunnel
```

Escanear o QR Code com o Expo Go para abrir no celular.

### Build de produção
```bash
# Android APK/AAB
eas build --platform android

# iOS
eas build --platform ios
```

---

## Segurança no frontend

- Token JWT nunca exposto em logs
- Interceptor Axios: remove token e faz logout automático em resposta `401`
- Valores financeiros ocultáveis com botão olho (privacidade visual)
- Política de privacidade exibida no cadastro (aceite obrigatório)
- Dados de cada usuário separados no AsyncStorage por `userId`
