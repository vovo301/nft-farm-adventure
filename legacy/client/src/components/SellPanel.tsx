import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Package, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
}

function getRarityColor(rarity: number | null): string {
  if (!rarity) return "bg-gray-100 text-gray-800";
  switch (rarity) {
    case 1: return "bg-gray-100 text-gray-800";
    case 2: return "bg-green-100 text-green-800";
    case 3: return "bg-blue-100 text-blue-800";
    case 4: return "bg-purple-100 text-purple-800";
    case 5: return "bg-yellow-100 text-yellow-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getRarityName(rarity: number | null): string {
  if (!rarity) return "Normal";
  switch (rarity) {
    case 1: return "Comum";
    case 2: return "Incomum";
    case 3: return "Raro";
    case 4: return "Épico";
    case 5: return "Lendário";
    default: return "Desconhecido";
  }
}

function getCategoryIcon(category: string): string {
  switch (category) {
    case "crop": return "🌾";
    case "tool": return "🔧";
    case "resource": return "📦";
    case "special": return "✨";
    default: return "📦";
  }
}

/**
 * Modal para criar uma nova listagem de venda
 */
function CreateListingModal({
  item,
  open,
  onOpenChange,
  onSuccess,
}: {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState(
    item.marketPrice ? Number(item.marketPrice) / 1e18 : 1
  );

  const createListingMutation = trpc.game.marketplace.createListing.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Item listado no marketplace com sucesso!");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || "Erro ao criar listagem");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar listagem");
    },
  });

  const handleSubmit = () => {
    if (quantity < 1 || quantity > item.quantity) {
      toast.error(`Quantidade deve ser entre 1 e ${item.quantity}`);
      return;
    }
    if (pricePerUnit <= 0) {
      toast.error("Preço deve ser maior que 0");
      return;
    }

    const priceInWei = BigInt(Math.floor(pricePerUnit * 1e18));
    createListingMutation.mutate({
      itemTypeId: item.itemTypeId,
      quantity,
      pricePerUnit: priceInWei,
    });
  };

  const totalPrice = (quantity * pricePerUnit).toFixed(4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-900">
            Listar Item para Venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info do item */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-3xl">{getCategoryIcon(item.itemCategory)}</span>
            <div>
              <p className="font-semibold text-amber-900">{item.itemName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getRarityColor(item.rarity)}`}>
                  {getRarityName(item.rarity)}
                </Badge>
                <span className="text-xs text-amber-700">
                  Disponível: {item.quantity}
                </span>
              </div>
            </div>
          </div>

          {/* Quantidade */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-amber-900">
              Quantidade a Vender
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-9 w-9 p-0"
              >
                -
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                className="text-center"
                min={1}
                max={item.quantity}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.min(item.quantity, quantity + 1))}
                className="h-9 w-9 p-0"
              >
                +
              </Button>
            </div>
          </div>

          {/* Preço por unidade */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-amber-900">
              Preço por Unidade (HARVEST)
            </label>
            <Input
              type="number"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(Math.max(0.0001, parseFloat(e.target.value) || 0))}
              step="0.01"
              min="0.0001"
              placeholder="Ex: 1.5"
            />
            {item.marketPrice && (
              <p className="text-xs text-amber-600">
                Preço sugerido: {(Number(item.marketPrice) / 1e18).toFixed(4)} HARVEST
              </p>
            )}
          </div>

          {/* Resumo */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex justify-between text-sm">
              <span className="text-green-700">Total a receber:</span>
              <span className="font-bold text-green-800">{totalPrice} HARVEST</span>
            </div>
            <div className="flex justify-between text-xs text-green-600 mt-1">
              <span>Taxa do marketplace (2%):</span>
              <span>-{(parseFloat(totalPrice) * 0.02).toFixed(4)} HARVEST</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-green-800 mt-1 pt-1 border-t border-green-200">
              <span>Líquido:</span>
              <span>{(parseFloat(totalPrice) * 0.98).toFixed(4)} HARVEST</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createListingMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {createListingMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Listando...
              </>
            ) : (
              "Listar para Venda"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Card de listagem ativa do vendedor
 */
function MyListingCard({
  listing,
  onCancel,
}: {
  listing: any;
  onCancel: (id: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="p-4 border-amber-200 hover:border-amber-400 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCategoryIcon(listing.itemCategory)}</span>
            <div>
              <p className="font-semibold text-amber-900">{listing.itemName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs ${getRarityColor(listing.rarity)}`}>
                  {getRarityName(listing.rarity)}
                </Badge>
                <span className="text-xs text-amber-700">
                  Qtd: {listing.quantity}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-amber-900">
              {(Number(listing.pricePerUnit) / 1e18).toFixed(4)} HARVEST
            </p>
            <p className="text-xs text-amber-600">por unidade</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(listing.id)}
              className="mt-1 text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Painel de Venda do Marketplace
 */
export function SellPanel() {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Buscar inventário
  const { data: inventoryItems = [], refetch: refetchInventory } =
    trpc.game.inventory.getInventory.useQuery();

  // Buscar minhas listagens
  const { data: myListings = [], refetch: refetchListings } =
    trpc.game.marketplace.getSellerListings.useQuery();

  // Mutation para cancelar listagem
  const cancelListingMutation = trpc.game.marketplace.cancelListing.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Listagem cancelada com sucesso!");
        refetchListings();
        refetchInventory();
      } else {
        toast.error(result.error || "Erro ao cancelar listagem");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cancelar listagem");
    },
  });

  const handleSellItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setCreateModalOpen(true);
  };

  const handleCancelListing = (listingId: number) => {
    cancelListingMutation.mutate({ listingId });
  };

  const handleListingSuccess = () => {
    refetchListings();
    refetchInventory();
  };

  return (
    <div className="space-y-6">
      {/* Minhas Listagens Ativas */}
      <div>
        <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Minhas Listagens Ativas ({myListings.length})
        </h3>
        {myListings.length === 0 ? (
          <Card className="p-6 text-center border-amber-200 bg-amber-50">
            <Package className="h-10 w-10 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-700 font-medium">Nenhuma listagem ativa</p>
            <p className="text-amber-600 text-sm mt-1">
              Selecione um item do seu inventário abaixo para listar
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {myListings.map((listing: any) => (
                <MyListingCard
                  key={listing.id}
                  listing={listing}
                  onCancel={handleCancelListing}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Inventário para Vender */}
      <div>
        <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Selecionar Item para Vender
        </h3>
        {inventoryItems.length === 0 ? (
          <Card className="p-6 text-center border-amber-200 bg-amber-50">
            <Package className="h-10 w-10 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-700 font-medium">Inventário vazio</p>
            <p className="text-amber-600 text-sm mt-1">
              Cultive e colha itens para poder vendê-los
            </p>
          </Card>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-4">
              {inventoryItems.map((item: InventoryItem) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <Card
                    className="p-3 border-amber-200 hover:border-amber-400 cursor-pointer transition-all"
                    onClick={() => handleSellItem(item)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(item.itemCategory)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-amber-900 text-sm truncate">{item.itemName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${getRarityColor(item.rarity)}`}>
                            {getRarityName(item.rarity)}
                          </Badge>
                          <span className="text-xs text-amber-700">x{item.quantity}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSellItem(item);
                        }}
                      >
                        Vender
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Modal de criação de listagem */}
      {selectedItem && (
        <CreateListingModal
          item={selectedItem}
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={handleListingSuccess}
        />
      )}
    </div>
  );
}

export default SellPanel;
