import { ethers } from "hardhat";

/**
 * Script de deploy de todos os contratos do NFT Farm Adventure.
 * Ordem de deploy:
 * 1. UtilityToken (HARVEST)
 * 2. FarmToken (FARM)
 * 3. FarmLand
 * 4. FarmItems
 * 5. GameEconomyManager
 * 6. Configurar roles e permissões
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=================================================");
  console.log("NFT Farm Adventure - Deploy de Contratos");
  console.log("=================================================");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");

  // 1. Deploy do UtilityToken (HARVEST)
  console.log("1. Deployando UtilityToken (HARVEST)...");
  const UtilityToken = await ethers.getContractFactory("UtilityToken");
  const harvestToken = await UtilityToken.deploy(deployer.address);
  await harvestToken.waitForDeployment();
  const harvestAddress = await harvestToken.getAddress();
  console.log("   ✅ UtilityToken (HARVEST):", harvestAddress);

  // 2. Deploy do FarmToken (FARM)
  console.log("2. Deployando FarmToken (FARM)...");
  const FarmToken = await ethers.getContractFactory("FarmToken");
  const farmToken = await FarmToken.deploy(deployer.address);
  await farmToken.waitForDeployment();
  const farmTokenAddress = await farmToken.getAddress();
  console.log("   ✅ FarmToken (FARM):", farmTokenAddress);

  // 3. Deploy do FarmLand (ERC-721)
  console.log("3. Deployando FarmLand (ERC-721)...");
  const FarmLand = await ethers.getContractFactory("FarmLand");
  const farmLand = await FarmLand.deploy(deployer.address);
  await farmLand.waitForDeployment();
  const farmLandAddress = await farmLand.getAddress();
  console.log("   ✅ FarmLand:", farmLandAddress);

  // 4. Deploy do FarmItems (ERC-1155)
  console.log("4. Deployando FarmItems (ERC-1155)...");
  const baseURI = process.env.METADATA_BASE_URI || "https://api.harvestrealm.game/metadata/";
  const FarmItems = await ethers.getContractFactory("FarmItems");
  const farmItems = await FarmItems.deploy(deployer.address, baseURI);
  await farmItems.waitForDeployment();
  const farmItemsAddress = await farmItems.getAddress();
  console.log("   ✅ FarmItems:", farmItemsAddress);

  // 5. Deploy do GameEconomyManager
  console.log("5. Deployando GameEconomyManager...");
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const GameEconomyManager = await ethers.getContractFactory("GameEconomyManager");
  const gameEconomyManager = await GameEconomyManager.deploy(
    deployer.address,
    harvestAddress,
    farmTokenAddress,
    farmLandAddress,
    farmItemsAddress,
    treasury
  );
  await gameEconomyManager.waitForDeployment();
  const gameEconomyManagerAddress = await gameEconomyManager.getAddress();
  console.log("   ✅ GameEconomyManager:", gameEconomyManagerAddress);

  // 6. Configurar roles e permissões
  console.log("\n6. Configurando roles e permissões...");
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  await harvestToken.grantRole(MINTER_ROLE, gameEconomyManagerAddress);
  console.log("   ✅ GameEconomyManager pode cunhar HARVEST");
  await farmToken.grantRole(MINTER_ROLE, gameEconomyManagerAddress);
  console.log("   ✅ GameEconomyManager pode cunhar FARM");
  await farmLand.grantRole(MINTER_ROLE, gameEconomyManagerAddress);
  console.log("   ✅ GameEconomyManager pode cunhar FarmLand");
  await farmItems.grantRole(MINTER_ROLE, gameEconomyManagerAddress);
  console.log("   ✅ GameEconomyManager pode cunhar FarmItems");

  // 7. Definir tipos de itens iniciais
  console.log("\n7. Definindo tipos de itens iniciais...");
  const itemTypes = [
    { name: "Trigo", category: 0, rarity: 1, maxSupply: 0 },
    { name: "Milho", category: 0, rarity: 1, maxSupply: 0 },
    { name: "Cenoura", category: 0, rarity: 2, maxSupply: 0 },
    { name: "Batata", category: 0, rarity: 2, maxSupply: 0 },
    { name: "Tomate", category: 0, rarity: 3, maxSupply: 0 },
    { name: "Morango", category: 0, rarity: 3, maxSupply: 0 },
    { name: "Trufa Dourada", category: 0, rarity: 4, maxSupply: 0 },
    { name: "Flor Mística", category: 0, rarity: 5, maxSupply: 1000 },
    { name: "Enxada Básica", category: 1, rarity: 1, maxSupply: 0 },
    { name: "Regador", category: 1, rarity: 1, maxSupply: 0 },
    { name: "Fertilizante", category: 2, rarity: 1, maxSupply: 0 },
    { name: "Semente Especial", category: 3, rarity: 4, maxSupply: 5000 },
  ];
  for (const item of itemTypes) {
    await farmItems.defineItemType(item.name, item.category, item.rarity, item.maxSupply);
    console.log(`   ✅ Item definido: ${item.name}`);
  }

  console.log("\n=================================================");
  console.log("Deploy concluído com sucesso!");
  console.log("=================================================");
  console.log("Endereços dos contratos:");
  console.log({
    UtilityToken: harvestAddress,
    FarmToken: farmTokenAddress,
    FarmLand: farmLandAddress,
    FarmItems: farmItemsAddress,
    GameEconomyManager: gameEconomyManagerAddress,
  });
  console.log("\nAdicione ao .env:");
  console.log(`HARVEST_TOKEN_ADDRESS=${harvestAddress}`);
  console.log(`FARM_TOKEN_ADDRESS=${farmTokenAddress}`);
  console.log(`FARM_LAND_ADDRESS=${farmLandAddress}`);
  console.log(`FARM_ITEMS_ADDRESS=${farmItemsAddress}`);
  console.log(`GAME_ECONOMY_MANAGER_ADDRESS=${gameEconomyManagerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro no deploy:", error);
    process.exit(1);
  });
