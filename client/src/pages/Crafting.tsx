import { DashboardLayout } from "@/components/DashboardLayout";
import { CraftingPanel } from "@/components/CraftingPanel";

/**
 * Página de Crafting
 * Permite ao jogador visualizar receitas e gerenciar jobs de crafting
 */
export default function Crafting() {
  return (
    <DashboardLayout>
      <div className="w-full h-full">
        <CraftingPanel />
      </div>
    </DashboardLayout>
  );
}
