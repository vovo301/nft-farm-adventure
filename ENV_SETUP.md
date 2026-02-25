# Configuração de Variáveis de Ambiente - Harvest Realm

## 1. Variáveis Obrigatórias (Já fornecidas pelo Manus)

Estas variáveis são injetadas automaticamente pelo sistema Manus:

```
DATABASE_URL=mysql://user:password@host/database
JWT_SECRET=seu_jwt_secret
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OWNER_OPEN_ID=seu_owner_id
OWNER_NAME=seu_nome
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=seu_forge_key
VITE_FRONTEND_FORGE_API_KEY=seu_frontend_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=seu_website_id
```

## 2. Variáveis Web3 (Necessárias para Configuração)

### 2.1 WalletConnect Project ID

Obter em: https://cloud.walletconnect.com/

```
VITE_WALLET_CONNECT_PROJECT_ID=seu_project_id
```

### 2.2 Endereços de Smart Contracts

Após fazer deploy dos contratos em Base, adicionar:

```
# Base Mainnet
VITE_HARVEST_TOKEN_ADDRESS=0x...
VITE_FARM_TOKEN_ADDRESS=0x...
VITE_FARM_LAND_ADDRESS=0x...
VITE_FARM_ITEMS_ADDRESS=0x...
VITE_MARKETPLACE_ADDRESS=0x...
VITE_CRAFTING_ADDRESS=0x...
VITE_MISSION_SYSTEM_ADDRESS=0x...
VITE_FACTION_SYSTEM_ADDRESS=0x...
VITE_GAME_ECONOMY_ADDRESS=0x...
```

### 2.3 RPCs Customizados (Opcional)

Se quiser usar RPCs customizados ao invés dos padrões:

```
VITE_BASE_MAINNET_RPC=https://mainnet.base.org
VITE_BASE_SEPOLIA_RPC=https://sepolia.base.org
```

## 3. Configuração do WalletConnect

### 3.1 Passo a Passo

1. Ir para https://cloud.walletconnect.com/
2. Criar uma conta (ou fazer login)
3. Criar novo projeto
4. Copiar o Project ID
5. Adicionar ao `.env.local` ou configurar no Manus UI

### 3.2 Configurar Domínios Permitidos

No painel do WalletConnect, adicionar os domínios:

- Desenvolvimento: `localhost:5173`
- Produção: `seu-dominio.manus.space`

## 4. Arquivo .env.local (Desenvolvimento Local)

Se estiver desenvolvendo localmente, criar arquivo `.env.local`:

```bash
# Web3
VITE_WALLET_CONNECT_PROJECT_ID=seu_project_id

# Smart Contracts (após deployment)
VITE_HARVEST_TOKEN_ADDRESS=0x...
VITE_FARM_TOKEN_ADDRESS=0x...
# ... outros endereços
```

**Nota**: Não commitar `.env.local` no git (já está em `.gitignore`)

## 5. Configuração via Manus UI

1. Ir para Settings → Secrets
2. Adicionar as variáveis Web3
3. Salvar

Ou usar o comando:

```bash
pnpm webdev_request_secrets
```

## 6. Verificação de Configuração

Para verificar se as variáveis estão corretas:

```bash
# Verificar variáveis de ambiente
node -e "console.log(process.env.VITE_WALLET_CONNECT_PROJECT_ID)"

# Verificar se Web3 está configurado
npm run dev
# Abrir console do navegador e verificar se não há erros de Web3
```

## 7. Redes Suportadas

### Base Mainnet
- Chain ID: 8453
- RPC: https://mainnet.base.org
- Explorer: https://basescan.org

### Base Sepolia (Testnet)
- Chain ID: 84532
- RPC: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org

## 8. Próximos Passos

1. ✅ Configurar WalletConnect Project ID
2. ⏳ Fazer deploy dos smart contracts em Base Sepolia
3. ⏳ Adicionar endereços dos contratos às variáveis
4. ⏳ Testar autenticação Web3
5. ⏳ Fazer deploy em Base Mainnet (produção)

## 9. Troubleshooting

### Erro: "WalletConnect Project ID não configurado"
- Verificar se `VITE_WALLET_CONNECT_PROJECT_ID` está definido
- Verificar se o Project ID é válido no WalletConnect Cloud

### Erro: "Rede incorreta"
- Verificar se a carteira está conectada a Base (Mainnet ou Sepolia)
- Usar o botão "Mudar para Base" no UI

### Erro: "Contrato não encontrado"
- Verificar se os endereços dos contratos estão corretos
- Verificar se os contratos foram deployados na rede correta

### Erro: "Assinatura inválida"
- Verificar se a mensagem de assinatura está correta
- Verificar se o nonce não expirou (TTL de 5 minutos)
- Tentar fazer login novamente

## 10. Segurança

- **Nunca** commitar chaves privadas ou secrets no git
- **Nunca** expor `BUILT_IN_FORGE_API_KEY` no frontend
- Usar `VITE_` prefix apenas para variáveis públicas
- Manter `JWT_SECRET` seguro no servidor
- Rotacionar `WALLET_CONNECT_PROJECT_ID` periodicamente

## 11. Referências

- [WalletConnect Docs](https://docs.walletconnect.com/)
- [Wagmi Docs](https://wagmi.sh/)
- [RainbowKit Docs](https://www.rainbowkit.com/)
- [Base Network Docs](https://docs.base.org/)
- [Viem Docs](https://viem.sh/)
