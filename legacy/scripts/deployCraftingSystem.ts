import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const CraftingSystem = await ethers.getContractFactory("CraftingSystem");
  const craftingSystem = await CraftingSystem.deploy();

  await craftingSystem.waitForDeployment();

  console.log("CraftingSystem deployed to:", craftingSystem.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
