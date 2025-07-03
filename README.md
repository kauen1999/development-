# 🎟️ EntradaMaster

## ✅ Checklist de Funcionalidades

### 🔐 Etapa 1 - Autenticação
- [x] Registro local de usuário com `bcrypt`
- [x] Login com validação de senha
- [x] Autenticação via OAuth (Google, Facebook, LinkedIn)
- [x] Sessão persistente com `NextAuth`
- [x] Middleware `protectedProcedure` e `adminProcedure`

### 🎫 Etapa 2 - Eventos
- [x] Criação de evento (restrito a usuários logados)
- [x] Listagem pública de eventos
- [x] Detalhamento de evento
- [x] Inscrição em eventos

### 👤 Etapa 3 - Perfil & Notificações
- [x] Atualização de dados do perfil
- [x] Criação de notificações
- [x] Listagem e exclusão de notificações

### 🔒 Etapa 4 - Controle de Acesso (RBAC)
- [x] Controle de usuários com roles (`USER` | `ADMIN`)
- [x] Middleware `isAdmin`
- [x] Painel administrativo parcial (listagem/alteração de usuários)

### 🛒 Etapa 5 - Pedidos & Ingressos
- [x] Criação de pedidos com itens relacionados
- [x] Cálculo automático do total
- [x] Relacionamento com eventos e categorias
- [x] Geração de ingressos digitais
- [x] Criação e listagem de pedidos

### 💵 Etapa 6 - Pagamentos
- [x] Suporte a múltiplos provedores (`STRIPE`, `MERCADOPAGO`, `PAGOFACIL`, `RAPIPAGO`)
- [x] Registro de resposta bruta (webhook-safe)

### 📄 Etapa 7 - Faturas
- [x] Geração de faturas em PDF com `PDFKit`
- [x] Armazenamento em disco local
- [x] Consulta por `orderId`

---

## ⚙️ Tecnologias Principais

- **Next.js (App Router + API routes)**
- **TypeScript + Zod (validação)**
- **tRPC (backend tipado)**
- **Prisma + PostgreSQL** (via Supabase)
- **NextAuth.js** (com suporte a OAuth + credenciais)
- **Stripe / MercadoPago SDK**
- **PDFKit** para faturas
- **QR Code, Wallet Pass (em breve)**

---

## 🚀 Como rodar localmente

### 📦 Pré-requisitos

- Node.js `v18+`
- PostgreSQL (pode ser local ou Supabase)
- Yarn ou npm
- Conta no Stripe / MercadoPago (para testes)
- `OpenSSL` (para gerar JWT secrets, se necessário)

---

### 🔧 Passo a passo de instalação

```bash
# Clone o repositório
git clone https://github.com/Jarlez/entradamaster.git
cd entradamaster

# Instale as dependências
npm install

# Execute a primeira migração
npx prisma migrate dev --name init

# Gere os arquivos do cliente Prisma
npx prisma generate

# Rodar o servidor local
npm run dev

Acesse: http://localhost:3000
