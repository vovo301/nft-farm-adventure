# UI Wireframes - Harvest Realm

## 1. Estrutura Geral da Aplicação

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER / NAVBAR                       │
│  Logo | Menu | Wallet | Notifications | User Profile    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  SIDEBAR (Desktop)    │        MAIN CONTENT              │
│  - Dashboard          │                                   │
│  - Farm               │                                   │
│  - Inventory          │                                   │
│  - Marketplace        │                                   │
│  - Crafting           │                                   │
│  - Missions           │                                   │
│  - Map                │                                   │
│  - Faction            │                                   │
│  - Settings           │                                   │
│                       │                                   │
├─────────────────────────────────────────────────────────┤
│                    FOOTER / STATUS BAR                    │
│  Tokens | Status | Help                                  │
└─────────────────────────────────────────────────────────┘
```

## 2. Páginas Principais

### 2.1 Landing Page / Onboarding

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│          HARVEST REALM - Idle Farming Game              │
│                                                           │
│          [Conectar Carteira] [Saiba Mais]               │
│                                                           │
│  ┌─────────────┬─────────────┬─────────────┐            │
│  │   Cultive   │  Comercie   │   Crie      │            │
│  │   Recursos  │   NFTs      │   Itens     │            │
│  └─────────────┴─────────────┴─────────────┘            │
│                                                           │
│  ┌─────────────────────────────────────┐                │
│  │  Escolha sua Facção                 │                │
│  │  [ Cultivadores ] [ Comerciantes ]  │                │
│  │  [ Alquimistas ]  [ Exploradores ]  │                │
│  └─────────────────────────────────────┘                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Dashboard / Home

```
┌─────────────────────────────────────────────────────────┐
│  Bem-vindo, [Player Name]!                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ HARVEST Tokens   │  │ FARM Tokens      │             │
│  │ 1,234 HARVEST    │  │ 45 FARM          │             │
│  │ ▲ +12 (hoje)     │  │ ▲ +2 (hoje)      │             │
│  └──────────────────┘  └──────────────────┘             │
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ Nível: 25        │  │ Facção: Cultiv.  │             │
│  │ XP: 2,450/5,000  │  │ Ranking: #1,234  │             │
│  │ ████████░░░░░░░░ │  │ Contribuição: 45 │             │
│  └──────────────────┘  └──────────────────┘             │
│                                                           │
│  ┌────────────────────────────────────────┐             │
│  │ Missões de Hoje (3/5 completadas)      │             │
│  │ ✓ Colha 50 unidades de trigo           │             │
│  │ ✓ Venda 3 itens no marketplace         │             │
│  │ ○ Faça 1 crafting                      │             │
│  │ ○ Ganhe 100 HARVEST                    │             │
│  │ ○ Descubra 1 nova receita              │             │
│  └────────────────────────────────────────┘             │
│                                                           │
│  ┌────────────────────────────────────────┐             │
│  │ Atividades Recentes                    │             │
│  │ • Colheu 12x Trigo (há 5 min)         │             │
│  │ • Vendeu Trigo por 120 HARVEST (1h)   │             │
│  │ • Iniciou Crafting (em progresso)     │             │
│  └────────────────────────────────────────┘             │
│                                                           │
│  [Ir para Farm] [Marketplace] [Missões]                 │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Farm / Mapa Interativo

