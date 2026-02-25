import { useState } from 'react';
import { useAccount, useSignMessage, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { trpc } from '@/lib/trpc';
import { getCurrentNetwork, formatAddress } from '@/lib/web3';

/**
 * Hook para autenticação Web3
 * Gerencia conexão de carteira, assinatura de mensagem e autenticação
 */

interface UseWeb3AuthReturn {
  // Estado
  isConnected: boolean;
  address: string | undefined;
  displayAddress: string;
  isLoading: boolean;
  error: string | null;
  isCorrectNetwork: boolean;
  
  // Ações
  login: () => Promise<void>;
  logout: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}

export function useWeb3Auth(): UseWeb3AuthReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Queries e mutations do tRPC
  const authMeQuery = trpc.auth.me.useQuery();
  const web3NonceMutation = trpc.auth.web3Nonce.useMutation();
  const web3LoginMutation = trpc.auth.web3Login.useMutation();
  const web3LogoutMutation = trpc.auth.web3Logout.useMutation();
  
  const currentNetwork = getCurrentNetwork();
  const isCorrectNetwork = chainId === currentNetwork.chainId;
  
  /**
   * Fazer login com Web3
   * 1. Gerar nonce do servidor
   * 2. Assinar mensagem com carteira
   * 3. Enviar assinatura para servidor
   * 4. Servidor verifica e cria sessão
   */
  const login = async () => {
    if (!address) {
      setError('Carteira não conectada');
      return;
    }
    
    if (!isCorrectNetwork) {
      setError('Rede incorreta. Por favor, mude para Base');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Obter nonce do servidor
      const { nonce } = await web3NonceMutation.mutateAsync({ address });
      
      // 2. Assinar mensagem
      const message = `Sign this message to login to Harvest Realm\n\nNonce: ${nonce}\nAddress: ${address}`;
      
      const signature = await signMessageAsync({
        message,
      });
      
      // 3. Enviar assinatura para servidor
      const loginResponse = await web3LoginMutation.mutateAsync({
        address,
        signature,
        nonce,
      });
      
      if (loginResponse?.success) {
        // Invalidar cache de autenticação
        authMeQuery.refetch();
        setError(null);
      } else {
        setError(loginResponse?.error || 'Falha ao fazer login');
      }
    } catch (err: any) {
      const message = err?.message || 'Erro desconhecido';
      
      // Ignorar erro de cancelamento do usuário
      if (message && !message.includes('user rejected')) {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Fazer logout
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await web3LogoutMutation.mutateAsync();
      
      // Desconectar carteira
      disconnect();
      
      // Invalidar cache
      authMeQuery.refetch();
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer logout');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Mudar para rede correta
   */
  const switchNetwork = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (switchChain) {
        switchChain({ chainId: currentNetwork.chainId });
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao mudar de rede');
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isConnected,
    address,
    displayAddress: address ? formatAddress(address) : '',
    isLoading: isLoading || web3LoginMutation.isPending || web3LogoutMutation.isPending,
    error,
    isCorrectNetwork,
    login,
    logout,
    switchNetwork,
  };
}
