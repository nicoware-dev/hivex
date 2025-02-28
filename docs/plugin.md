# ElizaOS Plugin for HiveX

The ElizaOS Plugin for MultiversX is the bridge that connects your HiveX agents to the MultiversX blockchain ecosystem. It provides a comprehensive set of tools and integrations that enable your agents to interact with MultiversX's DeFi features, access market data, and execute blockchain operations.

## Capabilities

### Core Actions
- **Wallet Operations:**
  - Manage EGLD and ESDT tokens
  - View wallet balances and addresses
  - Check token supply information
  - Track portfolio performance

- **Blockchain Interactions:**
  - Staking and validator management
  - Governance participation
  - Exchange and trading operations
  - Transaction tracking and verification

- **Explorer Functions:**
  - Block data retrieval
  - Transaction history
  - Network statistics
  - Smart contract information

- **DeFi Operations:**
  - Token swaps on AshSwap & xExchange
  - Lending and borrowing via Hatom Protocol
  - Liquidity provision
  - Yield farming (coming soon)

### Data Providers
- **Market Data:**
  - CoinGecko price feeds
  - DefiLlama TVL metrics
  - GeckoTerminal pool data
  - Historical performance data

- **On-Chain Analytics:**
  - Transaction volume analysis
  - Network activity metrics
  - Smart contract usage statistics
  - Gas price optimization

## Implementation

```typescript
import { HiveXActions } from '@elizaos/plugin-hivex';

// Initialize the plugin
const hivex = new HiveXActions();

// Example: Get wallet balance
const balance = await hivex.getBalance('erd1...');

// Example: Swap tokens
const swap = await hivex.swapTokens({
  from: 'EGLD',
  to: 'USDC',
  amount: '0.1',
  slippage: '0.5'
});
```

## Architecture

The plugin is built with a modular architecture that separates concerns into:
- **API Client Base:** Handles communication with MultiversX's blockchain nodes
- **Module-specific Functionality:** Organized by blockchain module (bank, staking, governance, etc.)
- **Actions:** High-level operations that agents can perform
- **Providers:** Data sources and service integrations
- **Templates:** Response formatting for consistent user experience

## Extending the Plugin

The plugin's modular design makes it easy to extend with new features:
1. Add new module functionality in the appropriate module file
2. Create new actions that leverage the module functionality
3. Update or create templates for formatting responses
4. Register new actions in the plugin's main export

For more detailed information about our agents and their capabilities, check out our [Agents Directory](./agents.md) or see our [Integrations](./integrations.md) with various protocols.

Happy automating! 🚀
