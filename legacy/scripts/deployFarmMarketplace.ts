import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const FarmMarketplace = await ethers.getContractFactory("FarmMarketplace");
  const farmMarketplace = await FarmMarketplace.deploy();

  await farmMarketplace.waitForDeployment();

  console.log("FarmMarketplace deployed to:", farmMarketplace.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
