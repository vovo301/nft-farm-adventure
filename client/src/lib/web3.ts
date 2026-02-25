import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'viem/chains';

/**
 * Configuração Web3 para Harvest Realm
 * Suporta Base Mainnet e Base Sepolia (testnet)
 */

const projectId = process.env.VITE_WALLET_CONNECT_PROJECT_ID || 'default-project-id';

export const wagmiConfig = getDefaultConfig({
  appName: 'Harvest Realm',
  projectId,
  chains: [
    base,        // Base Mainnet (produção)
    baseSepolia, // Base Sepolia (testnet)
  ],
  ssr: false,
});

/**
 * Constantes de Rede
 */
export const NETWORKS = {
  BASE_MAINNET: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
  BASE_SEPOLIA: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
} as const;

/**
 * Obter rede atual baseado no ambiente
 */
export function getCurrentNetwork() {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? NETWORKS.BASE_MAINNET : NETWORKS.BASE_SEPOLIA;
}

/**
 * Constantes de Smart Contracts
 * Será preenchido após deployment
 */
export const CONTRACT_ADDRESSES = {
  HARVEST_TOKEN: process.env.VITE_HARVEST_TOKEN_ADDRESS || '',
  FARM_TOKEN: process.env.VITE_FARM_TOKEN_ADDRESS || '',
  FARM_LAND: process.env.VITE_FARM_LAND_ADDRESS || '',
  FARM_ITEMS: process.env.VITE_FARM_ITEMS_ADDRESS || '',
  MARKETPLACE: process.env.VITE_MARKETPLACE_ADDRESS || '',
  CRAFTING: process.env.VITE_CRAFTING_ADDRESS || '',
  MISSION_SYSTEM: process.env.VITE_MISSION_SYSTEM_ADDRESS || '',
  FACTION_SYSTEM: process.env.VITE_FACTION_SYSTEM_ADDRESS || '',
  GAME_ECONOMY: process.env.VITE_GAME_ECONOMY_ADDRESS || '',
} as const;

/**
 * Validar se endereço é válido
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Formatar endereço para exibição (0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (!isValidAddress(address)) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Converter wei para unidades legíveis
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === BigInt(0)) {
    return whole.toString();
  }
  
  const fractional = remainder.toString().padStart(decimals, '0');
  const trimmed = fractional.replace(/0+$/, '');
  
  return `${whole}.${trimmed}`;
}

/**
 * Converter unidades legíveis para wei
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [whole, fractional = ''] = amount.split('.');
  const paddedFractional = fractional.padEnd(decimals, '0');
  const combined = whole + paddedFractional;
  return BigInt(combined); // eslint-disable-line no-undef
}

/**
 * Tipos de Erro Web3
 */
export enum Web3ErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WRONG_NETWORK = 'WRONG_NETWORK',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  USER_REJECTED = 'USER_REJECTED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Mapear erro de contrato para tipo
 */
export function mapContractError(error: any): Web3ErrorType {
  const message = error?.message?.toLowerCase() || '';
  
  if (message.includes('user rejected')) {
    return Web3ErrorType.USER_REJECTED;
  }
  if (message.includes('insufficient')) {
    return Web3ErrorType.INSUFFICIENT_BALANCE;
  }
  if (message.includes('network')) {
    return Web3ErrorType.WRONG_NETWORK;
  }
  if (message.includes('failed') || message.includes('reverted')) {
    return Web3ErrorType.TRANSACTION_FAILED;
  }
  
  return Web3ErrorType.UNKNOWN;
}
