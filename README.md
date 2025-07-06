## 🎯 Checklist de Funcionalidades – EntradaMaster

### 🔐 1. Autenticação & Autorização

- [x] Registro de usuário com hash de senha (`bcrypt`)
- [x] Login local com validação de senha
- [x] OAuth via NextAuth (Google, Facebook, LinkedIn)
- [x] Middleware `protectedProcedure` (tRPC)
- [x] Roles: `USER`, `ADMIN`, `ORGANIZER`
- [x] Proteção por role (`adminProcedure`, `organizerProcedure`)
- [x] Sessões com NextAuth (`Session`, `Account`, `User`)
- [x] Logout e expiração automática da sessão

---

### 📦 2. Modelos de Dados (Prisma)

- [x] `User` com role e dados de perfil
- [x] `Event` com título, descrição, datas, local e status
- [x] `TicketType` com nome, preço, quantidade
- [x] `Order` relacionada ao usuário
- [x] `OrderItem` para representar cada ingresso na ordem
- [x] `Payment` com status, provedor, metadata
- [x] `Ticket` com QR ID único, vinculado ao pedido
- [x] `Invoice` gerada após pagamento
- [x] `WebhookLog` para registrar chamadas externas

---

### 🧾 3. Lógica de Eventos

- [x] Criação de evento (apenas organizador logado)
- [x] Atualização/cancelamento de evento
- [x] Estado: `draft`, `published`, `cancelled`
- [x] Datas de início, fim e encerramento de venda
- [x] Capacidade total e por tipo de ingresso
- [x] Slug único para URLs

---

### 🛒 4. Pedido & Carrinho

- [x] Criação de `Order` com múltiplos ingressos
- [x] Validação de disponibilidade antes da criação
- [x] Cálculo e persistência do valor total
- [x] Status: `pending`, `paid`, `expired`, `cancelled`
- [x] Expiração automática de pedidos (ex: 10min)
- [x] Validação por Zod nas entradas

---

### 💳 5. Pagamentos — Stripe

- [x] Criação de `PaymentIntent` com `metadata.orderId`
- [x] Armazenamento da resposta bruta no banco (`Payment`)
- [x] Webhook `payment_intent.succeeded` funcional
- [x] Verificação do `metadata.orderId`
- [x] Atualização do status do pedido para `paid`
- [x] Geração automática de tickets
- [x] Tratamento de falhas e logs
- [x] Armazenamento sanitizado do `rawResponse` da API
- [x] Validação e parsing seguro antes de persistir no banco
---

### 🎟️ 6. Geração de Tickets (QR + PDF)

- [x] Geração de `Ticket` com `qrId` seguro (UUID/token)
- [x] Geração de QR Code `.png`
- [x] Geração de PDF com dados do ingresso + QR
- [x] Armazenamento local (`/public/tickets/`)
- [x] Salvamento da URL do PDF no banco
- [ ] Geração de `.pkpass` (Apple Wallet) ou link Google Wallet
- [x] Armazenamento da URL (`walletPassUrl`)
- [x] Validação da compatibilidade com o evento e ticket
- [x] Expor essa URL via endpoint seguro
---

### 📲 7. Validação de Ingressos

- [x] Endpoint protegido para leitura de QR
- [x] Consulta por `qrId` e marcação como `usedAt`
- [x] Prevenção de reuso do ingresso
- [x] Registro de `validadorId`, `device`, `timestamp`

---

### 🧾 8. Faturas (Invoice)

- [x] Geração de fatura após pagamento
- [x] PDF gerado com dados da ordem
- [x] Armazenamento local (`/public/invoices/`)
- [x] Salvamento da URL no banco

---

### 🛡️ 9. Segurança & Boas Práticas

- [x] Validação com Zod em todos os inputs
- [x] Sanitização de dados nos webhooks
- [ ] Rate limit nas rotas públicas (login, eventos, webhooks)
- [x] Proteção por role em todas as rotas privadas
- [ ] Controle de acesso a arquivos (tickets, invoices)
- [ ] Auditoria de ações administrativas

---

### 📈 10. Admin & Observabilidade

- [ ] Listagem de ordens, tickets e pagamentos por evento
- [ ] Exportação (CSV ou JSON) de ingressos vendidos
- [ ] Dashboard resumido por evento (via API)
- [x] Logs acessíveis para admin (webhook, pagamentos, falhas)

## ⚙️ Tecnologias Utilizadas

- **Next.js** (App Router + API Routes)
- **TypeScript** (100% tipado)
- **Zod** – Validação de inputs e variáveis de ambiente
- **tRPC** – API tipada, segura e sem boilerplate
- **Prisma ORM** – Modelagem e acesso ao PostgreSQL (via Supabase)
- **NextAuth.js** – Autenticação via OAuth e credenciais (`bcrypt`)
- **Stripe SDK** – Integração completa com PaymentIntent + Webhooks
- **PDFKit** – Geração de ingressos e faturas em PDF
- **QRCode** – Criação de QR Codes para tickets digitais
- **.pkpass** – Suporte a Wallet Pass (em progresso)
- **Cuid2** – Geração de IDs únicos seguros
- **Pino** – Logging estruturado (em configuração)
- **dotenv** – Gerenciamento de variáveis sensíveis

---

## 🚀 Como rodar o projeto localmente

### 📦 Requisitos

- [Node.js](https://nodejs.org/) `v18+`
- [PostgreSQL](https://www.postgresql.org/) local ou conta no [Supabase](https://supabase.com/)
- Conta no [Stripe](https://stripe.com/) (modo teste)
- [Ngrok](https://ngrok.com/) (para testes de webhooks)
- (Opcional) `OpenSSL` para gerar segredos
- Editor recomendado: [VSCode](https://code.visualstudio.com/)

---

### 🧪 Setup local

```bash
# Clone o repositório
git clone https://github.com/Jarlez/entradamaster.git
cd entramaster

# Checkout na sua branch de trabalho
git checkout Jocean

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais do banco, Stripe, etc.

# Rodar migrações do Prisma
npx prisma migrate dev --name init
npx prisma generate

# Rodar servidor de desenvolvimento
npm run dev