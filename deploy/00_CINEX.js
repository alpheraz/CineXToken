require("dotenv").config();

const {
    LIQUIDITY_WALLET,
    DEBT_MANAGEMENT_WALLET,
    ACQUISITION_WALLET,
    DEVELOPMENT_WALLET,
    COMMUNITY_WALLET,
    RESERVE_WALLET
} = process.env;

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments;
    const { deployer } = await getNamedAccounts();

    if (!LIQUIDITY_WALLET) {
        console.log("Liquidity wallet not set in .env");
        return;
    }
    if (!DEBT_MANAGEMENT_WALLET) {
        console.log("Debt management wallet not set in .env");
        return;
    }
    if (!ACQUISITION_WALLET) {
        console.log("Acquisition wallet not set in .env");
        return;
    }
    if (!DEVELOPMENT_WALLET) {
        console.log("Development wallet not set in .env");
        return;
    }
    if (!COMMUNITY_WALLET) {
        console.log("Community wallet not set in .env");
        return;
    }
    if (!RESERVE_WALLET) {
        console.log("Reserve wallet not set in .env");
        return;
    }
  
    const deployResult = await deploy("CINEX", {
      from: deployer,
      args: [
        LIQUIDITY_WALLET,
        DEBT_MANAGEMENT_WALLET,
        ACQUISITION_WALLET,
        DEVELOPMENT_WALLET,
        COMMUNITY_WALLET,
        RESERVE_WALLET
      ],
      log: true,
    });
    if (deployResult.newlyDeployed) {
      log(`CINEX deployed at ${deployResult.address}`);
    }
  };
  module.exports.tags = ["CINEX"];