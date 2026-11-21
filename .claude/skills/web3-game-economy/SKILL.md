---
name: web3-game-economy
description: >
  Desenho e balanceamento da economia de um jogo de fazenda Web3: moedas (soft, premium, token),
  sources e sinks, curvas de custo, timers, limites anti-bot e simulação em planilha/script antes do
  código. Use para preços, recompensas, tempos de crescimento, boosts, airdrops, tokenomics ou
  "a economia está inflacionando".
---

# Economia de jogo Web3

Economias play-to-earn quebram quando a única razão de jogar é sacar. O objetivo é um jogo
divertido onde o token é **consequência**, com mais sinks que sources a longo prazo.

## Camadas de moeda (padrão)

| Camada | Exemplo | On-chain? | Regra |
|---|---|---|---|
| Soft | moedas | não | ganha jogando, gasta em sementes/ferramentas; inflação controlada por sinks |
| Premium | gemas | não | compra com dinheiro; acelera tempo; nunca sacável |
| Token | (opcional) | sim | sacável; emissão com teto; só para atividades sociais/raras |
| Itens | NFTs | opcional | escassez real (supply fixo ou data de corte) |

## Processo

1. **Planilha única** `economy/economy.csv` (ou `.xlsx`): item, custo, tempo, rendimento,
   fonte/sumidouro, nível de desbloqueio. O código de `packages/game-core/src/data/` é gerado
   dela por script — nunca editado à mão.
2. **Simule antes de codar**: script que roda jogadores-tipo (casual 2×/dia, ativo 8×/dia, bot
   24/7) por 90 dias e plota moedas, itens e emissão de token. Se o bot ganha > 3× o ativo, há
   problema.
3. **Fórmulas base** (adaptadas de jogos idle):
   - Preço do próximo nível: `floor(base * g^nivel)`, `g` 1.07–1.15 para upgrades frequentes,
     1.5–3 para raros.
   - Lucro por hora de uma cultura: `(venda*rendimento - semente) / horas`. Culturas mais longas
     devem render mais por hora, mas não mais por *sessão*, senão ninguém planta as curtas.
   - Expansão de terreno: custo crescente + requisito de nível (gate de progresso).
4. **Sinks obrigatórios**: ferramentas consumíveis, taxas de marketplace, crafting que destrói
   insumos, cosméticos, expansões, eventos sazonais com itens que expiram.
5. **Anti-bot**: limites diários por recurso, diminishing returns, ações que exigem input
   variado, verificação humana antes de saque, reputação/idade de conta para sacar.
6. **Registre toda decisão** em `docs/economia/decisoes.md` com data e motivo. Placeholder não
   vira número oficial sem registro.

## Sinais de alarme

- Preço do token caindo com aumento de jogadores → emissão > sinks.
- Itens "obrigatórios" pagos → pay-to-win, retenção cai.
- Recompensa fixa por login → farms de contas.
