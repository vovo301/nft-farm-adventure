import React from "react";
import { motion } from "framer-motion";
import { InventoryPanel } from "@/components/InventoryPanel";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * Página de inventário
 */
export default function Inventory() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-amber-900 mb-1">🎒 Seu Inventário</h1>
          <p className="text-amber-700 text-sm">Gerencie seus itens e recursos</p>
        </motion.div>

        {/* Painel de Inventário */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <InventoryPanel />
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
