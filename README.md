# EntradaMaster

Sistema de gerenciamento de eventos com autenticação, listagem e inscrição, voltado para venda de ingressos e administração de usuários e categorias.

## ✅ Checklist de Implementação

### Etapa 1 - Autenticação
- [x] Registro local de usuário com bcrypt
- [x] Login com validação de senha
- [x] Recuperação de perfil do usuário
- [x] Atualização de perfil
- [x] NextAuth integrado

### Etapa 2 - Eventos
- [x] Criação de evento (restrito a usuários logados)
- [x] Listagem pública de eventos
- [x] Detalhamento de evento
- [x] Inscrição em evento

### Etapa 3 - RBAC (Controle de Acesso)
- [x] Middleware isAdmin
- [x] Listagem de usuários (admin)
- [x] Atualização de permissões (admin)
- [x] Exclusão de usuários (admin)

### Etapa 4 - Notificações e Perfil
- [x] Criação de notificações ao registrar usuário
- [x] Listagem de notificações por usuário
- [x] Remoção de notificações
- [x] Atualização de perfil
- [x] Recuperação de perfil

### Etapa 5 - Painel Administrativo (parcial)
- [x] Listagem de usuários
- [x] Gerenciamento de roles
- [x] Exclusão de usuários

## 🚀 Como rodar o projeto localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL (local ou Supabase)
- Yarn ou npm

### Instalação

```bash
# Clone o repositório
https://github.com/Jarlez/entradamaster.git

# Acesse a pasta do projeto
cd entradamaster

# Instale as dependências
npm install

# Configure o arquivo .env
cp .env.example .env
# Edite o .env com sua URL de banco de dados PostgreSQL (Ex: fornecida pelo Supabase)
```

### Banco de dados
```bash
# Crie o banco com Prisma
npx prisma migrate dev --name init
```

### Rodar o servidor
```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)
