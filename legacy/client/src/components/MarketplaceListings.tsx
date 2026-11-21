import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Search, Filter, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface MarketplaceListing {
  id: number;
  sellerId: number;
  sellerName: string | null;
  itemTypeId: number;
  itemName: string;
  itemCategory: "crop" | "tool" | "resource" | "special";
  rarity: number | null;
  quantity: number;
  pricePerUnit: bigint;
  totalPrice: bigint;
  createdAt: Date;
}

function getRarityColor(rarity: number | null): string {
  if (!rarity) return "bg-gray-100 text-gray-800";
  switch (rarity) {
    case 1:
      return "bg-gray-100 text-gray-800";
    case 2:
      return "bg-green-100 text-green-800";
    case 3:
      return "bg-blue-100 text-blue-800";
    case 4:
      return "bg-purple-100 text-purple-800";
    case 5:
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

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
 * Card de listagem do marketplace
 */
function ListingCard({
  listing,
  onBuy,
  isLoading,
}: {
  listing: MarketplaceListing;
  onBuy: (listingId: number, quantity: number) => void;
  isLoading: boolean;
}) {
  const [quantity, setQuantity] = useState(1);

  const pricePerUnit = Number(listing.pricePerUnit) / 1e18;
  const totalPrice = Number(listing.totalPrice) / 1e18;
  const buyPrice = (pricePerUnit * quantity).toFixed(2);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="p-4 bg-white rounded-lg border-2 border-amber-200 hover:border-amber-400 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{getCategoryIcon(listing.itemCategory)}</span>
            <h3 className="font-semibold text-amber-900">{listing.itemName}</h3>
          </div>
          <p className="text-xs text-amber-700">
            Vendedor: {listing.sellerName || "Anônimo"}
          </p>
        </div>
        {listing.rarity && (
          <Badge className={getRarityColor(listing.rarity)}>
            {getRarityName(listing.rarity)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div className="p-2 bg-amber-50 rounded">
          <div className="text-amber-600 text-xs">Preço/Un</div>
          <div className="font-bold text-amber-900">{pricePerUnit.toFixed(2)}</div>
        </div>
        <div className="p-2 bg-amber-50 rounded">
          <div className="text-amber-600 text-xs">Disponível</div>
          <div className="font-bold text-amber-900">x{listing.quantity}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          disabled={isLoading}
        >
          -
        </Button>
        <Input
          type="number"
          min="1"
          max={listing.quantity}
          value={quantity}
          onChange={(e) => setQuantity(Math.min(listing.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
          className="text-center w-16"
          disabled={isLoading}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setQuantity(Math.min(listing.quantity, quantity + 1))}
          disabled={isLoading}
        >
          +
        </Button>
        <div className="flex-1 text-right">
          <div className="text-xs text-amber-600">Total</div>
          <div className="font-bold text-amber-900">{buyPrice} HARVEST</div>
        </div>
      </div>

      <Button
        onClick={() => onBuy(listing.id, quantity)}
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        <ShoppingCart className="w-4 h-4 mr-2" />
        Comprar
      </Button>
    </motion.div>
  );
}

/**
 * Painel de listagens do marketplace
 */
export function MarketplaceListings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Buscar listagens
  const { data: listings = [], isLoading, refetch } = trpc.game.marketplace.getActiveListings.useQuery({
    limit: 50,
    offset: 0,
  });

  // Comprar item
  const buyMutation = trpc.game.marketplace.buyListing.useMutation({
    onSuccess: () => {
      toast.success("Item comprado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao comprar item");
    },
  });

  // Filtrar listagens
  const filteredListings = listings.filter((listing: any) => {
    const matchesSearch = listing.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || listing.itemCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["crop", "tool", "resource", "special"];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-amber-900">Marketplace</h2>
        </div>

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

        {/* Filtros de categoria */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-amber-600" : ""}
          >
            <Filter className="w-3 h-3 mr-1" />
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? "bg-amber-600" : ""}
            >
              {cat === "crop" && "🌾"}
              {cat === "tool" && "🔧"}
              {cat === "resource" && "📦"}
              {cat === "special" && "✨"}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de listagens */}
      <ScrollArea className="h-[500px] pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-amber-700">Carregando listagens...</div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-amber-700">
              {listings.length === 0
                ? "Nenhum item à venda no momento"
                : "Nenhum item encontrado com esses filtros"}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredListings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  listing={listing as MarketplaceListing}
                  onBuy={(listingId, quantity) => {
                    buyMutation.mutate({ listingId, quantity });
                  }}
                  isLoading={buyMutation.isPending}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
