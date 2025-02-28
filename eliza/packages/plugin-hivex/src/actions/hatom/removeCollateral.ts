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
import { initWalletProvider } from "../../providers/wallet";
import { validateMultiversxConfig } from "../../enviroment";
import { z } from "zod";
import { 
    Address, 
    Transaction,
} from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-core";

// Define the interface for remove collateral content
export interface RemoveCollateralContent extends Content {
    token: string;
}

// Network-specific configuration for Hatom contracts
// Reusing the same configuration from other Hatom actions
const HATOM_CONFIG = {
    mainnet: {
        markets: {
            "EGLD": {
                address: "erd1qqqqqqqqqqqqqpgq35qkf34a8svu4r2zmfzuztmeltqclapv78ss5jleq3",
                tokenId: "HEGLD-d61095"
            },
            "USDC": {
                address: "erd1qqqqqqqqqqqqqpgqmk0kj2yd0nd4c5vl9dvfppa6xps8h842xc5qhfy0u0",
                tokenId: "HUSDC-188be9"
            },
            "USDT": {
                address: "erd1qqqqqqqqqqqqqpgqhe7s6vd5xmwevf3xgy7kgqpuhzk7z582xc5qn58j2r",
                tokenId: "HUSDT-ebfcfb"
            },
            "WEGLD": {
                address: "erd1qqqqqqqqqqqqqpgqra5k35eapz3sehgq60esqj2y9wnk5ld9xc5q7htjmp",
                tokenId: "HWEGLD-c13a4e"
            }
        },
        controllerAddress: "erd1qqqqqqqqqqqqqpgqfj3z3k4vlq7dc2928rxez0uhhlq46s6p4mtqerlxhc",
        chainId: "1"
    },
    devnet: {
        markets: {
            "EGLD": {
                address: "erd1qqqqqqqqqqqqqpgq35qkf34a8svu4r2zmfzuztmeltqclapv78ss5jleq3",
                tokenId: "HEGLD-d61095"
            },
            "USDC": {
                address: "erd1qqqqqqqqqqqqqpgqmk0kj2yd0nd4c5vl9dvfppa6xps8h842xc5qhfy0u0",
                tokenId: "HUSDC-188be9"
            }
        },
        controllerAddress: "erd1qqqqqqqqqqqqqpgqfj3z3k4vlq7dc2928rxez0uhhlq46s6p4mtqerlxhc",
        chainId: "D"
    },
    testnet: {
        markets: {
            "EGLD": {
                address: "erd1qqqqqqqqqqqqqpgq35qkf34a8svu4r2zmfzuztmeltqclapv78ss5jleq3",
                tokenId: "HEGLD-d61095"
            }
        },
        controllerAddress: "erd1qqqqqqqqqqqqqpgqfj3z3k4vlq7dc2928rxez0uhhlq46s6p4mtqerlxhc",
        chainId: "T"
    }
};

function isRemoveCollateralContent(
    _runtime: IAgentRuntime,
    content: any
): content is RemoveCollateralContent {
    return (
        typeof content.token === "string"
    );
}

const removeCollateralTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "token": "EGLD"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested collateral removal operation:
- Base token type to remove as collateral (e.g., EGLD, USDC) - Note that this will remove your hTokens (like HEGLD) from being used as collateral

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for remove collateral content
const removeCollateralSchema = z.object({
    token: z.string(),
});

/**
 * Remove collateral for a token in the Hatom lending protocol
 * This action allows users to remove their hTokens (like HEGLD) from being used as collateral for borrowing
 * Note that this does not withdraw the tokens - it just stops them from being used as collateral
 */
