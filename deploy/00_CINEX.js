module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments;
    const { deployer } = await getNamedAccounts();
  
    const deployResult = await deploy("CINEX", {
      from: deployer,
      log: true,
    });
    if (deployResult.newlyDeployed) {
      log(`CINEX deployed at ${deployResult.address}`);
    }
  };
  module.exports.tags = ["CINEX"];