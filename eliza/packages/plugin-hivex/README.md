# HiveX Plugin

A comprehensive plugin for interacting with the MultiversX blockchain ecosystem, providing essential DeFi functionality and data integration. This plugin enables seamless interaction with MultiversX's blockchain features, including wallet operations, staking, governance, and exchange functionality.

## Features

### Core Actions

1. **Wallet Operations**
   - Native EGLD token balance checking
   - Wallet address retrieval
   - Token supply information
   - Portfolio tracking

2. **Staking Operations**
   - List validators
   - View staking information
   - Delegations management
   - Staking rewards tracking

3. **Governance**
   - View proposals
   - Check voting power
   - Vote on proposals
   - Governance parameters

4. **Exchange and Trading**
   - Market information
   - Order book display
   - Trading statistics
   - Fee information

5. **Blockchain Explorer**
   - Network statistics
   - Recent blocks
   - Transaction lookup
   - Account information

6. **DeFi Metrics**
   - TVL information
   - Protocol comparison
   - Price information
   - Market trends analysis

7. **Advanced Operations**
   - ESDT token management
   - NFT operations
   - Module parameters
   - Network upgrades

### Providers

1. **Wallet Provider**
   - MultiversX network configuration
   - Transaction management
   - Balance tracking
   - Token support

2. **CoinGecko Provider**
   - Real-time cryptocurrency prices
   - Token metadata and information
   - Market metrics
   - Historical price data

3. **DefiLlama Provider**
   - Protocol TVL tracking
   - DeFi protocol analytics
   - Chain-specific metrics
   - Ecosystem performance

4. **Explorer Provider**
   - Block information
   - Transaction details
   - Network statistics
   - Chain activity monitoring

## Project Structure

```
hivex-plugin/
├── src/
│   ├── api/                   # API client base
│   ├── modules/               # Module-specific functionality
│   │   ├── auth.ts            # Auth module actions
│   │   ├── bank.ts            # Bank module actions
│   │   ├── distribution.ts    # Distribution module actions
│   │   ├── exchange.ts        # Exchange module actions
│   │   ├── explorer.ts        # Explorer module actions
│   │   ├── gov.ts             # Governance module actions
│   │   ├── staking.ts         # Staking module actions
│   │   └── ...                # Other module files
│   ├── types/                 # Type definitions
│   └── utils/                 # Utility functions
├── actions/                   # Plugin actions
│   ├── esdt-transfer/         # ESDT token transfer
│   ├── transfer-egld/         # EGLD transfer
│   ├── portfolio/             # Portfolio management
│   └── ...                    # Other actions
├── providers/                 # Data providers
│   ├── coingecko/             # CoinGecko price data
│   ├── defillama/             # DefiLlama TVL data
│   ├── wallet/                # MultiversX wallet
│   └── ...                    # Other providers
└── templates/                 # Response templates
```

## Example Prompts

Here are some example prompts you can use to interact with the HiveX plugin:

### Basic Prompts

```
Show my EGLD balance
Show my MultiversX wallet address
Get the total supply of EGLD tokens
List top 5 validators on MultiversX by voting power
Display MultiversX network statistics
Show 5 most recent blocks on MultiversX
Look up transaction 988B8BD0D199C9B1E5FFE16AE0B5F1BAFAF041365E2C2740AE85D7BE25F0ABC1
Display fee information on xExchange
Show current staking rewards on MultiversX
Show module parameters on MultiversX
Tell me about MultiversX
Search for latest news on MultiversX ecosystem
```

### Advanced Prompts

```
Display all my token balances on MultiversX
Display current staking pool information on MultiversX
Display my current staking delegations on MultiversX
Show active governance proposals on MultiversX
Display details for proposal #123
Show price and trading volume for EGLD/USDT
Display order book for BTC/USDT market on xExchange
Show Total Value Locked in MultiversX ecosystem
Stake 10 EGLD with validator 'Neptune Foundation'
Send 5 EGLD to erd1abc...xyz
Get current prices for BTC, ETH, and EGLD
Analyze my portfolio performance on MultiversX
```

## Environment Variables

To use this plugin, you need to add the following environment variables to your `.env` file:

```
# Required for MultiversX operations
MULTIVERSX_PRIVATE_KEY=your_private_key
MULTIVERSX_NETWORK=Mainnet  # or Devnet, Testnet

# Optional - for enhanced functionality
COINGECKO_API_KEY=your_coingecko_api_key
DEFILLAMA_API_KEY=your_defillama_api_key
```

## Contributing

Contributions are welcome! Feel free to submit pull requests or open issues to improve the plugin's functionality.

## License

MIT
