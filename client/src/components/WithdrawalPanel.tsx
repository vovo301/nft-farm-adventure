import React, { useState } from "react";
import { ArrowUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Componente para gerenciar saques de itens off-chain para NFTs on-chain.
 * Requer contratos GameEconomyManager e FarmItems deployados na rede Base Sepolia.
 */
export function WithdrawalPanel() {
  const { user } = useAuth();

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <div className="mb-6 flex items-center gap-2">
        <ArrowUp className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-purple-900">Sacar Itens para NFT</h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Funcionalidade de Saque On-Chain
            </p>
            <p className="text-sm text-blue-800">
              Converta seus itens off-chain em NFTs ERC-1155 na rede Base Sepolia.
              Esta funcionalidade requer que os contratos inteligentes estejam deployados.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-white rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-2">Como Funciona</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">1.</span>
              Selecione os itens do seu inventário que deseja converter em NFTs
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">2.</span>
              Uma taxa de 2% é aplicada para cobrir custos de gas na blockchain
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">3.</span>
              Os NFTs são mintados no contrato FarmItems (ERC-1155) na rede Base Sepolia
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">4.</span>
              Os NFTs aparecem na sua carteira MetaMask/WalletConnect
            </li>
          </ol>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>Pré-requisito:</strong> Os contratos GameEconomyManager e FarmItems
              precisam estar deployados. Execute:{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">
                pnpm hardhat run scripts/deployAll.ts --network baseSepolia
              </code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-lg border border-purple-200 text-center">
            <p className="text-2xl font-bold text-purple-600">2%</p>
            <p className="text-xs text-gray-600">Taxa de Saque</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-purple-200 text-center">
            <p className="text-lg font-bold text-blue-600">ERC-1155</p>
            <p className="text-xs text-gray-600">Padrão NFT</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-purple-200 text-center">
            <p className="text-2xl font-bold text-green-600">Base</p>
            <p className="text-xs text-gray-600">Rede Blockchain</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default WithdrawalPanel;
