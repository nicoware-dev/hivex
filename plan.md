# HiveX MultiversX Action Implementation Plan

This document outlines a comprehensive plan for implementing additional MultiversX actions for the HiveX platform. These actions will enhance the platform's capabilities by providing users with more ways to interact with the MultiversX blockchain.

## 1. Explorer Actions

### 1.1. GET_ACCOUNT_INFO
- **Description**: Fetch detailed information about any account on the MultiversX blockchain
- **Required Parameters**:
  - `address`: The address to query (bech32 format)
- **Implementation Steps**:
  1. Use `ApiNetworkProvider.getAccount()` to fetch account details
  2. Format the response to include balance, nonce, and other account properties
  3. Add explorer link to the account

### 1.2. GET_NETWORK_STATS
- **Description**: Fetch network statistics from MultiversX
- **Required Parameters**: None
- **Implementation Steps**:
  1. Use `ApiNetworkProvider.getNetworkGeneralStatistics()` to fetch network stats
  2. Format the response to include TPS, shards, blocks, and other network metrics

### 1.3. GET_TRANSACTION_INFO
- **Description**: Fetch detailed information about a transaction
- **Required Parameters**:
  - `txHash`: The transaction hash to query
- **Implementation Steps**:
  1. Use `ApiNetworkProvider.getTransaction()` to fetch transaction details
  2. Format the response to include sender, receiver, value, status, and other transaction properties
  3. Add explorer link to the transaction

### 1.4. GET_LATEST_TRANSACTIONS
- **Description**: Fetch the latest transactions on the network
- **Required Parameters**:
  - `limit` (optional): Number of transactions to fetch (default: 10)
- **Implementation Steps**:
  1. Use the MultiversX API endpoint for latest transactions
  2. Format the response to include transaction hashes, senders, receivers, and values
  3. Add explorer links to the transactions

### 1.5. GET_LATEST_BLOCKS
- **Description**: Fetch the latest blocks on the network
- **Required Parameters**:
  - `limit` (optional): Number of blocks to fetch (default: 10)
- **Implementation Steps**:
  1. Use the MultiversX API endpoint for latest blocks
  2. Format the response to include block hashes, proposers, size, and transactions count
  3. Add explorer links to the blocks

## 2. Token Actions

### 2.1. GET_TOKEN_INFO
- **Description**: Fetch detailed information about a token
- **Required Parameters**:
  - `tokenIdentifier`: The token identifier (e.g., "WEGLD-bd4d79")
- **Implementation Steps**:
  1. Use `ApiNetworkProvider.getDefinitionOfFungibleToken()` to fetch token details
  2. Format the response to include name, ticker, supply, decimals, and other token properties
  3. Add explorer link to the token

### 2.2. GET_ACCOUNT_TOKENS
- **Description**: Fetch all tokens owned by an account
- **Required Parameters**:
  - `address`: The address to query (bech32 format)
- **Implementation Steps**:
  1. Use `ApiNetworkProvider.getFungibleTokensOfAccount()` to fetch account tokens
  2. Format the response to include token identifiers, balances, and USD values
  3. Add explorer links to the tokens

### 2.3. GET_ACCOUNT_NFTS
- **Description**: Fetch all NFTs owned by an account
- **Required Parameters**:
  - `address`: The address to query (bech32 format)
- **Implementation Steps**:
  1. Use `ApiNetworkProvider.getNonFungibleTokensOfAccount()` to fetch account NFTs
  2. Format the response to include NFT identifiers, names, and metadata
  3. Add explorer links to the NFTs

## 3. DeFi Actions

### 3.1. SWAP_TOKENS (xExchange)
- **Description**: Swap tokens on xExchange
- **Required Parameters**:
  - `fromToken`: The token to swap from (e.g., "WEGLD-bd4d79")
  - `toToken`: The token to swap to (e.g., "USDC-c76f1f")
  - `amount`: The amount to swap
  - `slippage` (optional): Maximum slippage percentage (default: 1%)
- **Implementation Steps**:
  1. Use the xExchange SDK to create a swap transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 3.2. ADD_LIQUIDITY (xExchange)
