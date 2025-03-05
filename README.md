# Cinex_Blockchain

## Quick Start

1. Install [Git](https://git-scm.com/)
2. Install [Node.js v20.12.0](https://nodejs.org/en/download/)
3. Clone repo
4. Navigate to the directory with the cloned code
5. Install all required dependencies with
```
npm install
```
6. Create a file called `.env` in the root of the project with the same contents as `.env.example`
7. Create an account on [Etherscan](https://etherscan.io/). Go to `Account -> API Keys`. Create a new API key. Copy it to `.env` file
  ```
  ETHERSCAN_API_KEY=<your etherscan API key>
  ```
8. Create an account on [Alchemy](https://alchemy.com/). Go to `Apps`. Create a app. Copy API key from app to `.env` file
  ```
  ALCHEMY_API_KEY=<your alchemy app API key>
  ```
8. Copy your wallet's private key to `.env` file

  ```
  ACC_PRIVATE_KEY=<your private key>
  ```

  :warning:**DO NOT SHARE YOUR .env FILE IN ANY WAY OR YOU RISK TO LOSE ALL YOUR FUNDS**:warning:

## Deployment

1. Deploy contract
```
npx hardhat run ./scripts/deploy.js --network <NETWORK_NAME>
```
2. Verify contract
```
npx hardhat run ./scripts/verify.js --network <NETWORK_NAME>
```

## Networks

а) **Sepolia test** network
Make sure you have _enough test ETH tokens_ for testnet.

```
<hardhat command here> --network sepolia
```

b) **Ethereum main** network
Make sure you have _enough real ETH tokens_ in your wallet. Deployment to the mainnet costs money!

```
<hardhat command here> --network ethereum
```

c) **Hardhat** network

- Run Hardhat node locally. All _deploy scripts_ will be executed as well:

```
npx hardhat node
```

- Run sripts on the node

```
npx hardhat run <script name here> --network localhost
```

## Description
The CINEX contract is a ERC20 token with a swap fees, 30 seconds swap cooldown, temporary restriction on the max amount of the transfer.

### Functions Overview

### `getFee`
- **Description**: Returns the current commission for swap.

### `setFeeFreeList`
- **Description**: Sets addresses for which no commission is charged. Only admin.
- **Input**:
  - `account`: Address.
  - `add`: True if the address is exempt from commission, otherwise false.

### `setTransferRestrictionFreeList`
- **Description**: Sets addresses for which do not apply restrictions on the maximum transfer amount. Only admin.
- **Input**:
  - `account`: Address.
  - `add`: True if the address is exempt from restrictions on the maximum transfer amount, otherwise false.

### `setPoolWithFeeList`
- **Description**: Sets pool addresses for which swap commission is charged. Only admin.
- **Input**:
  - `pool`: Pool address.
  - `add`: True if an swap commission is charged for this pool, otherwise false.

### `pause`
- **Description**: The function blocks the possibility of transfer tokens. Only admin.

### `unpause`
- **Description**: The function unblocks the possibility of transfer tokens. Only admin.

## Smart Contracts Upgradeability

The source code of upgradeable contracts can be updated _without_ the need to redeploy the contracts afterwards. The state of contracts (values in storage) remains the same. This allows to add new features to the contracts and fix existing bugs/vulnerabilities.

It's _highly recommended_ to study the following materials for detailed explanation of contracts upgradeability:

1. [What is Proxy](https://docs.openzeppelin.com/upgrades-plugins/proxies)
2. [Difference Between Transparent and UUPS Proxy](https://docs.openzeppelin.com/contracts/5.x/api/proxy#transparent-vs-uups)
3. [How to Write Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable)
4. [How to Deploy and Upgrade Contracts Using Hardhat](https://docs.openzeppelin.com/upgrades-plugins/hardhat-upgrades)
5. [Constuctor Allowing to Create Upgradeable Contracts](https://wizard.openzeppelin.com/#custom)

## Upgrade

1. Create new version of your contract. Add `V2`, `V3`, etc. to the end of each new version of contract. You might have several versions of the same contract in one directory at the same time or you can store them in separate directories
2. Open `scripts/upgrade.js` file

3. Change the `newContractName` variable if you need. This string variable represents new implementation of upgraded contract. "New implementation" is any contract that _is upgrade-compatible_ with the previous implementation and _has a different bytecode_.
   Example:

```
let newContractName = "CINEXV2";
```

_NOTE_:

- Contract from the `newContractName` variable must be present in the project directory
- Contract `CINEX` must have already been deployed in mainnet/testnet

4. Run the upgrade script

```
npx hardhat run scripts/upgrade.js --network <NETWORK_NAME>
```

When running, this script will output logs into the console. If you see any error messages in the logs with the script _still running_ - ignore them. They might later be used for debug purposes.  
If Hardhat Upgrades plugin finds your contracts _upgrade-incompatible_ it will generate an error that will stop script execution. Is this case you have to follow the [How to Write Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable) guide.  
After this script completes, the `implAddress` field of contract `CINEX` will be changed inside the `scripts/deployOutput.json` file. This will indicate that contracts upgrade was finished successfully.  
Even after the upgrade, you should _use only `proxyAddress` or `proxyVerification` fields of the deploy output file to interact with contracts_.

5. Run the verify script

```
npx hardhat run scripts/verify.js --network <NETWORK_NAME>
```