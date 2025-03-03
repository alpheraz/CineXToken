require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require('@openzeppelin/hardhat-upgrades');
require("dotenv").config();

const {
  ETHERSCAN_API_KEY,
  ACC_PRIVATE_KEY,
  ALCHEMY_API_KEY,
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
    // Ethereum Sepolia testnet
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [ACC_PRIVATE_KEY],
      verify: {
        etherscan: {
          apiKey: ETHERSCAN_API_KEY,
        },
      },
    },
    // Ethereum mainnet
    ethereum: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [ACC_PRIVATE_KEY],
      verify: {
        etherscan: {
          apiKey: ETHERSCAN_API_KEY,
        },
      },
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
      ethereum: ETHERSCAN_API_KEY
    }
  }
};
