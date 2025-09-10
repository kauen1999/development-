
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

# Rodar migrações do Prisma
npx prisma migrate dev --name init
npx prisma generate

# Rodar o servidor local
npm run dev

Acesse: http://localhost:3000

