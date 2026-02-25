# NFT Farm Game - Project TODO

## Fase 1: Pesquisa e Análise (CONCLUÍDA)
- [x] Analisar Sunflower Land e arquitetura
- [x] Pesquisar tokenomics sustentáveis
- [x] Estudar padrões Web3 authentication
- [x] Analisar smart contracts para jogos NFT
- [x] Documentar referências e lições aprendidas

## Fase 2: Design e Conceito (COMPLETA)
- [x] Definir conceito visual e narrativa do jogo (Harvest Realm - casual farming)
- [x] Especificar economia de tokens em detalhe (dual-token HARVEST + FARM)
- [x] Definir estrutura de NFTs (terras ERC-721, itens ERC-1155)
- [x] Criar documento de game design (GAME_DESIGN.md completo)
- [x] Definir sistema de facções (4 facções com bônus únicos)
- [x] Especificar smart contracts (SMART_CONTRACTS.md com 9 contratos)
- [x] Criar design visual (paleta de cores, tipografia, conceito art)
- [x] Criar wireframes de UI/UX

## Fase 3: Arquitetura Técnica
- [x] Criar design system completo (DESIGN_SYSTEM.md)
- [x] Criar wireframes de UI/UX (UI_WIREFRAMES.md)
- [x] Definir estrutura de banco de dados (DATABASE_SCHEMA.md com 18 tabelas)
- [ ] Configurar ambiente de desenvolvimento (React + Express)
- [ ] Criar diagrama de arquitetura
- [ ] Definir fluxo de autenticação Web3 (MetaMask + WalletConnect)
- [ ] Planejar integração com Base network

## Fase 4: Autenticação Web3 e Base Network (COMPLETA)
- [x] Integrar MetaMask (via RainbowKit)
- [x] Integrar WalletConnect (via RainbowKit)
- [x] Implementar message signing para autenticação
- [x] Criar sistema de sessão blockchain
- [x] Configurar conexão com Base network (Mainnet + Sepolia)
- [x] Criar hook useWeb3Auth
- [x] Criar componente Web3Provider
- [x] Criar componente Web3LoginButton
- [x] Adicionar routers Web3 ao backend
- [x] Documentar setup de variáveis de ambiente
- [ ] Testar fluxos de login/logout em Base Sepolia

## Fase 5: Sistema de Farming com Elementos de Risco (COMPLETA)
- [x] Migrar schema de banco de dados (Drizzle) - 18 tabelas criadas
- [x] Criar modelo de dados para cultivos
- [x] Implementar timers de crescimento (5 min - 1.5 dias)
- [x] Implementar elementos de sorte/risco (pragas, clima, seca, enchente, doença)
- [x] Criar helpers de farming (plantCrop, harvestCrop, getLandCrops)
- [x] Criar routers de farming (endpoints tRPC)
- [x] Implementar cálculo de rendimento com variação
- [x] Escrever testes de farming (9 testes passando)
- [ ] Criar UI para plantar cultivos
- [ ] Criar animações de crescimento

## Fase 6: UI de Farming e Componentes Frontend (COMPLETA)
- [x] Criar componente FarmGrid (mapa 10x10 interativo)
- [x] Criar componente CropCard com detalhes de cultivo
- [x] Criar modal de plantio com seleção de tipos
- [x] Implementar animações de crescimento (Framer Motion)
- [x] Criar página de Farming com dashboard
- [x] Integrar com routers tRPC de farming
- [x] Criar seed data de 10 tipos de cultivos
- [ ] Testar responsividade mobile
- [ ] Adicionar sons/efeitos sonoros

## Fase 7: Testes de UI e Responsividade
- [ ] Testar FarmGrid em mobile
- [ ] Testar CropCard em diferentes tamanhos
- [ ] Testar PlantModal em mobile
- [ ] Verificar performance com muitos cultivos
- [ ] Testar animações em navegadores diferentes

