import {
    elizaLogger,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    generateObject,
    type Action,
} from "@elizaos/core";
import { validateMultiversxConfig } from "../../enviroment";
import { Address } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-core";
import { z } from "zod";

export interface AccountInfoContent extends Content {
    address: string;
}

function isAccountInfoContent(
    _runtime: IAgentRuntime,
    content: any
): content is AccountInfoContent {
    return typeof content.address === "string";
}

const accountInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "address": "erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested account:
- MultiversX wallet address to query

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for account info content
const accountInfoSchema = z.object({
    address: z.string(),
});

export default {
    name: "GET_ACCOUNT_INFO",
    similes: [
        "ACCOUNT_INFO",
        "WALLET_INFO",
        "CHECK_ACCOUNT",
        "CHECK_WALLET",
        "LOOKUP_ACCOUNT",
        "LOOKUP_WALLET",
        "FIND_ACCOUNT",
        "FIND_WALLET",
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
    description: "Get detailed information about any MultiversX account",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting GET_ACCOUNT_INFO handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose account info context
        const accountInfoContext = composeContext({
            state,
            template: accountInfoTemplate,
        });

        // Generate account info content
        const content = await generateObject({
            runtime,
            context: accountInfoContext,
            modelClass: ModelClass.SMALL,
            schema: accountInfoSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate account info content
        if (!isAccountInfoContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for GET_ACCOUNT_INFO action.");
            if (callback) {
                callback({
                    text: "Unable to process account info request. Invalid content provided.",
                    content: { error: "Invalid account info content" },
                });
            }
            return false;
        }

        try {
            // Validate MultiversX configuration
            await validateMultiversxConfig(runtime);
            
            // Get network configuration
            const network = runtime.getSetting("MVX_NETWORK") || "mainnet";
            const apiURL = network === "mainnet" 
                ? "https://api.multiversx.com" 
                : `https://${network}-api.multiversx.com`;
            const explorerURL = network === "mainnet" 
                ? "https://explorer.multiversx.com" 
                : `https://${network}-explorer.multiversx.com`;
            
            // Create API provider
            const apiProvider = new ApiNetworkProvider(apiURL, { clientName: "hivex-explorer" });
            
            // Validate address format
            let address: Address;
            try {
                address = new Address(contentData.address);
            } catch (error) {
                if (callback) {
                    callback({
                        text: `Invalid MultiversX address format: ${contentData.address}`,
                        content: { error: "Invalid address format" },
                    });
                }
                return false;
            }
            
            // Fetch account information
            const account = await apiProvider.getAccount(address);
            
            // Format EGLD balance with proper decimal places (18 decimals for EGLD)
            const balanceRaw = account.balance.toString();
            const balanceInEGLD = (BigInt(balanceRaw) / BigInt(10**18)).toString();
            const remainderInWei = (BigInt(balanceRaw) % BigInt(10**18)).toString().padStart(18, '0');
            const formattedBalance = `${balanceInEGLD}.${remainderInWei.substring(0, 6)}`;
            
            // Get tokens (limited to first 10)
            const tokens = await apiProvider.getFungibleTokensOfAccount(address, { from: 0, size: 10 });
            
            // Format account info response
            let accountInfoText = `MultiversX Account Information for ${address.bech32()}\n\n`;
            accountInfoText += `Network: ${network}\n`;
            accountInfoText += `Explorer: ${explorerURL}/accounts/${address.bech32()}\n\n`;
            
            // Add account details
            accountInfoText += `EGLD Balance: ${formattedBalance} EGLD\n`;
            accountInfoText += `Nonce: ${account.nonce}\n`;
            
            // Add shard information
            const shardId = (account as any).shard || "Unknown";
            accountInfoText += `Shard: ${shardId}\n\n`;
            
            // Add tokens section if tokens exist
            if (tokens.length > 0) {
                accountInfoText += `Tokens (${tokens.length > 10 ? '10 of ' + tokens.length : tokens.length}):\n`;
                tokens.forEach(token => {
                    const tokenBalance = token.balance.toString();
                    const tokenDecimals = (token as any).decimals || 0;
                    const formattedTokenBalance = formatTokenBalance(tokenBalance, tokenDecimals);
                    accountInfoText += `- ${formattedTokenBalance} ${token.identifier}\n`;
                });
                accountInfoText += "\n";
            }
            
            // Add footer with explorer link
            accountInfoText += `View complete account details on explorer: ${explorerURL}/accounts/${address.bech32()}`;
            
            // Prepare account info content for callback
            const accountInfoContent = {
                address: address.bech32(),
                network,
                explorerUrl: `${explorerURL}/accounts/${address.bech32()}`,
                balance: formattedBalance,
                nonce: account.nonce.toString(),
                shard: shardId,
                tokens: tokens.slice(0, 10).map(token => ({
                    identifier: token.identifier,
                    balance: token.balance.toString(),
                })),
            };
            
            elizaLogger.log("Account information retrieved successfully");
            
            if (callback) {
                callback({
                    text: accountInfoText,
                    content: accountInfoContent,
                });
            }
            
            return true;
        } catch (error) {
            elizaLogger.error("Error retrieving account information");
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error retrieving account information: ${errorMessage}`,
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
                    text: "Get info for wallet erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "MultiversX Account Information for erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th\n\nNetwork: mainnet\nExplorer: https://explorer.multiversx.com/accounts/erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th\n\nEGLD Balance: 245.123456 EGLD\nNonce: 42\nShard: 1\n\nTokens (3):\n- 1000.5 USDC-c76f1f\n- 50.0 MEX-455c57\n- 25.0 RIDE-7d18e9\n\nView complete account details on explorer: https://explorer.multiversx.com/accounts/erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th",
                    action: "GET_ACCOUNT_INFO",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check this address: erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "MultiversX Account Information for erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx\n\nNetwork: mainnet\nExplorer: https://explorer.multiversx.com/accounts/erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx\n\nEGLD Balance: 1.5 EGLD\nNonce: 7\nShard: 0\n\nNo tokens found\n\nView complete account details on explorer: https://explorer.multiversx.com/accounts/erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx",
                    action: "GET_ACCOUNT_INFO",
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