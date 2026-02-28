import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const FarmToken = await ethers.getContractFactory("FarmToken");
  const farmToken = await FarmToken.deploy();

  await farmToken.waitForDeployment();

  console.log("FarmToken deployed to:", farmToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