## Fase 8: Inventário (COMPLETA)
- [x] Criar sistema de inventário (helpers completos)
- [x] Implementar UI de inventário (InventoryPanel)
- [x] Gerenciar recursos do jogador
- [x] Criar sistema de slots/limite de capacidade (100 slots)
- [x] Criar routers tRPC de inventário
- [x] Integrar com colheita de cultivos
- [x] Criar página de Inventário
- [x] Adicionar testes de inventário
- [ ] Implementar drag-and-drop de itens
- [ ] Adicionar transferência de itens entre jogadores

## Fase 9: Marketplace (COMPLETA)
- [x] Criar helpers de marketplace (listagem, compra, venda, cancel)
- [x] Implementar sistema de taxas (5% marketplace, 3% burning, 2% tesouro)
- [x] Criar routers tRPC de marketplace
- [x] Implementar UI de listagem de itens (MarketplaceListings)
- [x] Implementar sistema de compra/venda com transferência de tokens
- [x] Integrar com economia de tokens (HARVEST)
- [x] Criar histórico de transações
- [x] Criar página de Marketplace
- [x] Adicionar filtros por categoria
- [x] Implementar busca de itens

## Fase 10: Sistema de Crafting (EM PROGRESSO)
- [x] Criar helpers para lógica de crafting (backend)
- [x] Criar routers tRPC de crafting
- [x] Criar componente CraftingPanel (UI)
- [x] Criar página de Crafting
- [x] Integrar rota de crafting ao App.tsx
- [x] Adicionar menu de crafting ao sidebar
- [x] Criar testes unitários
- [x] Criar script de seed de receitas
- [x] Documentar otimizações
- [ ] Testar fluxo completo (iniciar → completar → coletar)
- [ ] Testar cancelamento e devolução de ingredientes
- [ ] Testar múltiplos jobs simultâneos
- [ ] Criar sistema de descoberta de receitas
- [ ] Adicionar bônus de facção para crafting

## Fase 10: Dashboard e Estatísticas
- [ ] Criar dashboard principal
- [ ] Implementar gráficos de progresso
- [ ] Criar sistema de conquistas
- [ ] Adicionar histórico de atividades
- [ ] Implementar ranking de jogadores

## Fase 11: Mapa Interativo
- [ ] Criar grid do mapa
- [ ] Implementar sistema de posicionamento
- [ ] Criar UI de construção
- [ ] Adicionar sistema de zoom/pan
- [ ] Implementar persistência de layout

## Fase 12: Missões e Objetivos
- [ ] Criar sistema de missões
- [ ] Implementar objetivos diários
- [ ] Criar UI de missões
- [ ] Adicionar sistema de recompensas
- [ ] Implementar tracking de progresso

## Fase 13: NFTs Dinâmicos
- [ ] Criar smart contracts de NFTs
- [ ] Implementar metadata dinâmica
- [ ] Criar sistema de atributos
- [ ] Adicionar evolução de NFTs
- [ ] Implementar rarity system

## Fase 14: Testes e Otimizações
- [ ] Escrever testes unitários (frontend + backend)
- [ ] Criar testes de integração
- [ ] Testar fluxos de blockchain em Base Sepolia
- [ ] Testar sistema de facções
- [ ] Otimizar performance
- [ ] Teste de carga (simular múltiplos jogadores)

## Fase 15: Documentação
- [x] Escrever documentação técnica (RESEARCH.md, GAME_DESIGN.md, SMART_CONTRACTS.md)
- [x] Criar design system (DESIGN_SYSTEM.md)
- [x] Criar wireframes (UI_WIREFRAMES.md)
- [x] Criar schema de banco de dados (DATABASE_SCHEMA.md)
- [ ] Criar guia de usuário
- [ ] Documentar APIs
- [ ] Escrever README completo

## Fase 16: Deploy e Lançamento
- [ ] Configurar ambiente de produção
- [ ] Deploy de smart contracts em Base Sepolia
- [ ] Testes completos em testnet
- [ ] Deploy em Base Mainnet
- [ ] Deploy da aplicação
- [ ] Configurar domínio
- [ ] Lançamento beta Brasil
- [ ] Monitoramento e ajustes
- [ ] Expansão para Polygon (Fase 4)
