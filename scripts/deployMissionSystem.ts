import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const MissionSystem = await ethers.getContractFactory("MissionSystem");
  const missionSystem = await MissionSystem.deploy();

  await missionSystem.waitForDeployment();

  console.log("MissionSystem deployed to:", missionSystem.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
