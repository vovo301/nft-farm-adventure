import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketplaceListings } from "@/components/MarketplaceListings";
import { SellPanel } from "@/components/SellPanel";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, TrendingUp, Store, Clock } from "lucide-react";

/**
 * Página de Marketplace
 */
export default function Marketplace() {
  const { user } = useAuth();

  // Buscar estatísticas do marketplace
  const { data: activeListings } = trpc.game.marketplace.getActiveListings.useQuery({
    limit: 100,
    offset: 0,
  });
  const { data: myListings } = trpc.game.marketplace.getSellerListings.useQuery();
  const { data: transactions } = trpc.game.marketplace.getTransactionHistory.useQuery({
    limit: 5,
    offset: 0,
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-amber-900 mb-1">🏪 Marketplace</h1>
          <p className="text-amber-700 text-sm">Compre e venda itens com outros jogadores</p>
        </motion.div>

        {/* Estatísticas rápidas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <Card className="p-3 border-amber-200">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-xs text-amber-600">Listagens Ativas</p>
                <p className="text-xl font-bold text-amber-900">{activeListings?.length || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 border-amber-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-amber-600">Minhas Vendas</p>
                <p className="text-xl font-bold text-amber-900">{myListings?.length || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 border-amber-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-amber-600">Transações</p>
                <p className="text-xl font-bold text-amber-900">{transactions?.length || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 border-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-amber-600">Taxa</p>
                <p className="text-xl font-bold text-amber-900">2%</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Abas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="buy">Comprar</TabsTrigger>
              <TabsTrigger value="sell">Vender</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            {/* Aba de Compra */}
            <TabsContent value="buy" className="space-y-4">
              <MarketplaceListings />
            </TabsContent>

            {/* Aba de Venda */}
            <TabsContent value="sell" className="space-y-4">
              <SellPanel />
            </TabsContent>

            {/* Aba de Histórico */}
            <TabsContent value="history" className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-amber-900">Histórico de Transações</h3>
                {!transactions || transactions.length === 0 ? (
                  <Card className="p-6 text-center border-amber-200 bg-amber-50">
                    <Clock className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                    <p className="text-amber-700 font-medium">Nenhuma transação ainda</p>
                    <p className="text-amber-600 text-sm mt-1">
                      Suas compras e vendas aparecerão aqui
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx: any) => (
                      <Card key={tx.id} className="p-3 border-amber-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-amber-900 text-sm">{tx.itemName}</p>
                            <p className="text-xs text-amber-600">
                              {tx.buyerId === user?.id ? "Compra" : "Venda"} •{" "}
                              {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-sm ${tx.buyerId === user?.id ? "text-red-600" : "text-green-600"}`}>
                              {tx.buyerId === user?.id ? "-" : "+"}{(Number(tx.totalPrice) / 1e18).toFixed(4)} HARVEST
                            </p>
                            <p className="text-xs text-amber-600">x{tx.quantity}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