const removeCollateralAction: Action = {
    name: "REMOVE_COLLATERAL",
    similes: [
        "REMOVE_COLLATERAL_HATOM",
        "DISABLE_COLLATERAL",
        "DEACTIVATE_COLLATERAL",
        "UNSET_AS_COLLATERAL",
        "DISABLE_TOKEN_COLLATERAL",
        "HATOM_REMOVE_COLLATERAL",
        "STOP_USING_AS_COLLATERAL",
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
    description: "Remove hTokens from being used as collateral in the Hatom lending protocol",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting REMOVE_COLLATERAL handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose remove collateral context
        const removeCollateralContext = composeContext({
            state,
            template: removeCollateralTemplate,
        });

        // Generate remove collateral content
        const content = await generateObject({
            runtime,
            context: removeCollateralContext,
            modelClass: ModelClass.SMALL,
            schema: removeCollateralSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate remove collateral content
        if (!isRemoveCollateralContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for REMOVE_COLLATERAL action.");
            if (callback) {
                callback({
                    text: "Unable to process collateral removal request. Invalid content provided.",
                    content: { error: "Invalid remove collateral content" },
                });
            }
            return false;
        }

        try {
            // Validate MultiversX configuration
            await validateMultiversxConfig(runtime);
            
            // Initialize wallet provider
            const walletProvider = initWalletProvider(runtime);
            const network = runtime.getSetting("MVX_NETWORK") || "mainnet";
            const apiURL = network === "mainnet" 
                ? "https://api.multiversx.com" 
                : `https://${network}-api.multiversx.com`;
            const explorerURL = network === "mainnet" 
                ? "https://explorer.multiversx.com" 
                : `https://${network}-explorer.multiversx.com`;
            
            // Get network config
            const networkConfig = HATOM_CONFIG[network] || HATOM_CONFIG.mainnet;
            
            // Create API provider
            const apiProvider = new ApiNetworkProvider(apiURL, { clientName: "hivex-hatom" });
            
            // Get wallet address
            const address = walletProvider.getAddress();
            
            // Normalize token identifier
            let token = contentData.token.toUpperCase();
            
            // Check if the token is supported
            if (!networkConfig.markets[token]) {
                if (callback) {
                    callback({
                        text: `Error: Token ${token} is not supported by Hatom on ${network}. Supported tokens are: ${Object.keys(networkConfig.markets).join(", ")}`,
                        content: { error: `Unsupported token: ${token}` },
                    });
                }
                return false;
            }
            
            // Get market details
            const market = networkConfig.markets[token];
            
            try {
                // Check if the user has hTokens set as collateral
                try {
                    const hTokenId = market.tokenId;
                    const hTokenInfo = await apiProvider.getFungibleTokenOfAccount(
                        address,
                        hTokenId
                    );
                    
                    // Check if the balance is zero (convert to string for comparison)
                    const hTokenBalance = hTokenInfo.balance.toString();
                    elizaLogger.info(`hToken balance: ${hTokenBalance}`);
                    
                    if (hTokenBalance === "0") {
                        elizaLogger.warn(`No ${hTokenId} tokens found in wallet. User may not have any collateral to remove.`);
                        if (callback) {
                            callback({
                                text: `You don't have any ${hTokenId} tokens in your wallet. You may not have any ${token} collateral to remove.`,
                                content: { error: `No ${hTokenId} tokens found` },
                            });
                        }
                        return false;
                    }
                } catch (tokenError) {
                    elizaLogger.warn(`Error checking for hToken balance: ${tokenError.message}`);
                    // Continue with the removal operation, the contract will reject if there's no collateral
                }
                
                // Get the hToken details
                const hTokenId = market.tokenId;
                elizaLogger.info(`Using hToken ID: ${hTokenId}`);
                
                // For removing collateral, we need to call the "exitMarket" function on the controller contract
                const exitMarketHex = Buffer.from("exitMarket").toString('hex');
                
                // Format the market address for the exitMarket function
                // We need to encode the market address in the correct format
                const marketAddressBytes = Buffer.from(market.address);
                let marketAddressHex = '';
                for (let i = 0; i < marketAddressBytes.length; i++) {
                    marketAddressHex += marketAddressBytes[i].toString(16).padStart(2, '0');
                }
                
                // Create the transaction data
                const dataString = `${exitMarketHex}@${marketAddressHex}`;
                elizaLogger.info(`Transaction data: ${dataString}`);
                
                // Create the transaction
                const transaction = new Transaction({
                    value: '0', // No EGLD value for this operation
                    sender: address,
                    receiver: new Address(networkConfig.controllerAddress),
                    gasLimit: 150000000, // Based on the example transaction
                    chainID: networkConfig.chainId,
                    data: Buffer.from(dataString),
                });
                
                // Get the account nonce
                const account = await apiProvider.getAccount(address);
                transaction.nonce = BigInt(account.nonce);
                
                // Sign and send the transaction
                const signature = await walletProvider.signTransaction(transaction);
                transaction.signature = signature;
                const txHash = await apiProvider.sendTransaction(transaction);
                
                elizaLogger.info(`Remove collateral transaction sent: ${txHash}`);
                
                if (callback) {
                    callback({
                        text: `Successfully removed ${hTokenId} tokens from being used as collateral in the Hatom lending protocol. These hTokens will no longer be used as collateral for borrowing.\n\nNote: This does not withdraw your tokens. To get your ${token} back, you'll need to redeem your ${hTokenId} tokens using the withdraw action.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                        content: { 
                            success: true,
                            txHash,
                            explorerUrl: `${explorerURL}/transactions/${txHash}`,
                            token,
                            hTokenId
                        },
                    });
                }
                
                return true;
            } catch (error) {
                elizaLogger.error(`Error in remove collateral operation: ${error.message}`);
                
                // Check if the user has active borrows that depend on this collateral
                if (error.message && error.message.includes("Rejection code: 'user has outstanding borrow balance'")) {
                    if (callback) {
                        callback({
                            text: `Error: You cannot remove ${token} as collateral because you have outstanding borrows that depend on it. Please repay your borrows first before removing this collateral.`,
                            content: { 
                                error: "Outstanding borrow balance",
                                solution: `Repay your borrows first before removing ${token} as collateral`
                            },
                        });
                    }
                    return false;
                }
                
                if (callback) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    callback({
                        text: `Error removing ${token} as collateral: ${errorMessage}. Please try again later.`,
                        content: { error: errorMessage },
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error(`Error removing collateral: ${error.message || "Unknown error"}`);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error removing collateral: ${errorMessage}`,
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
                    text: "Remove EGLD as collateral on Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully removed HEGLD-d61095 tokens from being used as collateral in the Hatom lending protocol. These hTokens will no longer be used as collateral for borrowing.\n\nNote: This does not withdraw your tokens. To get your EGLD back, you'll need to redeem your HEGLD-d61095 tokens using the withdraw action.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "REMOVE_COLLATERAL",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Disable USDC as collateral in Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully removed HUSDC-188be9 tokens from being used as collateral in the Hatom lending protocol. These hTokens will no longer be used as collateral for borrowing.\n\nNote: This does not withdraw your tokens. To get your USDC back, you'll need to redeem your HUSDC-188be9 tokens using the withdraw action.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "REMOVE_COLLATERAL",
                },
            },
        ],
    ] as ActionExample[][],
};

export default removeCollateralAction; 