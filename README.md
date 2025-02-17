# Cinex_Blockchain

## Quick Start

1. Clone repo
2. Install dependencies with `npm i`
3. Create .env file 
4. Copy the contents of the .env.example file to the .env file
5. Fill the fields in the .env file

## Deployment

1.Run `npx hardhat deploy --network <NETWORK_NAME>`

2.Run `npx hardhat etherscan-verify --network <NETWORK_NAME>`

NETWORK_NAME - The name of the chain from the Hardhat.config.js file

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

### `setPoolWithFeeList`
- **Description**: Sets pool addresses for which swap commission is charged. Only admin.
- **Input**:
  - `pool`: Pool address.
  - `add`: True if an swap commission is charged for this pool, otherwise false.