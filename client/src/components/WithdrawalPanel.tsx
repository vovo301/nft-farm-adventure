import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";

interface WithdrawalItem {
  id: number;
  itemId: number;
  itemName: string;
  quantity: number;
  rarity: number;
  canWithdraw: boolean;
}

interface WithdrawalRequest {
  id: string;
  itemId: number;
  quantity: number;
  quantityAfterFee: number;
  withdrawalFee: number;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Componente para gerenciar saques de itens off-chain para NFTs on-chain
 * Permite que jogadores visualizem seus itens e iniciem o processo de saque
 */
export function WithdrawalPanel() {
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<WithdrawalItem | null>(null);
  const [withdrawalQuantity, setWithdrawalQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"items" | "history">("items");

  // Queries
  const { data: withdrawableItems = [], isLoading: itemsLoading } =
    trpc.withdrawal.getWithdrawableItems.useQuery(
      { userId: user?.id || "" },
      { enabled: !!user?.id }
    );

  const { data: withdrawalHistory = [], isLoading: historyLoading } =
    trpc.withdrawal.getWithdrawalHistory.useQuery(
      { userId: user?.id || "" },
      { enabled: !!user?.id }
    );

  // Mutations
  const { mutate: requestWithdrawal, isPending: isWithdrawing } =
    trpc.withdrawal.requestWithdrawal.useMutation({
      onSuccess: (data) => {
        alert(`✅ ${data.message}`);
        setSelectedItem(null);
        setWithdrawalQuantity(1);
      },
      onError: (error) => {
        alert(`❌ Erro: ${error.message}`);
      },
    });

  const { mutate: cancelWithdrawal, isPending: isCanceling } =
    trpc.withdrawal.cancelWithdrawal.useMutation({
      onSuccess: (data) => {
        alert(`✅ ${data.message}`);
      },
      onError: (error) => {
        alert(`❌ Erro: ${error.message}`);
      },
    });

  const handleRequestWithdrawal = () => {
    if (!selectedItem || !user?.id) return;

    requestWithdrawal({
      userId: user.id,
      itemId: selectedItem.itemId,
      quantity: withdrawalQuantity,
      withdrawalFeePercentage: 0.05, // 5% de taxa
    });
  };

  const getRarityColor = (rarity: number): string => {
    switch (rarity) {
      case 1:
        return "text-gray-500"; // Comum
      case 2:
        return "text-green-500"; // Incomum
      case 3:
        return "text-blue-500"; // Raro
      case 4:
        return "text-purple-500"; // Épico
      case 5:
        return "text-yellow-500"; // Lendário
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <div className="mb-6 flex items-center gap-2">
        <ArrowUp className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-purple-900">Sacar Itens para NFT</h2>
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b border-purple-200">
        <button
          onClick={() => setActiveTab("items")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "items"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-purple-600"
          }`}
        >
          Meus Itens
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "history"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-purple-600"
          }`}
        >
          Histórico de Saques
        </button>
      </div>

      {/* Aba de Itens */}
      <AnimatePresence mode="wait">
        {activeTab === "items" && (
          <motion.div
            key="items"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {itemsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin">
                  <ArrowUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            ) : withdrawableItems.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>Você não possui itens para sacar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Lista de Itens */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {withdrawableItems.map((item) => (
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setWithdrawalQuantity(1);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedItem?.id === item.id
                          ? "border-purple-600 bg-purple-100"
                          : "border-purple-200 bg-white hover:border-purple-400"
                      } ${!item.canWithdraw ? "opacity-50 cursor-not-allowed" : ""}`}
                      disabled={!item.canWithdraw}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className={`font-semibold ${getRarityColor(item.rarity)}`}>
                            {item.itemName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Quantidade disponível: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-purple-600">
                            {item.quantity}x
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Formulário de Saque */}
                {selectedItem && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white rounded-lg border-2 border-purple-300"
                  >
                    <h3 className="font-semibold mb-4 text-purple-900">
                      Sacar {selectedItem.itemName}
                    </h3>

                    <div className="space-y-4">
                      {/* Quantidade */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantidade a Sacar
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedItem.quantity}
                          value={withdrawalQuantity}
                          onChange={(e) =>
                            setWithdrawalQuantity(Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Máximo: {selectedItem.quantity}
                        </p>
                      </div>

                      {/* Resumo da Taxa */}
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-700">Quantidade:</span>
                          <span className="font-semibold">{withdrawalQuantity}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-700">Taxa (5%):</span>
                          <span className="font-semibold text-red-600">
                            -{Math.ceil(withdrawalQuantity * 0.05)}
                          </span>
                        </div>
                        <div className="border-t border-purple-200 pt-2 flex justify-between">
                          <span className="text-gray-900 font-semibold">Você receberá:</span>
                          <span className="font-bold text-green-600">
                            {withdrawalQuantity - Math.ceil(withdrawalQuantity * 0.05)}
                          </span>
                        </div>
                      </div>

                      {/* Aviso */}
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">
                          Após o saque, os itens serão transformados em NFTs em sua carteira Web3.
                          Uma taxa de 5% será aplicada para cobrir custos de transação.
                        </p>
                      </div>

                      {/* Botão de Saque */}
                      <Button
                        onClick={handleRequestWithdrawal}
                        disabled={isWithdrawing || withdrawalQuantity <= 0}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 rounded-lg transition-all"
                      >
                        {isWithdrawing ? "Processando..." : "Sacar para NFT"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Aba de Histórico */}
        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin">
                  <ArrowUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            ) : withdrawalHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>Você ainda não realizou nenhum saque.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawalHistory.map((request: WithdrawalRequest) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-white rounded-lg border border-purple-200 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(request.status)}
                        <span className="font-semibold capitalize">
                          {request.status === "pending" && "Pendente"}
                          {request.status === "processing" && "Processando"}
                          {request.status === "completed" && "Concluído"}
                          {request.status === "failed" && "Falhou"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {request.quantityAfterFee} de {request.quantity} unidades
                        {request.withdrawalFee > 0 && (
                          <span className="text-red-600 ml-2">
                            (Taxa: {request.withdrawalFee})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {request.status === "pending" && (
                      <Button
                        onClick={() => cancelWithdrawal({ withdrawalId: request.id })}
                        disabled={isCanceling}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Cancelar
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
