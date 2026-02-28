import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const FarmItems = await ethers.getContractFactory("FarmItems");
  const farmItems = await FarmItems.deploy();

  await farmItems.waitForDeployment();

  console.log("FarmItems deployed to:", farmItems.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
