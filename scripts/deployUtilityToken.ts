import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const UtilityToken = await ethers.getContractFactory("UtilityToken");
  const utilityToken = await UtilityToken.deploy();

  await utilityToken.waitForDeployment();

  console.log("UtilityToken deployed to:", utilityToken.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
