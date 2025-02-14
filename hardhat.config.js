require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("dotenv").config();

const {
  ETHERSCAN_API_KEY,
  POLYGONSCAN_API_KEY,
  ACC_PRIVATE_KEY,
  SEPOLIA_ALCHEMY_KEY,
  AMOY_ALCHEMY_KEY,
  ETHEREUM_ALCHEMY_KEY,
  BNB_ALCHEMY_KEY
} = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 20000000000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://bnb-mainnet.g.alchemy.com/v2/${BNB_ALCHEMY_KEY}`,
        blockNumber: 46561710,
      }
    },
    // Ethereum Sepolia testnet
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${SEPOLIA_ALCHEMY_KEY}`,
      accounts: [ACC_PRIVATE_KEY],
      verify: {
        etherscan: {
          apiKey: ETHERSCAN_API_KEY,
        },
      },
    },
    amoy: {
      url: `https://rpc-amoy.polygon.technology/`,
      accounts: [ACC_PRIVATE_KEY],
      verify: {
        etherscan: {
          apiKey: POLYGONSCAN_API_KEY,
        },
      },
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${AMOY_ALCHEMY_KEY}`,
      accounts: [ACC_PRIVATE_KEY],
      verify: {
        etherscan: {
          apiKey: POLYGONSCAN_API_KEY,
        },
      },
    },
    // Ethereum mainnet
    ethereum: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${ETHEREUM_ALCHEMY_KEY}`,
      accounts: [ACC_PRIVATE_KEY],
      verify: {
        etherscan: {
          apiKey: ETHERSCAN_API_KEY,
        },
      },
    },
  }
};
