import hre from "hardhat";
const { ethers } = hre;

// Official tUSD8 Test Stablecoin on QDay Aevum Testnet (Chain ID 44005)
const AEVUM_TUSD8_ADDRESS = "0x456569838f1d43009A91ebA4263147Afd7233483";

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account configured. Check AEVUM_SEED_PHRASE or AEVUM_DEPLOYER_PRIVATE_KEY in .env");
  }
  console.log("Deploying PayQRegistry to QDay Aevum Testnet...");
  console.log("Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer tQDAY Balance:", ethers.formatEther(balance));

  const tusd8Address = process.env.NEXT_PUBLIC_TUSD8_ADDRESS || AEVUM_TUSD8_ADDRESS;
  const PayQRegistry = await ethers.getContractFactory("PayQRegistry");
  const registry = await PayQRegistry.deploy(tusd8Address, deployer.address);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("PayQRegistry deployed at:", address);
  console.log("tUSD8 token:", tusd8Address);
  console.log("Explorer:", `https://explorer-test.qday.info/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