- **Description**: Add liquidity to a pool on xExchange
- **Required Parameters**:
  - `firstToken`: The first token in the pair (e.g., "WEGLD-bd4d79")
  - `secondToken`: The second token in the pair (e.g., "USDC-c76f1f")
  - `firstAmount`: The amount of the first token
  - `secondAmount`: The amount of the second token
- **Implementation Steps**:
  1. Use the xExchange SDK to create an add liquidity transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 3.3. REMOVE_LIQUIDITY (xExchange)
- **Description**: Remove liquidity from a pool on xExchange
- **Required Parameters**:
  - `lpToken`: The LP token identifier (e.g., "WEGLDUSDC-abcdef")
  - `amount`: The amount of LP tokens to remove
- **Implementation Steps**:
  1. Use the xExchange SDK to create a remove liquidity transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 3.4. GET_POOL_INFO (xExchange)
- **Description**: Fetch information about a liquidity pool on xExchange
- **Required Parameters**:
  - `firstToken`: The first token in the pair (e.g., "WEGLD-bd4d79")
  - `secondToken`: The second token in the pair (e.g., "USDC-c76f1f")
- **Implementation Steps**:
  1. Use the xExchange API to fetch pool information
  2. Format the response to include reserves, fees, and APR
  3. Add explorer link to the pool

### 3.5. SUPPLY_LENDING (Hatom)
- **Description**: Supply tokens to the Hatom lending protocol
- **Required Parameters**:
  - `token`: The token to supply (e.g., "WEGLD-bd4d79")
  - `amount`: The amount to supply
- **Implementation Steps**:
  1. Use the Hatom smart contract to create a supply transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 3.6. BORROW_LENDING (Hatom)
- **Description**: Borrow tokens from the Hatom lending protocol
- **Required Parameters**:
  - `token`: The token to borrow (e.g., "USDC-c76f1f")
  - `amount`: The amount to borrow
- **Implementation Steps**:
  1. Use the Hatom smart contract to create a borrow transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 3.7. REPAY_LENDING (Hatom)
- **Description**: Repay borrowed tokens on the Hatom lending protocol
- **Required Parameters**:
  - `token`: The token to repay (e.g., "USDC-c76f1f")
  - `amount`: The amount to repay
- **Implementation Steps**:
  1. Use the Hatom smart contract to create a repay transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 3.8. WITHDRAW_LENDING (Hatom)
- **Description**: Withdraw supplied tokens from the Hatom lending protocol
- **Required Parameters**:
  - `token`: The token to withdraw (e.g., "WEGLD-bd4d79")
  - `amount`: The amount to withdraw
- **Implementation Steps**:
  1. Use the Hatom smart contract to create a withdraw transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 3.9. GET_LENDING_MARKETS (Hatom)
- **Description**: Fetch information about lending markets on Hatom
- **Required Parameters**: None
- **Implementation Steps**:
  1. Use the Hatom API to fetch market information
  2. Format the response to include supply/borrow rates, total supply/borrow, and utilization
  3. Add links to the markets

## 4. Staking Actions

### 4.1. DELEGATE_STAKE
- **Description**: Delegate EGLD to a staking provider
- **Required Parameters**:
  - `provider`: The staking provider address
  - `amount`: The amount to delegate
- **Implementation Steps**:
  1. Use the staking smart contract to create a delegation transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 4.2. UNDELEGATE_STAKE
- **Description**: Undelegate EGLD from a staking provider
- **Required Parameters**:
  - `provider`: The staking provider address
  - `amount`: The amount to undelegate
- **Implementation Steps**:
  1. Use the staking smart contract to create an undelegation transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 4.3. CLAIM_REWARDS
- **Description**: Claim staking rewards
- **Required Parameters**:
  - `provider`: The staking provider address
- **Implementation Steps**:
  1. Use the staking smart contract to create a claim rewards transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 4.4. GET_DELEGATION_INFO
- **Description**: Fetch delegation information for an account
- **Required Parameters**:
  - `address`: The address to query (bech32 format)
- **Implementation Steps**:
  1. Use the staking API to fetch delegation information
  2. Format the response to include delegated amount, rewards, and provider details
  3. Add explorer links

