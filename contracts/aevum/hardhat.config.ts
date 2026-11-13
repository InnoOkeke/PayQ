import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Lightweight .env loader using built-in Node fs (no external dotenv dependency)
function loadRootEnv() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(currentDir, "../../.env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadRootEnv();

const PRIVATE_KEY = process.env.AEVUM_DEPLOYER_PRIVATE_KEY || "";
const SEED_PHRASE = process.env.AEVUM_SEED_PHRASE || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    aevumTestnet: {
      url: process.env.NEXT_PUBLIC_AEVUM_RPC_URL || "https://rpc-test.qday.info",
      chainId: 44005,
      accounts: PRIVATE_KEY
        ? [PRIVATE_KEY]
        : SEED_PHRASE
        ? { mnemonic: SEED_PHRASE }
        : [],
    },
  },
};

export default config;
