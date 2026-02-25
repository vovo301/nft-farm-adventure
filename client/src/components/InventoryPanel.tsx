import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Backpack, Search, Trash2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface InventoryItem {
  id: number;
  itemTypeId: number;
  quantity: number;
  itemName: string;
  itemCategory: "crop" | "tool" | "resource" | "special";
  rarity: number | null;
  description: string | null;
  marketPrice: bigint | null;
  durability: number | null;
}

/**
 * Retorna a cor baseada na raridade
 */
function getRarityColor(rarity: number | null): string {
  if (!rarity) return "bg-gray-100 text-gray-800";
  switch (rarity) {
    case 1:
      return "bg-gray-100 text-gray-800"; // Comum
    case 2:
      return "bg-green-100 text-green-800"; // Incomum
    case 3:
      return "bg-blue-100 text-blue-800"; // Raro
    case 4:
      return "bg-purple-100 text-purple-800"; // Épico
    case 5:
      return "bg-yellow-100 text-yellow-800"; // Lendário
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Retorna o nome da raridade
 */
function getRarityName(rarity: number | null): string {
  if (!rarity) return "Normal";
  switch (rarity) {
    case 1:
      return "Comum";
    case 2:
      return "Incomum";
    case 3:
      return "Raro";
    case 4:
      return "Épico";
    case 5:
      return "Lendário";
    default:
      return "Desconhecido";
  }
}

/**
 * Retorna ícone de categoria
 */
function getCategoryIcon(category: string): string {
  switch (category) {
    case "crop":
      return "🌾";
    case "tool":
      return "🔧";
    case "resource":
      return "📦";
    case "special":
      return "✨";
    default:
      return "📦";
  }
}

/**
 * Cartão de item do inventário
 */
function InventoryItemCard({
  item,
  onSelect,
  isSelected,
}: {
  item: InventoryItem;
  onSelect: (item: InventoryItem) => void;
  isSelected: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(item)}
      className={`
        w-full p-3 rounded-lg border-2 transition-all text-left
        ${
          isSelected
            ? "border-green-500 bg-green-50"
            : "border-amber-200 bg-amber-50 hover:border-amber-400"
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getCategoryIcon(item.itemCategory)}</span>
            <h4 className="font-semibold text-amber-900">{item.itemName}</h4>
          </div>
          {item.description && (
            <p className="text-xs text-amber-700 mt-1">{item.description}</p>
          )}
        </div>
        {item.rarity && (
          <Badge className={getRarityColor(item.rarity)}>
            {getRarityName(item.rarity)}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-lg font-bold text-amber-900">
          x{item.quantity}
        </div>
        {item.marketPrice && (
          <div className="text-xs text-amber-700">
            {(Number(item.marketPrice) / 1e18).toFixed(2)} HARVEST
          </div>
        )}
      </div>

      {item.durability !== null && (
        <div className="mt-2 text-xs">
          <div className="text-amber-700 mb-1">Durabilidade</div>
          <div className="w-full bg-amber-200 rounded h-1.5">
            <div
              className="h-full bg-green-600 rounded"
              style={{ width: `${item.durability}%` }}
            />
          </div>
        </div>
      )}
    </motion.button>
  );
}

/**
 * Painel de inventário
 */
export function InventoryPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Buscar inventário
  const { data: items = [], isLoading, refetch } = trpc.game.inventory.getInventory.useQuery();

  // Buscar espaço
  const { data: space } = trpc.game.inventory.getSpace.useQuery();

  // Remover item
  const removeMutation = trpc.game.inventory.removeItem.useMutation({
    onSuccess: () => {
      toast.success("Item removido");
      refetch();
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover item");
    },
  });

  // Filtrar itens
  const filteredItems = items.filter(
    (item) =>
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveItem = () => {
    if (!selectedItem) return;
    removeMutation.mutate({
      itemTypeId: selectedItem.itemTypeId,
      quantity: 1,
    });
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <Backpack className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-amber-900">Inventário</h2>
        </div>

        {/* Espaço */}
        {space && (
          <div className="text-sm text-amber-700 mb-3">
            <div className="flex justify-between mb-1">
              <span>Espaço utilizado</span>
              <span className="font-semibold">
                {space.used}/{space.total}
              </span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(space.used / space.total) * 100}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-green-400 to-green-600"
              />
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-amber-600" />
          <Input
            placeholder="Buscar item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-white border-amber-300"
          />
        </div>
      </div>

      {/* Lista de itens */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-amber-700">Carregando...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4 text-center">
            <div className="text-amber-700">
              {items.length === 0
                ? "Seu inventário está vazio"
                : "Nenhum item encontrado"}
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <AnimatePresence>
              {filteredItems.map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item as InventoryItem}
                  onSelect={setSelectedItem}
                  isSelected={selectedItem?.id === item.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Detalhes do item selecionado */}
      {selectedItem && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-t border-amber-200 bg-white rounded-b-lg space-y-3"
        >
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">
              {selectedItem.itemName}
            </h3>
            {selectedItem.description && (
              <p className="text-xs text-amber-700">{selectedItem.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-amber-100 rounded">
              <div className="text-amber-600 font-medium">Quantidade</div>
              <div className="text-lg font-bold text-amber-900">
                {selectedItem.quantity}
              </div>
            </div>
            <div className="p-2 bg-amber-100 rounded">
              <div className="text-amber-600 font-medium">Categoria</div>
              <div className="text-amber-900 capitalize">
                {selectedItem.itemCategory}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRemoveItem}
              disabled={removeMutation.isPending}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remover
            </Button>
            <Button
              disabled
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-1" />
              Transferir
            </Button>
          </div>
        </motion.div>
      )}
    </Card>
  );
}