### 4.5. GET_STAKING_PROVIDERS
- **Description**: Fetch information about staking providers
- **Required Parameters**: None
- **Implementation Steps**:
  1. Use the staking API to fetch provider information
  2. Format the response to include provider addresses, APR, and total stake
  3. Add explorer links to the providers

### 4.6. LIQUID_STAKE (Hatom)
- **Description**: Stake EGLD using Hatom's liquid staking protocol
- **Required Parameters**:
  - `amount`: The amount to stake
- **Implementation Steps**:
  1. Use the Hatom liquid staking smart contract to create a staking transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

### 4.7. LIQUID_UNSTAKE (Hatom)
- **Description**: Unstake EGLD from Hatom's liquid staking protocol
- **Required Parameters**:
  - `amount`: The amount to unstake
- **Implementation Steps**:
  1. Use the Hatom liquid staking smart contract to create an unstaking transaction
  2. Sign and send the transaction
  3. Return the transaction hash and explorer link

## 5. Portfolio Actions

### 5.1. GET_PORTFOLIO
- **Description**: Fetch a comprehensive portfolio for an account
- **Required Parameters**:
  - `address`: The address to query (bech32 format)
- **Implementation Steps**:
  1. Fetch account balance, tokens, and NFTs
  2. Fetch delegation information
  3. Fetch lending positions
  4. Fetch liquidity positions
  5. Calculate total portfolio value in USD
  6. Format the response to include all portfolio components and their values

### 5.2. GET_TRANSACTION_HISTORY
- **Description**: Fetch transaction history for an account
- **Required Parameters**:
  - `address`: The address to query (bech32 format)
  - `limit` (optional): Number of transactions to fetch (default: 50)
  - `before` (optional): Fetch transactions before this timestamp
- **Implementation Steps**:
  1. Use the MultiversX API to fetch transaction history
  2. Format the response to include transaction details and categorize by type
  3. Add explorer links to the transactions

## 6. Implementation Priority

1. **High Priority**:
   - Explorer Actions (GET_ACCOUNT_INFO, GET_NETWORK_STATS)
   - Token Actions (GET_TOKEN_INFO, GET_ACCOUNT_TOKENS)
   - Portfolio Actions (GET_PORTFOLIO)

2. **Medium Priority**:
   - Staking Actions (DELEGATE_STAKE, UNDELEGATE_STAKE, CLAIM_REWARDS)
   - DeFi Actions (SWAP_TOKENS, GET_POOL_INFO)
   - Transaction Actions (GET_TRANSACTION_INFO, GET_TRANSACTION_HISTORY)

3. **Lower Priority**:
   - Advanced DeFi Actions (ADD_LIQUIDITY, REMOVE_LIQUIDITY)
   - Lending Actions (SUPPLY_LENDING, BORROW_LENDING)
   - Liquid Staking Actions (LIQUID_STAKE, LIQUID_UNSTAKE)

## 7. Technical Considerations

1. **Error Handling**:
   - Implement robust error handling for all actions
   - Provide clear error messages to users
   - Handle network issues gracefully

2. **Rate Limiting**:
   - Implement rate limiting to avoid API throttling
   - Cache responses where appropriate

3. **Security**:
   - Never expose private keys in logs or responses
   - Validate all user inputs
   - Implement proper transaction signing

4. **Testing**:
   - Create unit tests for all actions
   - Test on devnet before deploying to mainnet
   - Create integration tests for DeFi actions

5. **Documentation**:
   - Document all actions with clear examples
   - Provide usage guidelines for users
   - Include error codes and their meanings

## 8. Resources and Dependencies

1. **SDKs and Libraries**:
   - @multiversx/sdk-core
   - @multiversx/sdk-exchange (for xExchange)
   - @ashswap/ash-sdk-js (for Ashswap)

2. **APIs**:
   - MultiversX API (https://api.multiversx.com/)
   - xExchange API
   - Hatom API

3. **Smart Contracts**:
   - Staking contracts
   - xExchange contracts
   - Hatom contracts

4. **Documentation**:
   - MultiversX docs (https://docs.multiversx.com/)
   - xExchange docs (https://docs.xexchange.com/)
   - Hatom docs (https://docs.hatom.com/)
   - Ashswap docs (https://docs.ashswap.io/)
