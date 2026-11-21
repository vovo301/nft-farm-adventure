import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Sprout,
  Package,
  Store,
  Hammer,
  Target,
  TrendingUp,
  Coins,
  Star,
  Users,
  Zap,
  BarChart3,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="p-4 border-amber-100 hover:border-amber-300 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold text-amber-900">{value}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function QuickActionCard({
  icon,
  label,
  description,
  path,
  color,
  delay = 0,
}: {
  icon: string;
  label: string;
  description: string;
  path: string;
  color: string;
  delay?: number;
}) {
  const [, setLocation] = useLocation();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={`p-4 cursor-pointer border-2 ${color} hover:shadow-md transition-all`}
        onClick={() => setLocation(path)}
      >
        <div className="flex flex-col gap-2">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-amber-900">{label}</h3>
            <p className="text-xs text-amber-700 mt-1">{description}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: farmingStats } = trpc.game.farming.getStats.useQuery();
  const { data: inventorySpace } = trpc.game.inventory.getSpace.useQuery();
  const { data: marketListings } = trpc.game.marketplace.getActiveListings.useQuery({
    limit: 5,
    offset: 0,
  });

  const walletAddress = user?.walletAddress;
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  const harvestBalance = user?.harvestBalance
    ? (Number(user.harvestBalance) / 1e18).toFixed(2)
    : "0.00";

  const farmBalance = user?.farmBalance
    ? (Number(user.farmBalance) / 1e18).toFixed(2)
    : "0.00";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-amber-900">
              Bem-vindo de volta! 👋
            </h1>
            <p className="text-amber-700 text-sm mt-1">
              {shortAddress ? (
                <span className="font-mono bg-amber-100 px-2 py-0.5 rounded text-xs">
                  {shortAddress}
                </span>
              ) : (
                "Conecte sua carteira para começar"
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-300 text-amber-700 gap-1">
              <Star className="h-3 w-3" />
              Nível {user?.level || 1}
            </Badge>
            <Badge variant="outline" className="border-green-300 text-green-700 gap-1">
              <Zap className="h-3 w-3" />
              {user?.experience?.toString() || "0"} XP
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs font-medium">Token HARVEST</p>
                  <p className="text-2xl font-bold mt-1">{harvestBalance}</p>
                  <p className="text-amber-200 text-xs mt-1">Token de utilidade do jogo</p>
                </div>
                <div className="text-4xl opacity-80">🌾</div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs font-medium">Token FARM</p>
                  <p className="text-2xl font-bold mt-1">{farmBalance}</p>
                  <p className="text-green-200 text-xs mt-1">Token de governança (on-chain)</p>
                </div>
                <div className="text-4xl opacity-80">🏛️</div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-semibold text-amber-900 mb-3"
          >
            Suas Estatísticas
          </motion.h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard icon={Sprout} label="Terras" value={farmingStats?.totalLands || 0} color="bg-green-500" delay={0.2} />
            <StatCard icon={TrendingUp} label="Cultivos Ativos" value={farmingStats?.growingCrops || 0} color="bg-blue-500" delay={0.25} />
            <StatCard icon={BarChart3} label="Prontos p/ Colher" value={farmingStats?.readyCrops || 0} color="bg-amber-500" delay={0.3} />
            <StatCard icon={Package} label="Itens no Inventário" value={inventorySpace?.used || 0} color="bg-purple-500" delay={0.35} />
            <StatCard icon={Coins} label="Total Colhido" value={farmingStats?.totalYield || 0} color="bg-yellow-500" delay={0.4} />
            <StatCard icon={Store} label="Itens no Mercado" value={marketListings?.length || 0} color="bg-red-500" delay={0.45} />
            <StatCard icon={Clock} label="Tempo de Jogo" value={`${user?.totalPlayTime || 0}min`} color="bg-indigo-500" delay={0.5} />
            <StatCard icon={Users} label="Facção" value={user?.factionId ? `#${user.factionId}` : "Nenhuma"} color="bg-pink-500" delay={0.55} />
          </div>
        </div>

        <div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg font-semibold text-amber-900 mb-3"
          >
            Ações Rápidas
          </motion.h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <QuickActionCard icon="🌱" label="Farming" description="Plante e colha cultivos" path="/farming" color="border-green-200 hover:border-green-400" delay={0.55} />
            <QuickActionCard icon="🎒" label="Inventário" description="Gerencie seus itens" path="/inventory" color="border-blue-200 hover:border-blue-400" delay={0.6} />
            <QuickActionCard icon="🏪" label="Marketplace" description="Compre e venda itens" path="/marketplace" color="border-amber-200 hover:border-amber-400" delay={0.65} />
            <QuickActionCard icon="⚒️" label="Crafting" description="Crie novos itens" path="/crafting" color="border-purple-200 hover:border-purple-400" delay={0.7} />
            <QuickActionCard icon="🎯" label="Missões" description="Complete objetivos" path="/missions" color="border-red-200 hover:border-red-400" delay={0.75} />
          </div>
        </div>

        {farmingStats && farmingStats.readyCrops > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-4 bg-green-50 border-green-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌾</span>
                  <div>
                    <p className="font-semibold text-green-800">
                      {farmingStats.readyCrops} cultivo(s) pronto(s) para colher!
                    </p>
                    <p className="text-sm text-green-700">
                      Vá para o Farming para colher seus cultivos.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setLocation("/farming")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Colher Agora
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="p-4 bg-amber-50 border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-2">
              🏛️ Sobre o Harvest Realm
            </h3>
            <p className="text-sm text-amber-700">
              Harvest Realm é um jogo NFT de farming na <strong>Base Network</strong>.
              Cultive terras, crie itens via crafting, negocie no marketplace e complete missões
              para ganhar tokens <strong>HARVEST</strong> e <strong>FARM</strong>.
              Itens podem ser sacados como NFTs ERC-1155 para sua carteira Web3.
            </p>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
