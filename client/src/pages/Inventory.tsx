import React from "react";
import { motion } from "framer-motion";
import { InventoryPanel } from "@/components/InventoryPanel";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Página de inventário
 */
export default function Inventory() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Seu Inventário</h1>
          <p className="text-amber-700">Gerencie seus itens e recursos</p>
        </motion.div>

        {/* Painel de Inventário */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="h-screen max-h-[600px]"
        >
          <InventoryPanel />
        </motion.div>
      </div>
    </div>
  );
}
