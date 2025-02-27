import {
    elizaLogger,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";
import { initWalletProvider } from "../../providers/wallet";
import { validateMultiversxConfig } from "../../enviroment";
import { Address } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-core";

// Define a generic token interface to avoid type issues
interface TokenInfo {
    identifier: string;
    balance: string | bigint;
    name?: string;
    decimals?: number;
    [key: string]: any; // Allow any additional properties
}

// Define a generic NFT interface to avoid type issues
interface NftInfo {
    identifier: string;
    collection: string;
    nonce: number;
    name?: string;
    [key: string]: any; // Allow any additional properties
}

/**
 * Portfolio action for fetching and displaying a user's MultiversX assets
 * This action responds to queries like "show my portfolio" and displays:
 * - EGLD balance
 * - Fungible tokens
 * - NFTs (if available)
 * - Total portfolio value (if price data is available)
 */
export default {
    name: "GET_PORTFOLIO",
    similes: [
        "SHOW_PORTFOLIO",
        "MY_PORTFOLIO",
        "PORTFOLIO_INFO",
        "SHOW_MY_ASSETS",
        "MY_ASSETS",
        "SHOW_MY_TOKENS",
        "MY_TOKENS",
        "SHOW_MY_BALANCE",
        "MY_BALANCE",
        "SHOW_MY_WALLET_PORTFOLIO",
        "WALLET_PORTFOLIO",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            await validateMultiversxConfig(runtime);
            return true;
        } catch (error) {
            elizaLogger.error("MultiversX configuration validation failed");
            return false;
        }
    },
    description: "Get MultiversX portfolio information",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting GET_PORTFOLIO handler...");

        try {
            // Validate MultiversX configuration
            await validateMultiversxConfig(runtime);
            
            // Initialize wallet provider
            const walletProvider = initWalletProvider(runtime);
            const network = runtime.getSetting("MVX_NETWORK") || "mainnet";
            const explorerURL = network === "mainnet" 
                ? "https://explorer.multiversx.com" 
                : `https://${network}-explorer.multiversx.com`;
            
            // Get wallet address
            const address = walletProvider.getAddress();
            const addressBech32 = address.bech32();
            
            // Create API provider for additional queries
            const apiURL = network === "mainnet" 
                ? "https://api.multiversx.com" 
                : `https://${network}-api.multiversx.com`;
            const apiProvider = new ApiNetworkProvider(apiURL, { clientName: "hivex-portfolio" });
            
            // Get EGLD balance
            const balanceRaw = await walletProvider.getBalance();
            
            // Format the balance with proper decimal places (18 decimals for EGLD)
            const balanceInEGLD = (BigInt(balanceRaw) / BigInt(10**18)).toString();
            const remainderInWei = (BigInt(balanceRaw) % BigInt(10**18)).toString().padStart(18, '0');
            const formattedBalance = `${balanceInEGLD}.${remainderInWei.substring(0, 6)}`;
            
            // Get fungible tokens and convert to our generic interface
            const tokensResponse = await apiProvider.getFungibleTokensOfAccount(address);
            const tokens: TokenInfo[] = tokensResponse.map(token => ({
                identifier: token.identifier,
                balance: token.balance.toString(),
                // Extract additional properties if available
                name: (token as any).name || (token as any).tokenName || token.identifier,
                decimals: (token as any).decimals || (token as any).tokenDecimal || 0
            }));
            
            // Get NFTs (limited to first 10 for performance) and convert to our generic interface
            const nftsResponse = await apiProvider.getNonFungibleTokensOfAccount(address, { from: 0, size: 10 });
            const nfts: NftInfo[] = nftsResponse.map(nft => ({
                identifier: nft.identifier,
                collection: nft.collection,
                nonce: nft.nonce,
                name: nft.name || "Unnamed"
            }));
            
            // Format portfolio response
            let portfolioText = `MultiversX Portfolio for ${addressBech32}\n\n`;
            portfolioText += `Network: ${network}\n`;
            portfolioText += `Explorer: ${explorerURL}/accounts/${addressBech32}\n\n`;
            
            // Add EGLD balance
            portfolioText += `EGLD Balance: ${formattedBalance} EGLD\n\n`;
            
            // Add tokens section if tokens exist
            if (tokens.length > 0) {
                portfolioText += `Tokens (${tokens.length}):\n`;
                tokens.forEach(token => {
                    const formattedTokenBalance = formatTokenBalance(token.balance.toString(), token.decimals || 0);
                    portfolioText += `- ${formattedTokenBalance} ${token.identifier} (${token.name || token.identifier})\n`;
                });
                portfolioText += "\n";
            } else {
                portfolioText += "No tokens found\n\n";
            }
            
            // Add NFTs section if NFTs exist
            if (nfts.length > 0) {
                portfolioText += `NFTs (${nfts.length} shown):\n`;
                nfts.forEach(nft => {
                    portfolioText += `- ${nft.collection} #${nft.nonce}: ${nft.name || "Unnamed"}\n`;
                });
                portfolioText += "\n";
            } else {
                portfolioText += "No NFTs found\n\n";
            }
            
            // Add footer with explorer link
            portfolioText += `View complete portfolio on explorer: ${explorerURL}/accounts/${addressBech32}`;
            
            // Prepare portfolio content for callback
            const portfolioContent = {
                address: addressBech32,
                network,
                explorerUrl: `${explorerURL}/accounts/${addressBech32}`,
                egldBalance: formattedBalance,
                tokens: tokens.map(token => ({
                    identifier: token.identifier,
                    name: token.name || token.identifier,
                    balance: token.balance.toString(),
                    decimals: token.decimals || 0,
                    formattedBalance: formatTokenBalance(token.balance.toString(), token.decimals || 0)
                })),
                nfts: nfts.map(nft => ({
                    identifier: nft.identifier,
                    collection: nft.collection,
                    nonce: nft.nonce,
                    name: nft.name || "Unnamed"
                }))
            };
            
            elizaLogger.log("Portfolio information retrieved successfully");
            
            if (callback) {
                callback({
                    text: portfolioText,
                    content: portfolioContent
                });
            }
            
            return true;
        } catch (error) {
            elizaLogger.error("Error retrieving portfolio information");
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error retrieving portfolio information: ${errorMessage}`,
                    content: { error: errorMessage },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me my portfolio",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "MultiversX Portfolio for erd1...\n\nNetwork: mainnet\nExplorer: https://explorer.multiversx.com/accounts/erd1...\n\nEGLD Balance: 10.5 EGLD\n\nTokens (3):\n- 100.5 USDC-c76f1f (USD Coin)\n- 50.0 MEX-455c57 (Maiar Exchange Token)\n- 25.0 RIDE-7d18e9 (holoride Token)\n\nNFTs (2 shown):\n- LKMEX-aab910 #1: Locked MEX\n- EGLD-NFT #42: Special Edition\n\nView complete portfolio on explorer: https://explorer.multiversx.com/accounts/erd1...",
                    action: "GET_PORTFOLIO",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's in my wallet?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "MultiversX Portfolio for erd1...\n\nNetwork: mainnet\nExplorer: https://explorer.multiversx.com/accounts/erd1...\n\nEGLD Balance: 5.2 EGLD\n\nTokens (1):\n- 1000.0 USDC-c76f1f (USD Coin)\n\nNo NFTs found\n\nView complete portfolio on explorer: https://explorer.multiversx.com/accounts/erd1...",
                    action: "GET_PORTFOLIO",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

/**
 * Helper function to format token balances with proper decimal places
 * @param balance The raw token balance as a string
 * @param decimals The number of decimal places for the token
 * @returns Formatted token balance as a string
 */
function formatTokenBalance(balance: string, decimals: number): string {
    if (decimals === 0) return balance;
    
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    
    const wholePart = (balanceBigInt / divisor).toString();
    const fractionalPart = (balanceBigInt % divisor).toString().padStart(decimals, '0');
    
    // Trim trailing zeros in fractional part
    const trimmedFractionalPart = fractionalPart.replace(/0+$/, '');
    
    if (trimmedFractionalPart.length === 0) {
        return wholePart;
    }
    
    return `${wholePart}.${trimmedFractionalPart}`;
}
