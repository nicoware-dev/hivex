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

// Define the interface for withdraw content
export interface WithdrawLendingContent extends Content {
    token: string;
    amount: string;
}

// Network-specific configuration for Hatom contracts
// Reusing the same configuration from supply.ts
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

function isWithdrawLendingContent(
    _runtime: IAgentRuntime,
    content: any
): content is WithdrawLendingContent {
    return (
        typeof content.token === "string" &&
        typeof content.amount === "string"
    );
}

const withdrawLendingTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "token": "EGLD",
    "amount": "0.1"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested lending withdrawal operation:
- Token to withdraw (e.g., EGLD, USDC)
- Amount to withdraw

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for withdraw lending content
const withdrawLendingSchema = z.object({
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
 * Withdraw tokens from the Hatom lending protocol
 * This action allows users to withdraw their supplied tokens from the Hatom lending protocol
 */
const withdrawAction: Action = {
    name: "WITHDRAW_LENDING",
    similes: [
        "WITHDRAW_TOKENS",
        "REDEEM_LENDING",
        "WITHDRAW_HATOM",
        "REDEEM_HATOM",
        "WITHDRAW_FROM_HATOM",
        "REDEEM_FROM_HATOM",
        "WITHDRAW_SUPPLY",
        "REDEEM_SUPPLY",
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
    description: "Withdraw tokens from the Hatom lending protocol",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting WITHDRAW_LENDING handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose withdraw lending context
        const withdrawLendingContext = composeContext({
            state,
            template: withdrawLendingTemplate,
        });

        // Generate withdraw lending content
        const content = await generateObject({
            runtime,
            context: withdrawLendingContext,
            modelClass: ModelClass.SMALL,
            schema: withdrawLendingSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate withdraw lending content
        if (!isWithdrawLendingContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for WITHDRAW_LENDING action.");
            if (callback) {
                callback({
                    text: "Unable to process withdrawal request. Invalid content provided.",
                    content: { error: "Invalid withdraw lending content" },
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
                // Get the hToken details
                const hTokenId = market.tokenId;
                elizaLogger.info(`Using hToken ID: ${hTokenId}`);
                
                // Check if the user has enough hTokens
                try {
                    const hTokenInfo = await apiProvider.getFungibleTokenOfAccount(
                        address,
                        hTokenId
                    );
                    
                    const hTokenDecimals = (hTokenInfo as any).decimals || 18;
                    elizaLogger.info(`hToken decimals: ${hTokenDecimals}`);
                    
                    // Get the user's actual hToken balance
                    const hTokenBalance = hTokenInfo.balance.toString();
                    elizaLogger.info(`User's hToken balance: ${hTokenBalance}`);
                    
                    // Format the hToken balance for display
                    const formattedHTokenBalance = formatTokenBalance(hTokenBalance, hTokenDecimals);
                    elizaLogger.info(`User's formatted hToken balance: ${formattedHTokenBalance}`);
                    
                    // Parse the requested amount
                    const amountValue = parseFloat(contentData.amount);
                    elizaLogger.info(`Requested amount: ${amountValue}`);
                    
                    // Convert requested EGLD amount to the smallest unit
                    const requestedEgldInSmallestUnit = denominateAmount({ 
                        amount: amountValue.toString(), 
                        decimals: 18  // EGLD always has 18 decimals
                    });
                    elizaLogger.info(`Requested EGLD in smallest unit: ${requestedEgldInSmallestUnit}`);
                    
                    // IMPORTANT: For Hatom, we need to use the actual hToken balance for the withdrawal
                    // Instead of trying to convert EGLD to HEGLD, we'll use the hToken balance directly
                    
                    // Log the available hToken balance for withdrawal
                    elizaLogger.info(`Available hToken balance for withdrawal: ${hTokenBalance}`);
                    
                    // Create a transaction for withdrawing tokens using the actual hToken balance
                    // For withdrawal, we need to send hTokens to the market contract with the "redeem" function
                    const redeemHex = Buffer.from("redeem").toString('hex');
                    
                    // Format the token amount as a hex string with even number of characters
                    // Convert to BigInt first to ensure proper handling of large numbers
                    const hTokenBalanceBigInt = BigInt(hTokenBalance);
                    // Convert to hex and remove '0x' prefix if present
                    let hTokenBalanceHex = hTokenBalanceBigInt.toString(16);
                    // Ensure even number of characters by padding with a leading zero if needed
                    if (hTokenBalanceHex.length % 2 !== 0) {
                        hTokenBalanceHex = '0' + hTokenBalanceHex;
                    }
                    elizaLogger.info(`hToken balance in hex: ${hTokenBalanceHex}`);
                    
                    // Use the properly formatted hex token amount
                    const dataString = `ESDTTransfer@${Buffer.from(hTokenId).toString('hex')}@${hTokenBalanceHex}@${redeemHex}`;
                    elizaLogger.info(`Transaction data: ${dataString}`);
                    
                    // Create the transaction
                    const transaction = new Transaction({
                        value: '0', // No EGLD value for token transfers
                        sender: address,
                        receiver: new Address(market.address),
                        gasLimit: 20000000, // Based on the example transaction
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
                    
                    elizaLogger.info(`Withdraw transaction sent: ${txHash}`);
                    
                    // Calculate the approximate EGLD equivalent for display purposes
                    // This is just an estimate based on the hToken balance
                    const approximateEgldAmount = formattedHTokenBalance;
                    
                    if (callback) {
                        callback({
                            text: `Successfully initiated withdrawal of all your available balance from Hatom lending protocol. You are redeeming ${formattedHTokenBalance} ${hTokenId} tokens, which is approximately ${approximateEgldAmount} EGLD.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                            content: { 
                                success: true,
                                txHash,
                                explorerUrl: `${explorerURL}/transactions/${txHash}`,
                                token,
                                amount: approximateEgldAmount,
                                hTokenAmount: formattedHTokenBalance,
                                hTokenId
                            },
                        });
                    }
                    
                    return true;
                } catch (tokenError) {
                    elizaLogger.error(`Error fetching hToken info: ${tokenError.message}`);
                    
                    // Check if the error is related to the token not being found
                    const errorMessage = tokenError.message || "";
                    const isNotFoundError = errorMessage.includes("not found") || 
                                           errorMessage.includes("aborted") ||
                                           errorMessage.includes("Request error");
                    
                    if (callback) {
                        if (isNotFoundError) {
                            callback({
                                text: `Error: Could not find ${hTokenId} tokens in your wallet. You need to have these tokens to withdraw ${token} from Hatom.\n\nTo get ${hTokenId} tokens, you first need to supply ${token} to Hatom using the "Supply ${token} to Hatom" action.`,
                                content: { 
                                    error: `No ${hTokenId} tokens found`,
                                    solution: `Supply ${token} to Hatom first to receive ${hTokenId} tokens`
                                },
                            });
                        } else {
                            callback({
                                text: `Error fetching token information: ${errorMessage}. Please try again later.`,
                                content: { error: errorMessage },
                            });
                        }
                    }
                    return false;
                }
            } catch (marketError) {
                elizaLogger.error(`Error with market address: ${marketError.message}`);
                if (callback) {
                    callback({
                        text: `Error: There was an issue with the Hatom market for ${token}. Please try again later.`,
                        content: { error: marketError.message },
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error(`Error withdrawing tokens: ${error.message || "Unknown error"}`);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error withdrawing tokens: ${errorMessage}`,
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
                    text: "Withdraw 0.1 EGLD from Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated withdrawal of 0.1 EGLD from Hatom lending protocol. You are redeeming 0.1 HEGLD-d61095 tokens.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "WITHDRAW_LENDING",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Redeem 10 USDC from Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated withdrawal of 10 USDC from Hatom lending protocol. You are redeeming 10 HUSDC-188be9 tokens.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "WITHDRAW_LENDING",
                },
            },
        ],
    ] as ActionExample[][],
};

export default withdrawAction; 