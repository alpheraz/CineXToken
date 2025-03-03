const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

// New version of upgraded contract
let newContractName = "CINEXV2";

async function main() {
    console.log(`[NOTICE!] Chain of upgrade: ${network.name}`);

    // Get the address of the already deployed proxy
    let proxyAddress =
        OUTPUT_DEPLOY[network.name]["CINEX"].proxyAddress;

    if (proxyAddress.length == 0) {
        console.error("Invalid existing proxy address!");
        process.exit(1);
    }
    console.assert(
        proxyAddress.length > 0,
        "Invalid existing proxy address!"
    );
    // Get factory of upgraded contract
    let newImpl = await ethers.getContractFactory(newContractName);

    console.log(
        `[CINEX][Proxy]: Start migrating to a new implementation contract...`
    );
    // Hardhat Upgrades plugin will run some checks for upgradeable
    // contract compatibility and that may result in an error
    let newImplAddress;
    try {
        // Get the address of the new implementation
        newImplAddress = await upgrades.prepareUpgrade(
            proxyAddress,
            newImpl,
            {
                kind: "uups",
            }
        );
        // Actually make an upgrade
        await upgrades.upgradeProxy(proxyAddress, newImpl, {
            kind: "uups",
        });
    } catch (e) {
        // If one of the contracts can not be upgraded, that's a critical error
        console.error(e);
        process.exit(1);
    }
    console.log(`[CINEX][Proxy]: Migration finished!`);

    OUTPUT_DEPLOY[network.name]["CINEX"].implAddress =
        newImplAddress;

    fs.writeFileSync(
        path.resolve(__dirname, fileName),
        JSON.stringify(OUTPUT_DEPLOY, null, "  ")
    );

    console.log(
        `\n***Proxy upgrade are completed!***\n***See Results in "${
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
