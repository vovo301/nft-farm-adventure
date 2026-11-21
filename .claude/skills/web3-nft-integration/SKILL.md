---
name: web3-nft-integration
description: >
  Contratos e integração Web3 para um jogo NFT híbrido (gameplay off-chain, posse on-chain):
  ERC-721 para terrenos/fazendas, ERC-1155 para itens, ERC-20 opcional, saques assinados pelo
  servidor, carteiras com wagmi/viem, testnet primeiro. Use para contratos, mint, saque/depósito,
  conexão de carteira, marketplace ou qualquer coisa que toque chave privada ou token.
---

# Integração Web3 (jogo híbrido)

O jogo roda off-chain (rápido, sem gás). A blockchain guarda **posse**: o jogador saca um item do
jogo para a carteira (vira NFT/token) ou deposita de volta. O servidor é a ponte e é o alvo nº 1
de ataque.

## Stack padrão

- Contratos: Solidity ^0.8.x + **Foundry** (forge test, fuzz, invariantes), OpenZeppelin Contracts
  (ERC721, ERC1155, ERC20, AccessControl, Pausable, ReentrancyGuard). Versões: confirme a última
  estável no momento de instalar.
- Rede: decisão do produtor (L2 EVM barata — ex.: Base ou Polygon). **Sempre testnet primeiro**
  (Base Sepolia / Polygon Amoy); mainnet só com auditoria.
- Cliente: `viem` + `wagmi` + um kit de conexão (RainbowKit/ConnectKit) ou login social com
  carteira embutida para não-cripto.

## Contratos mínimos

| Contrato | Padrão | Para quê |
|---|---|---|
| `Farm` | ERC-721 | 1 token = 1 fazenda/conta; o save é ligado ao `tokenId` |
| `Items` | ERC-1155 | colecionáveis, wearables, decorações (ids da tabela `data/items`) |
| `Token` (opcional) | ERC-20 | moeda premium; só existe se o economista aprovar o desenho |
| `Bridge`/`Withdrawals` | custom | saque com assinatura EIP-712 do servidor |

## Fluxo de saque (o mais sensível)

1. Jogador pede saque no jogo → servidor valida saldo, **debita no estado off-chain primeiro** e
   cria registro `pending` com `nonce` único e `deadline`.
2. Servidor assina EIP-712 `{farmId, to, ids[], amounts[], nonce, deadline}` com chave em KMS/HSM
   (nunca em `.env` de produção).
3. Jogador envia a transação; o contrato checa assinatura, `nonce` não usado, `deadline`, e minta.
4. Indexador escuta o evento e marca `confirmed`; após `deadline` sem evento, estorna.

Depósito é o inverso: o contrato queima/trava e emite evento; o indexador credita após N
confirmações.

## Segurança — checklist obrigatório

- Papéis separados (`MINTER_ROLE`, `PAUSER_ROLE`, admin em multisig/timelock). `Pausable` em tudo.
- Replay: `nonce` por saque + `chainId` + endereço do contrato no domínio EIP-712.
- Limites por saque/dia por conta e global; alarme quando estourar.
- Nunca confie em valores do cliente; nunca exponha a chave de assinatura ao front.
- Testes Foundry: unitários, fuzz nos amounts, invariante "total sacado ≤ total debitado".
- Rode Slither; **auditoria externa antes de mainnet**.
- Metadados (`uri`) em IPFS/Arweave ou servidor próprio com JSON padrão OpenSea.

## Regulatório (avisar, não decidir)

Token fungível negociável e venda de NFT com promessa de retorno podem cair em regras de valores
mobiliários e criptoativos (no Brasil: CVM e Lei 14.478/2022). Antes de vender token/NFT ao
público, o produtor deve levar o desenho a um advogado. Registre isso como risco no roadmap.
