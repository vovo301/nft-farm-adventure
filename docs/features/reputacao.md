# Reputação (níveis de confiança anti-bot)

> Status: **especificada** (decisão do usuário, 2026-11-22). Números de pontos e permissões vêm do
> usuário; tarefas adaptadas do exemplo enviado (estrutura apenas; nomes nossos).

## Objetivo

Dificultar bots e multicontas: ações que **movem valor** (vender, ofertar, leiloar, sacar token/NFT)
só são liberadas conforme o jogador acumula **pontos de reputação**, que exigem progresso real,
verificação de identidade e tempo de jogo. A reputação é um **status** visível do jogador.

## Níveis

| Nível | Pontos | Libera |
|---|---|---|
| (sem nível) | 0–249 | jogar normalmente; **sem vendas** no marketplace |
| **Fazendeiro Mirim** | 250 | 2 vendas por dia · fazenda on-chain (NFT da fazenda) |
| **Fazendeiro Iniciante** | 400 | 3 vendas por dia · acesso ao leilão |
| **Fazendeiro Agricultor** | 600 | fazer e aceitar ofertas · vendas ilimitadas · tarefas que pagam token |
| **Fazendeiro Grande-Agricultor** | 1000 | sacar token · sacar NFT · pets · mascote · colecionáveis |

Os níveis são cumulativos (cada nível mantém o que os anteriores liberam).

## Tarefas que dão pontos (v1)

| Tarefa | Pontos |
|---|---|
| Chegar ao Bosque da Brisa (ilha 2) | 100 |
| Chegar ao nível 15 | 50 |
| Chegar à Mesa Ocre (ilha 3) | 50 |
| Chegar ao Pico Brasa (ilha 4) | 50 |
| Conectar e verificar conta do Discord | 50 |
| Completar prova de humanidade | 100 |
| Chegar ao nível 100 | 150 |
| Ter um mascote | 300 |
| Passe VIP ativo | 600 |
| **Total possível** | **1 500** |

Cada tarefa conta uma vez. O servidor é a autoridade (regra 2): pontos são derivados do estado e de
verificações externas, nunca enviados pelo cliente.

## Regras

- Limites de vendas por dia contam no fuso UTC do servidor; tentativa acima do limite é recusada com
  erro tipado (`sales_limit_reached`).
- Saque de token/NFT exige Grande-Agricultor **e** as demais checagens de saque (assinatura do
  servidor, limites por dia).
- Verificações externas (Discord, prova de humanidade) ficam vinculadas a **uma** conta; reutilizar
  o mesmo Discord/prova em outra conta não pontua (anti-multiconta).
- Perda de reputação: se um requisito deixar de valer (ex.: VIP expirou), os pontos dele saem e o
  nível é recalculado. [PERGUNTA ao usuário]

## Perguntas abertas

1. Os pontos do VIP (600) caem quando o passe expira?
2. Qual provedor de prova de humanidade? (afeta custo e privacidade/LGPD)
3. Nome do mascote do jogo (no lugar do termo da referência).
4. Mais tarefas futuras (ex.: idade da conta, temporadas completadas) para reduzir o peso do VIP?

## Riscos

- **VIP comprável com Diamantes vale 600 pontos**: sozinho leva o jogador de 0 a Agricultor
  (vendas ilimitadas, tarefas com token). Somado a Discord e prova de humanidade (150), chega a
  750; um bot que compre VIP precisa ainda de progresso de jogo para chegar a 1000 (saques).
- Prova de humanidade e Discord são as barreiras mais fortes contra multicontas; sem elas, o
  sistema depende só de progresso e pagamento.
