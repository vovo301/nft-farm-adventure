# Diamantes (moeda premium)

**Status:** especificada (escopo; origem em aberto) · **Atualizado:** 2026-11-22 · [GDD](../GDD.md)

Terceira moeda do jogo (`diamond`), ao lado do Gold (soft, off-chain) e do token de governança
(ERC-20). Decisão do usuário em `docs/ARQUITETURA.md`. Esta nota fixa **escopo e usos** para que as
specs dependentes (expansões, leilão, aceleração, VIP, restock) falem a mesma língua. **Não decide
de onde os Diamantes vêm** nem valores: isso é do usuário e do `economista-tokenomics`.

## Escopo

- Saldo inteiro por jogador, guardado no estado do servidor; débito e crédito só por reducer em
  `packages/game-core` (servidor decide). [ASSUMPTION] off-chain e não sacável no MVP (pergunta D2).
- Nunca negativo; toda operação que gasta Diamantes é atômica (valida tudo, depois debita).
- Exibido no HUD ao lado do Gold, com ícone próprio.

## Usos (cada um é dependência de uma spec)

| Uso | O que o Diamante faz | Spec |
|---|---|---|
| Expansões | custo nos blocos marcados **D** (substitui 1:1 a moeda premium da tabela do usuário) | [ilhas-e-expansoes.md](ilhas-e-expansoes.md) |
| Leilões | lance e pagamento em Diamantes | futura `leilao.md` |
| Acelerar | encurta obras (construções, talvez expansões) e cozinheiros | futuras `construcoes.md`, `cozinha.md`; expansões: pergunta 4 da spec de ilhas |
| Passe VIP | compra o passe que libera o **nível de confiança** para saque e venda no marketplace | futura `vip-confianca.md` (liga com saque e marketplace) |
| Restock | reabastece na hora o estoque limitado de ferramentas e sementes da loja | futura `loja-estoque.md` |

## Fontes possíveis (pergunta, não decisão)

- Jogando: pedidos de NPC, tarefas diárias, conquistas, marcos de ilha, recompensas de temporada.
- Comprados com o token de governança.
- Comprados com dinheiro (loja in-app / cartão).
- Recebidos de outros jogadores (troca/marketplace) ou só ganhos pela própria conta.

## Riscos (sem decidir)

- **Pay-to-win.** A partir de `breezewood_03` quase todo bloco custa Diamantes; se a única fonte
  for compra, a progressão passa a ter preço em dinheiro e o jogador que não paga trava na ilha 2.
  O mesmo vale para acelerar e restock em escala (vantagem direta de produção). Mitigação possível:
  fonte jogável suficiente para a curva de expansões, tetos de aceleração, restock com limite diário.
- **VIP como confiança comprada.** Se o nível de confiança para saque/venda for só comprado, o
  passe deixa de filtrar bots e multicontas (um bot com orçamento compra). Combinar com idade de
  conta e nível é uma opção.
- **Regulação, se Diamantes puderem ser comprados com dinheiro ou token:**
  - moeda virtual comprada pode ser tratada como valor armazenado/pagamento (regras de consumidor,
    reembolso, impostos por país);
  - leilões pagos com Diamantes comprados, com itens que viram NFT sacável e revendável por token,
    podem se aproximar de jogo de azar ou de um mercado financeiro;
  - Diamantes comprados com o token de governança criam ponte dinheiro ↔ progresso e podem pesar
    na classificação do token (valor ligado ao esforço da equipe);
  - restrições de lojas de app sobre compras in-app e cripto.
  Precisa de análise jurídica externa antes de qualquer venda real; até lá só testnet (regra 5).
- **Inflação de Diamantes** se a fonte jogável for generosa: os sinks (expansões, VIP, leilão)
  precisam fechar no simulador do economista.

## Estados e erros

| Erro (rejeição do reducer) | Mensagem (i18n) |
|---|---|
| `insufficient_diamond` | "Faltam N Diamantes." (+ atalho "como conseguir", conforme a origem) |
| `diamond_use_capped` | "Limite de uso atingido por hoje." (aceleração/restock, se houver teto) |

## UI necessária

- Contador no HUD; painel "como conseguir Diamantes" (conteúdo depende da origem).
- Confirmação antes de todo gasto (mostra saldo antes/depois).

## Assets necessários (estilo C)

- Ícone `diamond` (HUD, placa de expansão, loja), tamanho pequeno e grande.
- Selo do passe VIP (perfil e marketplace).

## Números necessários (pedido ao `economista-tokenomics`)

- Coluna `cost_diamond` em `expansions.csv` (valores da tabela do usuário) e total por ilha.
- Depois da origem decidida: renda de Diamantes por dia (casual, ativo, bot), preço do VIP, custo de
  aceleração e restock, tetos diários.

## Critérios de aceite

- [ ] Saldo de Diamantes nunca fica negativo; gasto sem saldo é rejeitado sem alterar o estado.
- [ ] Toda ação que gasta Diamantes debita exatamente o valor dos dados gerados do CSV.
- [ ] Cliente e servidor produzem o mesmo saldo para a mesma sequência de ações.

## Perguntas abertas para o usuário

- **D1. Origem:** (a) só ganhos jogando (recomendado para MVP/testnet); (b) ganhos + comprados com
  token; (c) ganhos + comprados com dinheiro; (d) só comprados.
- **D2. Natureza:** (a) off-chain, não sacável, não transferível (recomendado); (b) transferível
  entre jogadores; (c) on-chain/sacável.
- **D3. Expansões:** (a) Diamantes obrigatórios nos blocos D, com fonte jogável dimensionada para a
  curva (recomendado se D1 = a); (b) Diamantes **ou** alternativa jogável (ex.: frutas, como na
  conversão antiga); (c) obrigatórios mesmo se só comprados.
- **D4. Passe VIP:** (a) por tempo (ex.: mensal) e somado a idade de conta + nível para liberar
  saque/venda (recomendado); (b) permanente; (c) único requisito de confiança.
- **D5. Leilão:** (a) o jogo leiloa itens raros (sink de Diamantes, recomendado); (b) jogadores
  leiloam entre si; (c) ambos.
- **D6. Restock:** o estoque de ferramentas e sementes é limitado por período e Diamantes só
  antecipam a reposição (recomendado), ou Diamantes compram estoque extra sem limite?

## Histórico

- 2026-11-22: criada (escopo, usos, fontes como pergunta, riscos).
