import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";
import * as dotenv from 'dotenv';
dotenv.config();

import "./tasks/FHECipherNotes";

// Run 'npx hardhat vars setup' to see the list of variables that need to be set

// Environment variable configuration with fallbacks
const MNEMONIC: string = vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const PRIVATE_KEY: string = process.env.PRIVATE_KEY
  ? (process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY : ("0x" + process.env.PRIVATE_KEY))
  : vars.get("PRIVATE_KEY", "");
const INFURA_API_KEY: string = process.env.INFURA_API_KEY || vars.get("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
const ALCHEMY_API_KEY: string = process.env.ALCHEMY_API_KEY || vars.get("ALCHEMY_API_KEY", "");
const QUICKNODE_API_KEY: string = process.env.QUICKNODE_API_KEY || vars.get("QUICKNODE_API_KEY", "");

// Network URLs with multiple provider fallbacks
const SEPOLIA_URL: string = process.env.SEPOLIA_RPC_URL ||
  (INFURA_API_KEY !== "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}` :
   ALCHEMY_API_KEY ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}` :
   "https://rpc.sepolia.org");

const MAINNET_URL: string = process.env.MAINNET_RPC_URL ||
  (INFURA_API_KEY !== "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" ? `https://mainnet.infura.io/v3/${INFURA_API_KEY}` :
   ALCHEMY_API_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` :
   "https://rpc.ankr.com/eth");

const POLYGON_URL: string = process.env.POLYGON_RPC_URL ||
  (ALCHEMY_API_KEY ? `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` :
   QUICKNODE_API_KEY ? `https://wiser-little-mountain.matic.quiknode.pro/${QUICKNODE_API_KEY}/` :
   "https://polygon-rpc.com");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      mainnet: vars.get("ETHERSCAN_API_KEY", ""),
      sepolia: vars.get("ETHERSCAN_API_KEY", ""),
      polygon: vars.get("POLYGONSCAN_API_KEY", ""),
      polygonMumbai: vars.get("POLYGONSCAN_API_KEY", ""),
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
      allowUnlimitedContractSize: true,
      blockGasLimit: 100000000,
    },
    anvil: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 31337,
      url: "http://localhost:8545",
      allowUnlimitedContractSize: true,
    },
    sepolia: {
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 11155111,
      url: SEPOLIA_URL,
      gasPrice: 20000000000, // 20 gwei
    },
    mainnet: {
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 1,
      url: MAINNET_URL,
      gasPrice: 30000000000, // 30 gwei
    },
    polygon: {
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 137,
      url: POLYGON_URL,
      gasPrice: 40000000000, // 40 gwei (in matic)
    },
    polygonMumbai: {
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 80001,
      url: process.env.POLYGON_MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      gasPrice: 20000000000,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      metadata: {
        bytecodeHash: "none",
      },
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 60000,
    retries: 2,
  },
  fhevm: {
    networkUrl: process.env.FHEVM_NETWORK_URL || "http://localhost:8545",
    privateKey: PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
};

export default config;

