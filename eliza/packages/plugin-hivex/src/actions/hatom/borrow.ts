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

// Define the interface for borrow content
export interface BorrowLendingContent extends Content {
    token: string;
    amount: string;
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

function isBorrowLendingContent(
    _runtime: IAgentRuntime,
    content: any
): content is BorrowLendingContent {
    return (
        typeof content.token === "string" &&
        typeof content.amount === "string"
    );
}

const borrowLendingTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "token": "USDC",
    "amount": "10"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested lending borrow operation:
- Token to borrow (e.g., EGLD, USDC)
- Amount to borrow

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for borrow lending content
const borrowLendingSchema = z.object({
    token: z.string(),
    amount: z.string(),
});

/**
 * Helper function to properly format token balance with correct decimal places
 * @param balance The raw token balance as a string (in smallest units)
 * @param decimals The number of decimal places for the token
 * @returns Formatted token balance as a string with proper decimal places
 */
function formatTokenBalance(balance: string, decimals: number): string {
    // Handle zero balance cases
    if (balance === '0' || balance === '' || !balance) return '0';
    
    try {
        // Convert to BigInt for precise calculations
        const balanceBigInt = BigInt(balance);
        if (balanceBigInt === BigInt(0)) return '0';
        
        // For zero decimals, return the balance as is
        if (decimals === 0) return balanceBigInt.toString();
        
        // Calculate divisor based on decimals
        const divisor = BigInt(10 ** decimals);
        
        // Calculate whole and fractional parts
        const wholePart = (balanceBigInt / divisor).toString();
        
        // Handle the fractional part with proper padding
        let fractionalPart = (balanceBigInt % divisor).toString().padStart(decimals, '0');
        
        // Trim trailing zeros in fractional part
        fractionalPart = fractionalPart.replace(/0+$/, '');
        
        // Return formatted balance
        if (fractionalPart === '') {
            return wholePart;
        } else {
            return `${wholePart}.${fractionalPart}`;
        }
    } catch (error) {
        elizaLogger.error(`Error formatting token balance: ${error.message}`);
        return balance; // Return original balance if formatting fails
    }
}

/**
 * Borrow tokens from the Hatom lending protocol
 * This action allows users to borrow tokens from Hatom using their supplied collateral
 */
const borrowAction: Action = {
    name: "BORROW_LENDING",
    similes: [
        "BORROW_TOKENS",
        "BORROW_FROM_HATOM",
        "BORROW_FROM_LENDING",
        "TAKE_LOAN",
        "GET_LOAN",
        "HATOM_BORROW",
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
    description: "Borrow tokens from the Hatom lending protocol",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting BORROW_LENDING handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose borrow lending context
        const borrowLendingContext = composeContext({
            state,
            template: borrowLendingTemplate,
        });

        // Generate borrow lending content
        const content = await generateObject({
            runtime,
            context: borrowLendingContext,
            modelClass: ModelClass.SMALL,
            schema: borrowLendingSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate borrow lending content
        if (!isBorrowLendingContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for BORROW_LENDING action.");
            if (callback) {
                callback({
                    text: "Unable to process borrowing request. Invalid content provided.",
                    content: { error: "Invalid borrow lending content" },
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
                // Parse the requested amount
                const amountValue = parseFloat(contentData.amount);
                elizaLogger.info(`Requested borrow amount: ${amountValue}`);
                
                // Get token decimals (default to 18 for EGLD, 6 for stablecoins)
                let tokenDecimals = 18;
                if (token === "EGLD") {
                    tokenDecimals = 18;
                } else if (token === "USDC" || token === "USDT") {
                    tokenDecimals = 6;
                }
                
                // Convert amount to the smallest unit
                const amountInSmallestUnit = denominateAmount({ 
                    amount: amountValue.toString(), 
                    decimals: tokenDecimals
                });
                elizaLogger.info(`Borrow amount in smallest unit: ${amountInSmallestUnit}`);
                
                // Check if the user has added collateral before borrowing
                try {
                    // We'll check for hTokens of the same type or any other supported token
                    let hasCollateral = false;
                    
                    // Check for all possible collateral tokens
                    for (const supportedToken of Object.keys(networkConfig.markets)) {
                        try {
                            const hTokenId = networkConfig.markets[supportedToken].tokenId;
                            const hTokenInfo = await apiProvider.getFungibleTokenOfAccount(
                                address,
                                hTokenId
                            );
                            
                            if (hTokenInfo && hTokenInfo.balance && hTokenInfo.balance.toString() !== "0") {
                                hasCollateral = true;
                                elizaLogger.info(`Found collateral: ${hTokenId} with balance ${hTokenInfo.balance.toString()}`);
                                break;
                            }
                        } catch (error) {
                            // Continue checking other tokens
                            elizaLogger.debug(`No ${supportedToken} collateral found: ${error.message}`);
                        }
                    }
                    
                    if (!hasCollateral) {
                        if (callback) {
                            callback({
                                text: `Error: You need to supply tokens and add them as collateral before borrowing. Please supply some tokens first, then add them as collateral.`,
                                content: { error: "No collateral found" },
                            });
                        }
                        return false;
                    }
                } catch (error) {
                    elizaLogger.warn(`Error checking for collateral: ${error.message}`);
                    // Continue with the borrow operation, the contract will reject if there's no collateral
                }
                
                // Format the amount as a hex string with even number of characters
                const amountBigInt = BigInt(amountInSmallestUnit);
                let amountHex = amountBigInt.toString(16);
                // Ensure even number of characters by padding with a leading zero if needed
                if (amountHex.length % 2 !== 0) {
                    amountHex = '0' + amountHex;
                }
                elizaLogger.info(`Borrow amount in hex: ${amountHex}`);
                
                // For borrowing, we call the "borrow" function on the market contract
                const borrowHex = Buffer.from("borrow").toString('hex');
                
                // Create the transaction data
                const dataString = `${borrowHex}@${amountHex}`;
                elizaLogger.info(`Transaction data: ${dataString}`);
                
                // Create the transaction
                const transaction = new Transaction({
                    value: '0', // No EGLD value for borrowing
                    sender: address,
                    receiver: new Address(market.address),
                    gasLimit: 30000000, // Higher gas limit for borrow operations
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
                
                elizaLogger.info(`Borrow transaction sent: ${txHash}`);
                
                if (callback) {
                    callback({
                        text: `Successfully initiated borrowing of ${amountValue} ${token} from Hatom lending protocol.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                        content: { 
                            success: true,
                            txHash,
                            explorerUrl: `${explorerURL}/transactions/${txHash}`,
                            token,
                            amount: amountValue.toString()
                        },
                    });
                }
                
                return true;
            } catch (error) {
                elizaLogger.error(`Error in borrow operation: ${error.message}`);
                if (callback) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    callback({
                        text: `Error borrowing ${token}: ${errorMessage}\n\nMake sure you have sufficient collateral supplied to Hatom before borrowing.`,
                        content: { error: errorMessage },
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error(`Error borrowing tokens: ${error.message || "Unknown error"}`);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error borrowing tokens: ${errorMessage}`,
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
                    text: "Borrow 10 USDC from Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated borrowing of 10 USDC from Hatom lending protocol.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "BORROW_LENDING",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Take a loan of 0.1 EGLD from Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated borrowing of 0.1 EGLD from Hatom lending protocol.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "BORROW_LENDING",
                },
            },
        ],
    ] as ActionExample[][],
};

export default borrowAction; 