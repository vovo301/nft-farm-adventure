import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy UtilityToken
  const UtilityToken = await ethers.getContractFactory("UtilityToken");
  const utilityToken = await UtilityToken.deploy();
  await utilityToken.waitForDeployment();
  console.log("UtilityToken deployed to:", utilityToken.target);

  // Deploy FarmToken
  const FarmToken = await ethers.getContractFactory("FarmToken");
  const farmToken = await FarmToken.deploy();
  await farmToken.waitForDeployment();
  console.log("FarmToken deployed to:", farmToken.target);

  // Deploy FarmLand
  const FarmLand = await ethers.getContractFactory("FarmLand");
  const farmLand = await FarmLand.deploy();
  await farmLand.waitForDeployment();
  console.log("FarmLand deployed to:", farmLand.target);

  // Deploy FarmItems
  const FarmItems = await ethers.getContractFactory("FarmItems");
  const farmItems = await FarmItems.deploy();
  await farmItems.waitForDeployment();
  console.log("FarmItems deployed to:", farmItems.target);

  // Deploy GameEconomyManager
  const GameEconomyManager = await ethers.getContractFactory("GameEconomyManager");
  const gameEconomyManager = await GameEconomyManager.deploy();
  await gameEconomyManager.waitForDeployment();
  console.log("GameEconomyManager deployed to:", gameEconomyManager.target);

  // Deploy FarmMarketplace
  const FarmMarketplace = await ethers.getContractFactory("FarmMarketplace");
  const farmMarketplace = await FarmMarketplace.deploy();
  await farmMarketplace.waitForDeployment();
  console.log("FarmMarketplace deployed to:", farmMarketplace.target);

  // Deploy CraftingSystem
  const CraftingSystem = await ethers.getContractFactory("CraftingSystem");
  const craftingSystem = await CraftingSystem.deploy();
  await craftingSystem.waitForDeployment();
  console.log("CraftingSystem deployed to:", craftingSystem.target);

  // Deploy MissionSystem
  const MissionSystem = await ethers.getContractFactory("MissionSystem");
  const missionSystem = await MissionSystem.deploy();
  await missionSystem.waitForDeployment();
  console.log("MissionSystem deployed to:", missionSystem.target);

  // Configure GameEconomyManager
  console.log("Configuring GameEconomyManager...");
  await gameEconomyManager.setUtilityToken(utilityToken.target);
  await gameEconomyManager.setFarmToken(farmToken.target);
  await gameEconomyManager.setFarmLand(farmLand.target);
  await gameEconomyManager.setFarmItems(farmItems.target);
  // Add other contract addresses to GameEconomyManager as needed
  console.log("GameEconomyManager configured.");

  console.log("All contracts deployed and configured!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
});
