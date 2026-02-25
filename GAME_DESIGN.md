# NFT Farm Game - Game Design Document

## 1. Visão Geral do Jogo

**Nome do Jogo**: Harvest Realm (ou similar)

**Conceito**: Um jogo de fazenda blockchain onde jogadores cultivam, criam e comercializam ativos digitais em um mundo persistente. Combina mecânicas clássicas de farming games (Stardew Valley, Harvest Moon) com economia Web3 e NFTs.

**Público-Alvo**: Jogadores casuais interessados em GameFi, colecionadores de NFTs, traders de criptomoedas, fãs de farming games.

**Plataforma**: Web (React), com suporte a múltiplas redes blockchain (Polygon, Ethereum, Arbitrum).

## 2. Mecânicas Principais

### 2.1 Sistema de Farming (Idle Game)
Jogadores possuem uma terra (NFT ERC-721) onde podem plantar cultivos (NFT ERC-1155) que crescem ao longo do tempo. Cada cultivo tem:

- **Tempo de Crescimento**: Varia de 5 minutos a 1 dia e meio (máximo)
- **Rendimento**: Quantidade de recursos colhidos (com variação por sorte)
- **Requisitos**: Solo, água, fertilizante (com chance de falha)
- **Rarity**: Comum, Incomum, Raro, Épico, Lendário
- **Elementos de Risco**: Pragas, clima adverso, eventos aleatórios que podem afetar colheita

Cultivos podem ser plantados em grid expansível (começando 10x10), com possibilidade de expandir a terra. Cada jogador joga em seu próprio "mundo" privado, mas todos compartilham um servidor global com mapa de facções.

### 2.2 Inventário
Jogadores gerenciam recursos em inventário com limite de capacidade. Tipos de recursos:

- **Cultivos**: Trigo, Milho, Batata, Cenoura, etc.
- **Recursos Brutos**: Madeira, Pedra, Minério
- **Ferramentas**: Enxada, Machado, Picareta (NFTs com durabilidade)
- **Sementes**: Sementes de diferentes cultivos
- **Itens Especiais**: Fertilizantes, Pesticidas, Poções

### 2.3 Crafting
Jogadores combinam recursos para criar itens novos. Exemplos:

- **Sementes Raras**: Trigo + Pó de Ouro → Sementes de Trigo Dourado
- **Ferramentas Melhoradas**: Enxada + Cristal de Ouro → Enxada Dourada
- **Poções**: Erva + Água → Poção de Crescimento (+50% rendimento)
- **Proteção**: Pesticida → Reduz chance de pragas

Cada receita tem custo em recursos e tempo de crafting. Algumas receitas são descobertas através de exploração ou missões.

### 2.4 Marketplace
Jogadores compram e vendem itens, cultivos e ferramentas. Características:

- **Listagem de Itens**: Preço em HARVEST (token utilitário) ou FARM (governança)
- **Ofertas**: Sistema de negociação direta entre jogadores
- **Histórico**: Rastreamento de preços e transações
- **Taxas**: 5% de taxa em cada venda (queimada ou para tesouro)

### 2.5 Missões, Objetivos e Facções
Engajamento contínuo através de:

- **Missões Diárias**: "Colha 100 unidades de trigo", "Venda 5 itens"
- **Objetivos Semanais**: Desafios maiores com recompensas melhores
- **Conquistas**: Marcos permanentes (Colecionador, Agricultor, Trader)
- **Recompensas**: HARVEST, FARM, NFTs especiais
- **Sistema de Facções**: Jogadores escolhem uma facção (ex: Cultivadores, Comerciantes, Alquimistas) que oferece bônus e competição no mapa global

### 2.6 Mapa Interativo
Visualização em tempo real da fazenda com:

- **Grid 10x10**: Posicionamento de cultivos
- **Estruturas**: Casa, Armazém, Mercado (futuros)
- **Decorações**: Árvores, flores, cercas
- **Zoom/Pan**: Navegação fluida
- **Drag-and-Drop**: Reposicionamento de itens

## 3. Economia de Tokens e Monetização

### 3.1 Token Utilitário: HARVEST
- **Símbolo**: HARVEST
- **Uso**: Compra de itens no marketplace, pagamento de taxas, crafting, expansão de terra
- **Obtenção**: Colheita de cultivos, conclusão de missões, vendas no marketplace
- **Supply**: Inicial 1M, inflação controlada por crescimento de jogadores
- **Burning**: 5% de cada transação de marketplace + crafting
- **Modelo**: Free-to-play - jogadores podem ganhar HARVEST jogando

