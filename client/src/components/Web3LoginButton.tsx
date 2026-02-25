import React from 'react';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente de Login Web3
 * Gerencia autenticação com carteira
 */
export function Web3LoginButton() {
  const { 
    isConnected, 
    address, 
    isLoading, 
    error, 
    isCorrectNetwork,
    login,
    logout,
    switchNetwork,
  } = useWeb3Auth();

  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Carteira não conectada - mostrar botão de conexão
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <ConnectButton />
      </div>
    );
  }

  // Rede incorreta - mostrar botão de mudar rede
  if (!isCorrectNetwork) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">Rede Incorreta</span>
        </div>
        <Button 
          onClick={switchNetwork}
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Mudando...
            </>
          ) : (
            'Mudar para Base'
          )}
        </Button>
      </div>
    );
  }

  // Carteira conectada e rede correta
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-2 h-2 bg-green-600 rounded-full" />
        <span className="text-sm text-green-600">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
      </div>
      <Button 
        onClick={login}
        disabled={isLoading}
        size="sm"
        variant="default"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Conectando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>
      <Button 
        onClick={logout}
        disabled={isLoading}
        size="sm"
        variant="outline"
      >
        Sair
      </Button>
    </div>
  );
}
