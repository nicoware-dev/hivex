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
import { denominateAmount } from "../../utils/amount";

// Define the interface for supply content
export interface SupplyLendingContent extends Content {
    token: string;
    amount: string;
}

// Network-specific configuration for Hatom contracts
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
        chainId: "D"
    },
    testnet: {
        markets: {
            "EGLD": {
                address: "erd1qqqqqqqqqqqqqpgq35qkf34a8svu4r2zmfzuztmeltqclapv78ss5jleq3",
                tokenId: "HEGLD-d61095"
            }
        },
        chainId: "T"
    }
};

function isSupplyLendingContent(
    _runtime: IAgentRuntime,
    content: any
): content is SupplyLendingContent {
    return (
        typeof content.token === "string" &&
        typeof content.amount === "string"
    );
}

const supplyLendingTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "token": "EGLD",
    "amount": "0.1"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested lending supply operation:
- Token to supply (e.g., EGLD, USDC) - You will receive hTokens (like HEGLD) in return
- Amount to supply

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for supply lending content
const supplyLendingSchema = z.object({
    token: z.string(),
    amount: z.string(),
});

/**
 * Supply tokens to the Hatom lending protocol
 * This action allows users to supply tokens to the Hatom lending protocol and earn interest
 * Users receive hTokens (like HEGLD) in return, which represent their position
 */
const supplyAction: Action = {
    name: "SUPPLY_LENDING",
    similes: [
        "LEND_TOKENS",
        "DEPOSIT_LENDING",
        "SUPPLY_HATOM",
        "LEND_HATOM",
        "DEPOSIT_HATOM",
        "MINT_HATOM",
        "SUPPLY_TOKENS",
        "DEPOSIT_TOKENS",
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
    description: "Supply tokens to the Hatom lending protocol",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting SUPPLY_LENDING handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose supply lending context
        const supplyLendingContext = composeContext({
            state,
            template: supplyLendingTemplate,
        });

        // Generate supply lending content
        const content = await generateObject({
            runtime,
            context: supplyLendingContext,
            modelClass: ModelClass.SMALL,
            schema: supplyLendingSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate supply lending content
        if (!isSupplyLendingContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for SUPPLY_LENDING action.");
            if (callback) {
                callback({
                    text: "Unable to process supply request. Invalid content provided.",
                    content: { error: "Invalid supply lending content" },
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
            
            // Convert amount to the smallest unit
            let decimals = 18; // Default for EGLD
            if (token !== "EGLD") {
                try {
                    const tokenInfo = await apiProvider.getDefinitionOfFungibleToken(token);
                    decimals = (tokenInfo as any).decimals || 18;
                } catch (error) {
                    elizaLogger.error(`Error fetching token info for ${token}`);
                }
            }
            
            const amountValue = parseFloat(contentData.amount);
            const amountInSmallestUnit = denominateAmount({ 
                amount: amountValue.toString(), 
                decimals 
            });
            
            // Create a transaction for supplying tokens
            let transaction: Transaction;
            
            try {
                // Create Address from the market address string
                const marketAddress = new Address(market.address);
                elizaLogger.info(`Using market address: ${marketAddress.toString()}`);
                
                if (token === "EGLD") {
                    // For EGLD, we send EGLD directly to the market contract with the "mint" function
                    try {
                        // Ensure the market address is valid by checking its format
                        // The Address constructor would have thrown an error if invalid,
                        // but we'll add an extra check to be safe
                        if (!market.address || market.address.length === 0) {
                            throw new Error(`Invalid market address format: ${market.address}`);
                        }
                        
                        // Create the transaction with proper error handling
                        transaction = new Transaction({
                            value: amountInSmallestUnit,
                            sender: address,
                            receiver: marketAddress,
                            gasLimit: 30000000, // Based on the example transaction
                            chainID: networkConfig.chainId,
                            data: Buffer.from("mint"),
                        });
                        
                        // Get the account nonce
                        const account = await apiProvider.getAccount(address);
                        transaction.nonce = BigInt(account.nonce);
                        
                        // Sign and send the transaction
                        const signature = await walletProvider.signTransaction(transaction);
                        transaction.signature = signature;
                        const txHash = await apiProvider.sendTransaction(transaction);
                        
                        elizaLogger.info(`Supply transaction sent: ${txHash}`);
                        
                        if (callback) {
                            callback({
                                text: `Successfully initiated supply of ${amountValue} ${token} to Hatom lending protocol. You will receive ${market.tokenId} tokens representing your position.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                                content: { 
                                    success: true,
                                    txHash,
                                    explorerUrl: `${explorerURL}/transactions/${txHash}`,
                                    token,
                                    amount: amountValue.toString(),
                                    hTokenId: market.tokenId
                                },
                            });
                        }
                        
                        return true;
                    } catch (txError) {
                        elizaLogger.error(`Error creating or sending transaction: ${txError.message}`);
                        if (callback) {
                            callback({
                                text: `Error: There was a problem with the transaction. ${txError.message}`,
                                content: { error: txError.message },
                            });
                        }
                        return false;
                    }
                } else {
                    // For other tokens, we would use ESDTTransfer
                    // This would be implemented for other tokens like USDC, USDT, etc.
                    if (callback) {
                        callback({
                            text: `Error: Supply for tokens other than EGLD is not yet implemented.`,
                            content: { error: "Not implemented" },
                        });
                    }
                    return false;
                }
            } catch (addressError) {
                elizaLogger.error(`Invalid market address format: ${market.address}. Error: ${addressError.message}`);
                if (callback) {
                    callback({
                        text: `Error: The market address for ${token} is invalid. Please check the configuration.`,
                        content: { error: `Invalid market address: ${market.address}` },
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error(`Error supplying tokens: ${error.message || "Unknown error"}`);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error supplying tokens: ${errorMessage}`,
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
                    text: "Supply 0.1 EGLD to Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated supply of 0.1 EGLD to Hatom lending protocol. You will receive HEGLD-d61095 tokens representing your position.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SUPPLY_LENDING",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Lend 10 USDC on Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated supply of 10 USDC to Hatom lending protocol. You will receive HUSDC-188be9 tokens representing your position.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SUPPLY_LENDING",
                },
            },
        ],
    ] as ActionExample[][],
};

export default supplyAction;
