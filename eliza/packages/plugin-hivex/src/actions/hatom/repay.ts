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
    TokenTransfer,
    Token
} from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-core";
import { denominateAmount } from "../../utils/amount";

// Define the interface for repay content
export interface RepayLendingContent extends Content {
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

function isRepayLendingContent(
    _runtime: IAgentRuntime,
    content: any
): content is RepayLendingContent {
    return (
        typeof content.token === "string" &&
        typeof content.amount === "string"
    );
}

const repayLendingTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "token": "USDC",
    "amount": "10"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested lending repay operation:
- Token to repay (e.g., EGLD, USDC)
- Amount to repay

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for repay lending content
const repayLendingSchema = z.object({
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
 * Repay tokens to the Hatom lending protocol
 * This action allows users to repay their borrowed tokens from Hatom
 */
const repayAction: Action = {
    name: "REPAY_LENDING",
    similes: [
        "REPAY_TOKENS",
        "REPAY_LOAN",
        "REPAY_TO_HATOM",
        "REPAY_BORROWED",
        "PAY_BACK_LOAN",
        "HATOM_REPAY",
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
    description: "Repay borrowed tokens to the Hatom lending protocol",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting REPAY_LENDING handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose repay lending context
        const repayLendingContext = composeContext({
            state,
            template: repayLendingTemplate,
        });

        // Generate repay lending content
        const content = await generateObject({
            runtime,
            context: repayLendingContext,
            modelClass: ModelClass.SMALL,
            schema: repayLendingSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate repay lending content
        if (!isRepayLendingContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for REPAY_LENDING action.");
            if (callback) {
                callback({
                    text: "Unable to process repayment request. Invalid content provided.",
                    content: { error: "Invalid repay lending content" },
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
                elizaLogger.info(`Requested repay amount: ${amountValue}`);
                
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
                elizaLogger.info(`Repay amount in smallest unit: ${amountInSmallestUnit}`);
                
                // Check if the user has borrowed this token before repaying
                try {
                    // This is a simplified check - in a production environment, you would query the Hatom protocol
                    // to get the exact borrowed amount for the specific token
                    elizaLogger.info(`Checking if user has borrowed ${token} before repaying...`);
                    
                    // For now, we'll proceed with the repayment and let the contract handle validation
                    // The contract will reject the transaction if there's nothing to repay
                    
                    // In a future implementation, we could add an API call to check the borrowed amount
                    // and validate that the repayment amount doesn't exceed it
                } catch (error) {
                    elizaLogger.warn(`Error checking for borrowed amount: ${error.message}`);
                    // Continue with the repay operation, the contract will reject if there's nothing to repay
                }
                
                // For EGLD repayment, we need to send EGLD directly to the market contract with the "repay" function
                if (token === "EGLD") {
                    // Format the amount as a hex string with even number of characters for the data field
                    const amountBigInt = BigInt(amountInSmallestUnit);
                    let amountHex = amountBigInt.toString(16);
                    // Ensure even number of characters by padding with a leading zero if needed
                    if (amountHex.length % 2 !== 0) {
                        amountHex = '0' + amountHex;
                    }
                    elizaLogger.info(`Repay amount in hex: ${amountHex}`);
                    
                    // For repaying EGLD, we call the "repay" function on the market contract
                    const repayHex = Buffer.from("repay").toString('hex');
                    
                    // Create the transaction data
                    const dataString = `${repayHex}`;
                    elizaLogger.info(`Transaction data: ${dataString}`);
                    
                    // Create the transaction
                    const transaction = new Transaction({
                        value: amountInSmallestUnit, // Send EGLD value for repayment
                        sender: address,
                        receiver: new Address(market.address),
                        gasLimit: 30000000, // Higher gas limit for repay operations
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
                    
                    elizaLogger.info(`Repay transaction sent: ${txHash}`);
                    
                    if (callback) {
                        callback({
                            text: `Successfully initiated repayment of ${amountValue} ${token} to Hatom lending protocol.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
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
                } 
                // For other tokens (USDC, USDT, etc.), we need to use ESDTTransfer
                else {
                    // Format the amount as a hex string with even number of characters
                    const amountBigInt = BigInt(amountInSmallestUnit);
                    let amountHex = amountBigInt.toString(16);
                    // Ensure even number of characters by padding with a leading zero if needed
                    if (amountHex.length % 2 !== 0) {
                        amountHex = '0' + amountHex;
                    }
                    elizaLogger.info(`Repay amount in hex: ${amountHex}`);
                    
                    // For repaying tokens, we use ESDTTransfer with the "repay" function
                    const repayHex = Buffer.from("repay").toString('hex');
                    
                    // Create the transaction data
                    const dataString = `ESDTTransfer@${Buffer.from(token).toString('hex')}@${amountHex}@${repayHex}`;
                    elizaLogger.info(`Transaction data: ${dataString}`);
                    
                    // Create the transaction
                    const transaction = new Transaction({
                        value: '0', // No EGLD value for token transfers
                        sender: address,
                        receiver: new Address(market.address),
                        gasLimit: 30000000, // Higher gas limit for repay operations
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
                    
                    elizaLogger.info(`Repay transaction sent: ${txHash}`);
                    
                    if (callback) {
                        callback({
                            text: `Successfully initiated repayment of ${amountValue} ${token} to Hatom lending protocol.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
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
                }
            } catch (error) {
                elizaLogger.error(`Error in repay operation: ${error.message}`);
                if (callback) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    callback({
                        text: `Error repaying ${token}: ${errorMessage}\n\nMake sure you have sufficient ${token} balance before repaying.`,
                        content: { error: errorMessage },
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error(`Error repaying tokens: ${error.message || "Unknown error"}`);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error repaying tokens: ${errorMessage}`,
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
                    text: "Repay 10 USDC to Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated repayment of 10 USDC to Hatom lending protocol.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "REPAY_LENDING",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Pay back 0.1 EGLD loan to Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated repayment of 0.1 EGLD to Hatom lending protocol.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "REPAY_LENDING",
                },
            },
        ],
    ] as ActionExample[][],
};

export default repayAction; 