### 3.2 Token de Governança: FARM
- **Símbolo**: FARM
- **Uso**: Votação em propostas, staking para recompensas, acesso a conteúdo exclusivo
- **Obtenção**: Staking de HARVEST, recompensas de ranking, eventos especiais
- **Supply**: Inicial 100k, distribuição limitada
- **Mecanismo**: Não inflacionário, apenas distribuição

### 3.3 Monetização (Não Pay-to-Win)
- **NFT de Terra (LAND)**: Taxa de Mint para criar nova terra (10-50 FARM)
- **NFTs de Cosmética**: Skins, decorações, temas (5-50 FARM ou HARVEST)
- **NFTs de Utilidade**: Buffs temporários, ferramentas especiais (10-100 FARM)
- **Battle Pass**: Acesso a missões premium e recompensas exclusivas (10 HARVEST/mês)
- **Modelo**: Quem investe mais terá mais vantagens (como em qualquer mercado), mas não é impossível progredir sem gastar

### 3.3 Balanceamento Econômico

| Aspecto | Mecanismo |
|---------|----------|
| Inflação de HARVEST | Burning de 5% em transações, crafting consome recursos, expansão de terra |
| Valor de FARM | Staking de HARVEST, votação em governança, mint de terras |
| Sustentabilidade | Novo conteúdo regularmente, expansão de ecossistema, facções |
| Sink de Tokens | Marketplace taxes, crafting costs, expansão, NFTs de utilidade |
| Elementos de Risco | Pragas, clima, eventos aleatórios afetam colheita |

## 4. Estrutura de NFTs

### 4.1 Terras (ERC-721)
- **Atributos**: Tamanho (10x10), Fertilidade, Clima
- **Rarity**: Comum (70%), Incomum (20%), Raro (7%), Épico (2%), Lendário (1%)
- **Preço Inicial**: 10 FARM
- **Limite**: Cada jogador começa com 1 terra gratuita

### 4.2 Cultivos (ERC-1155)
- **Tipos**: Trigo, Milho, Batata, Cenoura, Tomate, Melancia
- **Rarity**: Comum, Incomum, Raro, Épico, Lendário
- **Atributos**: Tempo de crescimento, rendimento, requisitos
- **Dinâmica**: Metadata muda conforme cultivo cresce

### 4.3 Ferramentas (ERC-1155)
- **Tipos**: Enxada, Machado, Picareta, Regador
- **Durabilidade**: 100 usos antes de quebrar
- **Melhorias**: Ferramentas raras têm mais durabilidade
- **Reparação**: Crafting com recursos específicos

### 4.4 Personagens (ERC-721) - Futuro
- **Função**: Bônus de produção, habilidades especiais
- **Atributos**: Força, Inteligência, Sorte
- **Evolução**: Ganham experiência com uso

## 5. Progressão do Jogador

### 5.1 Níveis e Escalabilidade
- **Nível 1-10**: Tutorial, aprendizado de mecânicas
- **Nível 11-50**: Desbloqueio de cultivos raros e crafting
- **Nível 50-100**: Especialização por facção
- **Nível 100+**: Conteúdo avançado e endgame
- **Escalabilidade**: Sistema preparado para crescimento indefinido de níveis
- **Modelo Idle**: Cada jogador joga em seu próprio mundo privado
- **Servidor Global**: Todos os jogadores compartilham um mapa de facções
- **Não há PvP/PvE direto**: Competição ocorre através de ranking e eventos de facção

### 5.2 Conquistas e Facções
- **Colecionador**: Possuir 1 de cada cultivo
- **Agricultor**: Colher 10.000 unidades totais
- **Trader**: Realizar 100 transações
- **Milionário**: Acumular 1M HARVEST
- **Lendário**: Possuir NFT Lendário

### 5.3 Sistema de Facções
**Facções Disponíveis**:
- **Cultivadores**: Bônus de +10% rendimento de cultivos, desafios de colheita
- **Comerciantes**: Bônus de -5% taxa de marketplace, desafios de venda
- **Alquimistas**: Bônus de +20% velocidade de crafting, desafios de criação
- **Exploradores**: Bônus de +15% chance de itens raros, desafios de descoberta

**Mapa Global**:
- Cada facção tem uma região no mapa
- Ranking de facções baseado em contribuição de membros
- Eventos sazonais com competição entre facções
- Recompensas coletivas para facções vencedoras

## 6. Fluxo de Jogo - Primeiro Dia