```
┌─────────────────────────────────────────────────────────┐
│  Minha Fazenda - Terra #1234 (Fertilidade: 85%)        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [🔍-] [🔍+] [↑↓←→] [Grid] [Expandir]                   │
│                                                           │
│  ┌────────────────────────────────────────┐             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  │ 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾 🌾           │             │
│  └────────────────────────────────────────┘             │
│                                                           │
│  Selecionado: Trigo (Colheita em 15 min)               │
│  ┌────────────────────────────────────────┐             │
│  │ Trigo Comum                            │             │
│  │ Tempo: ████████░░░░░░░░ 15 min        │             │
│  │ Rendimento: 10-12 unidades            │             │
│  │ Status: Crescendo (Saudável)          │             │
│  │ [Colher Agora] [Remover]              │             │
│  └────────────────────────────────────────┘             │
│                                                           │
│  [Plantar Novo] [Inventário] [Voltar]                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.4 Inventário

```
┌─────────────────────────────────────────────────────────┐
│  Inventário (45/100 slots)                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Filtro: [Todos] [Cultivos] [Ferramentas] [Itens]      │
│                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Trigo    │ Milho    │ Batata   │ Cenoura  │          │
│  │ ×45      │ ×32      │ ×18      │ ×12      │          │
│  │ Comum    │ Comum    │ Incomum  │ Comum    │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Enxada   │ Machado  │ Picareta │ Regador  │          │
│  │ ×1       │ ×1       │ ×1       │ ×2       │          │
│  │ Raro     │ Comum    │ Incomum  │ Comum    │          │
│  │ 45/100   │ 95/100   │ 78/100   │ 100/100  │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Fertil.  │ Pestic.  │ Poção    │ Semente  │          │
│  │ ×5       │ ×3       │ ×1       │ ×2       │          │
│  │ Comum    │ Comum    │ Raro     │ Raro     │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                           │
│  Selecionado: Trigo (×45)                               │
│  Preço no Marketplace: 1 HARVEST cada                   │
│  [Vender] [Usar] [Descartar]                            │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Marketplace

```
┌─────────────────────────────────────────────────────────┐
│  Marketplace Global                                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Buscar: [_____________] Filtro: [Todos ▼] Ordenar: [▼]│
│                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Trigo    │ Milho    │ Batata   │ Cenoura  │          │
│  │ 1.05 H   │ 1.20 H   │ 0.95 H   │ 0.88 H   │          │
│  │ ↑ 5%     │ ↑ 8%     │ ↓ 2%     │ ↓ 1%     │          │
│  │ 234 à v. │ 156 à v. │ 89 à v.  │ 45 à v.  │          │
│  │ [Comprar]│ [Comprar]│ [Comprar]│ [Comprar]│          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Enxada   │ Machado  │ Picareta │ Regador  │          │
│  │ 50 FARM  │ 45 FARM  │ 60 FARM  │ 30 FARM  │          │
│  │ ↑ 12%    │ ↑ 3%     │ ↓ 5%     │ ↑ 2%     │          │
│  │ 12 à v.  │ 8 à v.   │ 5 à v.   │ 23 à v.  │          │
│  │ [Comprar]│ [Comprar]│ [Comprar]│ [Comprar]│          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                           │
│  [Meus Itens] [Histórico] [Ofertas Recebidas]           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.6 Crafting

```
┌─────────────────────────────────────────────────────────┐
│  Sistema de Crafting                                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Receitas Disponíveis: 45/120                            │
│                                                           │
│  ┌──────────────────────────────────────┐               │
│  │ Sementes de Trigo Dourado            │               │
│  │ ┌─────────────────────────────────┐  │               │
│  │ │ Ingredientes:                   │  │               │
│  │ │ • Trigo ×5 (✓ 45 disponível)   │  │               │
│  │ │ • Pó de Ouro ×1 (✗ 0 disponível)│ │               │
│  │ │                                 │  │               │
│  │ │ Custo: 50 HARVEST              │  │               │
│  │ │ Tempo: 2 horas                 │  │               │
│  │ │ Resultado: Sementes Raras ×3   │  │               │
│  │ │                                 │  │               │
│  │ │ [Craftar] [Detalhes]           │  │               │
│  │ └─────────────────────────────────┘  │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  ┌──────────────────────────────────────┐               │
│  │ Enxada Dourada                       │               │
│  │ ┌─────────────────────────────────┐  │               │
│  │ │ Ingredientes:                   │  │               │
│  │ │ • Enxada ×1 (✓ 1 disponível)   │  │               │
│  │ │ • Cristal de Ouro ×1 (✓ 2)     │  │               │
│  │ │                                 │  │               │
│  │ │ Custo: 100 HARVEST             │  │               │
│  │ │ Tempo: 4 horas                 │  │               │
│  │ │ Resultado: Enxada Rara ×1      │  │               │
│  │ │                                 │  │               │
│  │ │ [Craftar] [Detalhes]           │  │               │
│  │ └─────────────────────────────────┘  │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  Craftings em Progresso: 1                              │
│  ┌──────────────────────────────────────┐               │
│  │ Poção de Crescimento                 │               │
│  │ Pronto em: 45 minutos                │               │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░░░░░│               │
│  │ [Cancelar (reembolsa 50%)]           │               │
│  └──────────────────────────────────────┘               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.7 Missões

