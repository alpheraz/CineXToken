const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

async function main() {
    console.log(`[NOTICE!] Chain of deployment: ${network.name}`);

    // Deploy proxy and implementation
    const contractName = "CINEX";
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    const cinex = await upgrades.deployProxy(_contractProto, [], {
        kind: "uups"
    });
    await cinex.waitForDeployment();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].proxyAddress = await cinex.getAddress();

    let cinexImplAddress = await upgrades.erc1967.getImplementationAddress(
        await cinex.getAddress()
    );
    OUTPUT_DEPLOY[network.name][contractName].implAddress = cinexImplAddress;

    // ====================================================

    fs.writeFileSync(
        path.resolve(__dirname, fileName),
        JSON.stringify(OUTPUT_DEPLOY, null, "  ")
    );

    console.log(
        `\n***Deployment are completed!***\n***See Results in "${
            __dirname + fileName
        }" file***`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