1. **Onboarding**: Jogador conecta carteira (MetaMask/WalletConnect via Base)
2. **Escolha de Facção**: Seleciona uma facção que melhor se alinha com seu estilo
3. **Tutorial**: Recebe terra gratuita (NFT ERC-721), sementes iniciais
4. **Primeira Ação**: Planta trigo na terra em grid 10x10
5. **Espera**: Timer de 5-30 minutos para colheita (varia por tipo de cultivo)
6. **Elemento de Sorte**: Chance de praga ou clima adverso afeta rendimento (5-15% de variação)
7. **Colheita**: Recebe 8-12 unidades de trigo (variável por sorte)
8. **Marketplace Global**: Vê preço de trigo e ofertas de outros jogadores
9. **Venda**: Vende trigo por HARVEST tokens
10. **Missão Diária**: Completa "Colha seu primeiro cultivo"
11. **Recompensa**: Recebe 5 HARVEST + 1 semente rara
12. **Mapa Global**: Vê posição de sua facção no mapa e ranking

## 7. Modelo Econômico Sustentável

### 7.1 Receitas
- **Mint de Terra (LAND)**: Taxa de 10-50 FARM por nova terra
- **NFTs de Cosmética**: Skins, decorações (5-50 FARM)
- **NFTs de Utilidade**: Buffs, ferramentas especiais (10-100 FARM)
- **Battle Pass**: Acesso a missões premium (10 HARVEST/mês)
- **Marketplace Fees**: 5% de cada transação (burning + tesouro)

### 7.2 Distribuição de Receitas
- 40%: Desenvolvimento e operação
- 30%: Tesouro do jogo (buyback, burning, estabilidade)
- 20%: Comunidade (eventos, recompensas, facções)
- 10%: Equipe

### 7.3 Vantagens de Investimento (Não Pay-to-Win)
- Quem investe mais FARM/HARVEST terá mais terras e itens
- Mas progressão é possível sem investimento (free-to-play)
- Economia de mercado real: quem investe cedo pode lucrar com apreciação

## 8. Roadmap

### Fase 1 (Mês 1-2): MVP
- Sistema de farming com timers curtos (5 min - 1.5 dias)
- Inventário com limite de capacidade
- Marketplace com economia dual-token
- Autenticação Web3 (Base network)
- Sistema de facções básico

### Fase 2 (Mês 3-4): Expansão
- Crafting com descoberta de receitas
- Missões diárias e semanais
- Mapa global interativo com facções
- Elementos de sorte e risco (pragas, clima)
- Leaderboards por facção

### Fase 3 (Mês 5-6): Conteúdo
- NFTs de cosmética e utilidade
- Novos cultivos e ferramentas
- Eventos sazonais
- Sistema de guildas (comunidades)
- Expansão de terra

### Fase 4 (Mês 7+): Ecossistema
- Suporte a múltiplas redes (Polygon + Base)
- Novos tipos de conteúdo (animais, pesca, mineração)
- Integração com outras aplicações
- Economia de longo prazo estabilizada

## 9. Considerações de Design

### 9.1 Balanceamento
- Nenhum jogador deve poder "vencer" rapidamente
- Progressão consistente mesmo sem gastar (free-to-play)
- Recompensas justas para tempo investido
- Quem investe mais tem vantagens, mas não impossibilita outros

### 9.2 Retenção (Idle Game)
- Missões diárias para login
- Timers curtos (5 min - 1.5 dias) que encorajam check-ins frequentes
- Elementos de sorte/risco que mantêm interesse
- Competição de facções no mapa global
- Comunidade ativa por facção

### 9.3 Sustentabilidade Econômica
- Economia monitorada constantemente
- Ajustes de inflação quando necessário
- Novos sinks de tokens regularmente
- Feedback da comunidade
- Ecossistema preparado para crescimento de longo prazo
- Cada jogador em seu próprio mundo, mas conectado ao servidor global

## 10. Especificações Técnicas

### 10.1 Rede Blockchain
- **Rede Primária**: Base (começar aqui)
- **Rede Secundária**: Polygon (adicionar na Fase 4)
- **Carteiras Suportadas**: MetaMask, WalletConnect
- **Padrão de NFTs**: ERC-721 (terras), ERC-1155 (itens, cultivos, ferramentas)
- **Padrão de Tokens**: ERC-20 (HARVEST, FARM)

### 10.2 Público-Alvo
- **Fase 1**: Brasil (MVP)
- **Fase 2**: Brasil + América Latina
- **Fase 3+**: Global
- **Foco**: Jogadores casuais, colecionadores de NFT, traders, fãs de idle games

## 11. Próximas Etapas

1. Criar design visual (paleta de cores, tipografia, conceito art)
2. Criar wireframes de UI/UX
3. Estruturar banco de dados
4. Implementar autenticação Web3 (Base)
5. Iniciar desenvolvimento de frontend