```
┌─────────────────────────────────────────────────────────┐
│  Missões e Objetivos                                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Filtro: [Todas] [Diárias] [Semanais] [Completadas]    │
│                                                           │
│  MISSÕES DIÁRIAS (3/5 completadas)                      │
│  ┌──────────────────────────────────────┐               │
│  │ ✓ Colha 50 unidades de trigo         │               │
│  │   Progresso: 50/50 ████████████████  │               │
│  │   Recompensa: 10 HARVEST + 1 FARM    │               │
│  │   [Reclamar]                         │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  ┌──────────────────────────────────────┐               │
│  │ ✓ Venda 3 itens no marketplace       │               │
│  │   Progresso: 3/3 ████████████████    │               │
│  │   Recompensa: 15 HARVEST             │               │
│  │   [Reclamar]                         │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  ┌──────────────────────────────────────┐               │
│  │ ○ Faça 1 crafting                    │               │
│  │   Progresso: 0/1 ░░░░░░░░░░░░░░░░░░  │               │
│  │   Recompensa: 20 HARVEST             │               │
│  │   [Bloqueado]                        │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  MISSÕES SEMANAIS (1/3 completadas)                     │
│  ┌──────────────────────────────────────┐               │
│  │ ✓ Colha 500 unidades totais          │               │
│  │   Progresso: 500/500 ████████████████│               │
│  │   Recompensa: 100 HARVEST + 5 FARM   │               │
│  │   [Reclamar]                         │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  Tempo restante: 5 dias 12 horas                         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.8 Mapa Global de Facções

```
┌─────────────────────────────────────────────────────────┐
│  Mapa Global - Ranking de Facções                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────┐             │
│  │                                        │             │
│  │    🌾 CULTIVADORES 🌾                 │             │
│  │    Contribuição: 45,234               │             │
│  │    Membros: 1,234                     │             │
│  │    Ranking: #1                        │             │
│  │                                        │             │
│  │  💰 COMERCIANTES 💰                   │             │
│  │  Contribuição: 42,891                 │             │
│  │  Membros: 987                         │             │
│  │  Ranking: #2                          │             │
│  │                                        │             │
│  │  🧪 ALQUIMISTAS 🧪                    │             │
│  │  Contribuição: 38,456                 │             │
│  │  Membros: 756                         │             │
│  │  Ranking: #3                          │             │
│  │                                        │             │
│  │  🗺️ EXPLORADORES 🗺️                   │             │
│  │  Contribuição: 35,123                 │             │
│  │  Membros: 654                         │             │
│  │  Ranking: #4                          │             │
│  │                                        │             │
│  └────────────────────────────────────────┘             │
│                                                           │
│  Sua Facção: Cultivadores (#1)                          │
│  Sua Contribuição: 45 pontos                            │
│  Ranking Pessoal: #234 em Cultivadores                  │
│                                                           │
│  Recompensa Semanal: 1000 HARVEST (distribuído)         │
│  Próxima Atualização: em 3 dias                         │
│                                                           │
│  [Mudar Facção] [Histórico] [Voltar]                    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.9 Perfil do Jogador

```
┌─────────────────────────────────────────────────────────┐
│  Perfil - [Player Name]                                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────┐               │
│  │ [Avatar]  Player Name                │               │
│  │           Nível: 25                  │               │
│  │           Facção: Cultivadores       │               │
│  │           Membro desde: 45 dias      │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  ESTATÍSTICAS                                            │
│  ┌──────────────────────────────────────┐               │
│  │ Cultivos Colhidos: 1,234             │               │
│  │ Itens Vendidos: 456                  │               │
│  │ Craftings Completados: 89            │               │
│  │ Missões Completadas: 123             │               │
│  │ Tempo Jogado: 45 horas               │               │
│  │ Maior Colheita: 156 unidades         │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  CONQUISTAS (12/50)                                      │
│  ┌──────────────────────────────────────┐               │
│  │ ✓ Primeiro Cultivo                   │               │
│  │ ✓ Primeira Venda                     │               │
│  │ ✓ Primeiro Crafting                  │               │
│  │ ✓ 100 Cultivos Colhidos              │               │
│  │ ✓ Nível 10                           │               │
│  │ ✓ Nível 25                           │               │
│  │ ○ Nível 50 (progresso: 45%)          │               │
│  │ ○ 1000 Cultivos Colhidos (45%)       │               │
│  └──────────────────────────────────────┘               │
│                                                           │
│  [Editar Perfil] [Configurações] [Voltar]              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 3. Componentes Reutilizáveis

### 3.1 Card de Recurso

```
┌──────────────┐
│ [Ícone]      │
│ Nome         │
│ Quantidade   │
│ Rarity       │
│ Preço        │
│ [Ação]       │
└──────────────┘
```

### 3.2 Card de Missão

```
┌──────────────────────────────┐
│ ✓/○ Título da Missão         │
│ Descrição breve              │
│ Progresso: ████████░░░░░░░░  │
│ Recompensa: 10 HARVEST       │
│ [Ação]                       │
└──────────────────────────────┘
```

### 3.3 Modal de Confirmação

```
┌──────────────────────────────┐
│ Confirmar Ação               │
├──────────────────────────────┤
│ Tem certeza que deseja fazer │
│ isso? Esta ação não pode ser │
│ desfeita.                    │
│                              │
│ [Cancelar] [Confirmar]       │
└──────────────────────────────┘
```

### 3.4 Toast / Notificação

```
┌──────────────────────────────┐
│ ✓ Ação completada com sucesso│
│ Você colheu 12 unidades de   │
│ trigo e ganhou 12 HARVEST    │
└──────────────────────────────┘
```

## 4. Fluxos de Navegação

### 4.1 Fluxo de Onboarding

```
Landing Page
    ↓
Conectar Carteira
    ↓
Escolher Facção
    ↓
Receber Terra Gratuita
    ↓
Tutorial de Plantio
    ↓
Dashboard Principal
```

### 4.2 Fluxo de Plantio

```
Farm
    ↓
Selecionar Posição
    ↓
Escolher Cultivo
    ↓
Confirmar
    ↓
Cultivo Plantado
    ↓
Aguardar Crescimento
    ↓
Colher
```

### 4.3 Fluxo de Marketplace

```
Marketplace
    ↓
Buscar/Filtrar
    ↓
Selecionar Item
    ↓
Ver Detalhes
    ↓
Fazer Oferta/Comprar
    ↓
Confirmar Transação
    ↓
Receber Item
```

## 5. Estados de Carregamento

### 5.1 Skeleton Loading

```
┌──────────────┐
│ ░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░ │
└──────────────┘
```

### 5.2 Spinner

```
    ⠋
    ⠙
    ⠹
    ⠸
    ⠼
    ⠴
    ⠦
    ⠧
    ⠇
    ⠏
```

## 6. Responsividade

### 6.1 Mobile (< 640px)

- Sidebar colapsável
- Cards em 1 coluna
- Botões full-width
- Fonte reduzida 2px

### 6.2 Tablet (640px - 1024px)

- Sidebar retrátil
- Cards em 2 colunas
- Botões normais
- Fonte reduzida 1px

### 6.3 Desktop (> 1024px)

- Sidebar sempre visível
- Cards em 3-4 colunas
- Botões normais
- Fonte normal

## 7. Próximas Etapas

1. Criar protótipo interativo em Figma
2. Testar com usuários
3. Iterar baseado em feedback
4. Implementar componentes em React
5. Integrar com backend
