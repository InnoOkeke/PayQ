import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account configured. Check AEVUM_SEED_PHRASE or AEVUM_DEPLOYER_PRIVATE_KEY in .env");
  }

  console.log("Deploying PayQAgentRegistry (ERC-8004) to QDay Aevum Testnet...");
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("PayQAgentRegistry");
  const agentRegistry = await Factory.deploy();
  await agentRegistry.waitForDeployment();

  const address = await agentRegistry.getAddress();
  console.log("PayQAgentRegistry deployed at:", address);

  // Mint Agent #1 for PayQ Copilot
  const agentURI = "https://payq-virid.vercel.app/api/agent";
  const tx = await agentRegistry.register(agentURI);
  await tx.wait();
  console.log("Registered PayQ Copilot as ERC-8004 Agent #1, tx:", tx.hash);
  console.log("Explorer:", `https://explorer-test.qday.info/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
