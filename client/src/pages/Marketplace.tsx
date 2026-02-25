import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketplaceListings } from "@/components/MarketplaceListings";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Página de Marketplace
 */
export default function Marketplace() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Marketplace</h1>
          <p className="text-amber-700">Compre e venda itens com outros jogadores</p>
        </motion.div>

        {/* Abas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="buy">Comprar</TabsTrigger>
              <TabsTrigger value="sell">Vender</TabsTrigger>
            </TabsList>

            {/* Aba de Compra */}
            <TabsContent value="buy" className="space-y-4">
              <MarketplaceListings />
            </TabsContent>

            {/* Aba de Venda */}
            <TabsContent value="sell" className="space-y-4">
              <div className="bg-white rounded-lg p-6 border-2 border-amber-200">
                <h2 className="text-xl font-semibold text-amber-900 mb-4">Minhas Listagens</h2>
                <p className="text-amber-700">
                  Funcionalidade de venda será implementada em breve.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
