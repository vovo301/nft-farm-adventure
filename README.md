# NFT Farm Adventure

## Visão Geral

**NFT Farm Adventure** é um jogo NFT de farming casual que combina elementos de estratégia, gerenciamento de recursos e economia Web3. Os jogadores podem cultivar terras, coletar itens, negociar no marketplace e agora, **criar novos itens através do sistema de crafting**.

Este projeto foi desenvolvido utilizando **React**, **TypeScript**, **Node.js** com **tRPC** para o backend, e **MySQL/TiDB** com **Drizzle ORM** para o banco de dados. A autenticação é feita via Web3 (MetaMask e WalletConnect) e o jogo é integrado à **Base Network**.

## Funcionalidades Principais

- **Farming:** Cultive diversas plantas em suas terras NFT, com elementos de sorte e risco.
- **Inventário:** Gerencie seus itens coletados, com sistema de slots e categorias.
- **Marketplace:** Compre e venda itens com outros jogadores, com taxas de transação e economia de tokens HARVEST.
- **Crafting:** Crie novos itens a partir de receitas, utilizando ingredientes do seu inventário. Acompanhe o progresso e colete seus produtos.

## Sistema de Crafting (Fase 10)

O sistema de crafting permite que os jogadores transformem itens básicos em itens mais avançados ou valiosos. Ele inclui:

- **Receitas:** Definição de ingredientes, tempo de crafting, custo (opcional) e item de saída.
- **Jobs de Crafting:** Gerenciamento de processos de criação em andamento, com status, tempo restante e chance de sucesso.
- **Interface Dedicada:** Uma página e um painel intuitivos para visualizar receitas, iniciar novos jobs e acompanhar os existentes.

Para mais detalhes sobre o sistema de crafting, consulte:
- [API de Crafting](./CRAFTING_API.md)
- [Otimizações e Boas Práticas de Crafting](./CRAFTING_OPTIMIZATION.md)
- [Guia de Início Rápido do Crafting](./CRAFTING_QUICKSTART.md)

## Estrutura do Projeto

```
nft-farm-game/
├── client/             # Frontend (React, TypeScript, TailwindCSS)
│   ├── public/
│   ├── src/
│   │   ├── _core/      # Hooks e utilitários core
│   │   ├── components/ # Componentes de UI (incluindo CraftingPanel)
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── pages/      # Páginas (Home, Farming, Inventory, Marketplace, Crafting)
├── server/             # Backend (Node.js, tRPC)
│   ├── _core/          # Core do servidor
│   ├── routers/        # Routers tRPC (farming, inventory, marketplace, crafting)
│   ├── crafting.ts     # Lógica de negócio do crafting
│   ├── db.ts           # Conexão com banco de dados
│   ├── farming.ts      # Lógica de negócio do farming
│   ├── inventory.ts    # Lógica de negócio do inventário
│   ├── marketplace.ts  # Lógica de negócio do marketplace
│   └── seed-recipes.mjs # Script para popular receitas de crafting
├── shared/             # Código compartilhado entre frontend e backend
├── drizzle/            # Configuração e schema do Drizzle ORM
├── DATABASE_SCHEMA.md  # Documentação do esquema do banco de dados
├── DESIGN_SYSTEM.md    # Documentação do sistema de design
├── GAME_DESIGN.md      # Documentação do design do jogo
├── SMART_CONTRACTS.md  # Documentação dos smart contracts
├── UI_WIREFRAMES.md    # Wireframes da interface do usuário
├── todo.md             # Lista de tarefas do projeto
└── README.md           # Este arquivo
```

## Como Rodar o Projeto

### Pré-requisitos

- Node.js (v18 ou superior)
- pnpm (gerenciador de pacotes)
- MySQL/TiDB (ou Docker para ambiente de desenvolvimento)

### 1. Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd nft-farm-game
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example` (se existir) ou com as seguintes variáveis:

```env
DATABASE_URL="mysql://user:password@host:port/database"
# Outras variáveis de ambiente necessárias para Web3 Auth, etc.
```

### 3. Instalar Dependências

```bash
pnpm install
```

### 4. Configurar Banco de Dados

Execute as migrações para criar as tabelas:

```bash
pnpm run db:migrate
```

Popule o banco de dados com dados iniciais (opcional, mas recomendado para testes):

```bash
node server/seed-crops.mjs # Seed de cultivos
node server/seed-recipes.mjs # Seed de receitas de crafting
```

### 5. Iniciar o Servidor de Desenvolvimento

```bash
pnpm run dev
```

O frontend estará disponível em `http://localhost:5173` e o backend em `http://localhost:3000`.

## Testes

Para executar os testes unitários e de integração:

```bash
pnpm test
```

## Contribuição

Contribuições são bem-vindas! Siga o padrão de código existente e abra Pull Requests para novas funcionalidades ou correções.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## Contato

Para dúvidas ou suporte, entre em contato com a equipe de desenvolvimento.

---

**Autor:** Manus AI
**Última Atualização:** 25 de Fevereiro de 2026
**Versão:** 1.0.0
