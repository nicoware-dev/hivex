import { Plugin } from "@elizaos/core";
import { CoinGeckoActions } from "./actions/coingecko";
import { DefiLlamaActions } from "./actions/defillama";
import transferAction from "./actions/transfer";
import createTokenAction from "./actions/createToken";
import { multiversxWalletProvider } from "./providers/wallet";

// Import other action groups as they are implemented
// import { WalletActions } from "./actions/wallet";
// import { ExplorerActions } from "./actions/explorer";
// import { StakingActions } from "./actions/staking";
// import { GovernanceActions } from "./actions/governance";
// import { TokenActions } from "./actions/token";
// import { NFTActions } from "./actions/nft";

/**
 * HiveX Plugin for MultiversX blockchain integration
 * 
 * This plugin provides comprehensive functionality for interacting with the MultiversX
 * blockchain ecosystem, including wallet operations, staking, governance, and DeFi features.
 */
export const hivexPlugin: Plugin = {
  name: "hivex",
  description: "MultiversX blockchain integration for HiveX",
  actions: [
    ...CoinGeckoActions,
    ...DefiLlamaActions,
    transferAction,
    createTokenAction,
    // Add other action groups as they are implemented
    // ...WalletActions,
    // ...ExplorerActions,
    // ...StakingActions,
    // ...GovernanceActions,
    // ...TokenActions,
    // ...NFTActions,
  ],
  providers: [
    multiversxWalletProvider
  ],
};

export default hivexPlugin;
