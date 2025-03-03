const { ethers, network, upgrades } = require("hardhat");
require("dotenv").config();

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

async function main() {
    console.log(`[NOTICE!] Chain of verification: ${network.name}`);

    // Get the address of the already deployed proxy and implementation
    let proxyAddress =
        OUTPUT_DEPLOY[network.name]["CINEX"].proxyAddress;
    let implAddress =
        OUTPUT_DEPLOY[network.name]["CINEX"].implAddress;

    if (proxyAddress.length == 0) {
        console.error("Invalid existing proxy address!");
        process.exit(1);
    }
    if (implAddress.length == 0) {
        console.error("Invalid existing implementation address!");
        process.exit(1);
    }

    console.log(
        `[CINEX][Implementation]: Start of Verification...`
    );
    try {
        await hre.run("verify:verify", {
            address: implAddress,
        });
    } catch (e) {
        console.log(e);
    }

    console.log(
        `[CINEX][Implementation]: Verification finished!`
    );

    // Verify proxy
    console.log(`[CINEX][Proxy]: Start of Verification...`);
    

    try {
        await hre.run("verify:verify", {
            address: proxyAddress,
        });
    } catch (e) {
        console.log(e);
    }
    console.log(`[CINEX][Proxy]: Verification Finished!`);

    console.log(
        `\n***Verification are completed!***`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
