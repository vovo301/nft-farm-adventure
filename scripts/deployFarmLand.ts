import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const FarmLand = await ethers.getContractFactory("FarmLand");
  const farmLand = await FarmLand.deploy();

  await farmLand.waitForDeployment();

  console.log("FarmLand deployed to:", farmLand.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
