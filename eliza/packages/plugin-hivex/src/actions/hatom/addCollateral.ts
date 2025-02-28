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
import BigNumber from "bignumber.js";

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

// Define the interface for add collateral content
export interface AddCollateralContent extends Content {
    token: string;
    amount?: string; // Make amount optional
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
        controllerAddress: "erd1qqqqqqqqqqqqqpgqxp28qpnv7rfcmk6qrgxgw5uf2fnp84ar78ssqdk6hr",
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
        controllerAddress: "erd1qqqqqqqqqqqqqpgqxp28qpnv7rfcmk6qrgxgw5uf2fnp84ar78ssqdk6hr",
        chainId: "D"
    },
    testnet: {
        markets: {
            "EGLD": {
                address: "erd1qqqqqqqqqqqqqpgq35qkf34a8svu4r2zmfzuztmeltqclapv78ss5jleq3",
                tokenId: "HEGLD-d61095"
            }
        },
        controllerAddress: "erd1qqqqqqqqqqqqqpgqxp28qpnv7rfcmk6qrgxgw5uf2fnp84ar78ssqdk6hr",
        chainId: "T"
    }
};

function isAddCollateralContent(
    _runtime: IAgentRuntime,
    content: any
): content is AddCollateralContent {
    return (
        typeof content.token === "string" &&
        (content.amount === undefined || typeof content.amount === "string")
    );
}

const addCollateralTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "token": "EGLD",
    "amount": "0.05"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested collateral adding operation:
- Token to add as collateral (e.g., EGLD or HEGLD) - Note that you will be using hTokens (like HEGLD) as collateral
- Amount to add as collateral (optional, if not specified, a small default amount will be used)

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for add collateral content
const addCollateralSchema = z.object({
    token: z.string(),
    amount: z.string().optional(),
});

/**
 * Add collateral for a token in the Hatom lending protocol
 * This action allows users to add their hTokens (like HEGLD) as collateral for borrowing
 * Users must have supplied tokens first to receive hTokens before they can be used as collateral
 */
const addCollateralAction: Action = {
    name: "ADD_COLLATERAL",
    similes: [
        "ADD_COLLATERAL_HATOM",
        "USE_AS_COLLATERAL",
        "ACTIVATE_COLLATERAL",
        "SET_AS_COLLATERAL",
        "ENABLE_TOKEN_COLLATERAL",
        "HATOM_ADD_COLLATERAL",
        "ENABLE_COLLATERAL",
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
    description: "Add hTokens as collateral in the Hatom lending protocol",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting ADD_COLLATERAL handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose add collateral context
        const addCollateralContext = composeContext({
            state,
            template: addCollateralTemplate,
        });

        // Generate add collateral content
        const content = await generateObject({
            runtime,
            context: addCollateralContext,
            modelClass: ModelClass.SMALL,
            schema: addCollateralSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate add collateral content
        if (!isAddCollateralContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for ADD_COLLATERAL action.");
            if (callback) {
                callback({
                    text: "Unable to process collateral adding request. Invalid content provided.",
                    content: { error: "Invalid add collateral content" },
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
            
            // Normalize token identifier and handle both base tokens and hTokens
            let token = contentData.token.toUpperCase();
            let baseToken = token;
            
            // Check if the user specified an hToken (like HEGLD) instead of a base token (like EGLD)
            const isHToken = token.startsWith('H') && token.length > 1;
            if (isHToken) {
                // Extract the base token by removing the 'H' prefix
                baseToken = token.substring(1);
                elizaLogger.info(`User specified hToken ${token}, converting to base token ${baseToken}`);
            } else {
                // User specified a base token, check if it's in the format that matches our config
                const matchingTokens = Object.keys(networkConfig.markets).filter(
                    marketToken => marketToken.toUpperCase() === token.toUpperCase()
                );
                
                if (matchingTokens.length > 0) {
                    baseToken = matchingTokens[0]; // Use the correctly cased token from config
                }
            }
            
            // Check if the base token is supported
            if (!networkConfig.markets[baseToken]) {
                if (callback) {
                    callback({
                        text: `Error: Token ${baseToken} is not supported by Hatom on ${network}. Supported tokens are: ${Object.keys(networkConfig.markets).join(", ")}`,
                        content: { error: `Unsupported token: ${baseToken}` },
                    });
                }
                return false;
            }
            
            // Get market details using the base token
            const market = networkConfig.markets[baseToken];
            const hTokenId = market.tokenId;
            
            try {
                // Check if the user has hTokens
                try {
                    const hTokenInfo = await apiProvider.getFungibleTokenOfAccount(
                        address,
                        hTokenId
                    );
                    
                    // Check if the balance is zero (convert to string for comparison)
                    const hTokenBalance = hTokenInfo.balance.toString();
                    elizaLogger.info(`hToken balance: ${hTokenBalance}`);
                    
                    if (hTokenBalance === "0") {
                        elizaLogger.warn(`No ${hTokenId} tokens found in wallet. User may need to supply ${baseToken} first.`);
                        if (callback) {
                            callback({
                                text: `You don't have any ${hTokenId} tokens in your wallet. You need to supply ${baseToken} to Hatom first to receive ${hTokenId} tokens before you can add them as collateral.`,
                                content: { error: `No ${hTokenId} tokens found` },
                            });
                        }
                        return false;
                    }
                    
                    // Create a transaction for adding collateral
                    // We need to send an ESDTTransfer to the controller contract with the enterMarkets function
                    const controllerAddress = networkConfig.controllerAddress;
                    elizaLogger.info(`Using controller address: ${controllerAddress}`);
                    
                    // Determine the amount to use as collateral
                    let transferAmount;
                    let hTokenDecimals = 8; // Default for HEGLD and other hTokens
                    
                    try {
                        const tokenInfo = await apiProvider.getDefinitionOfFungibleToken(hTokenId);
                        hTokenDecimals = (tokenInfo as any).decimals || 8;
                    } catch (error) {
                        elizaLogger.warn(`Error fetching token info for ${hTokenId}, using default decimals: ${hTokenDecimals}`);
                    }
                    
                    if (contentData.amount) {
                        // Convert user-specified amount to the smallest unit
                        const amountValue = parseFloat(contentData.amount);
                        elizaLogger.info(`User requested amount: ${amountValue} ${token}`);
                        
                        // IMPORTANT: Calculate the amount directly to avoid any conversion issues
                        // For 0.1 HEGLD with 8 decimals, this should be 10,000,000 (0.1 * 10^8)
                        transferAmount = Math.floor(amountValue * Math.pow(10, hTokenDecimals)).toString();
                        elizaLogger.info(`Calculated amount in smallest unit: ${transferAmount} (using ${hTokenDecimals} decimals)`);
                    } else {
                        // Use a default small amount if not specified - equivalent to 0.01 hTokens with 8 decimals
                        transferAmount = "1000000"; // 0.01 with 8 decimals
                        elizaLogger.info(`Using default amount: ${transferAmount} (0.01 ${hTokenId})`);
                    }
                    
                    // Make sure the transfer amount doesn't exceed the balance
                    if (BigInt(transferAmount) > BigInt(hTokenBalance)) {
                        elizaLogger.warn(`Requested amount ${transferAmount} exceeds balance ${hTokenBalance}, using full balance instead`);
                        transferAmount = hTokenBalance;
                    }
                    
                    // Double-check the amount is reasonable before proceeding
                    const formattedTransferAmount = formatTokenBalance(transferAmount, hTokenDecimals);
                    elizaLogger.info(`Amount to be used as collateral: ${formattedTransferAmount} ${hTokenId} (${transferAmount} in smallest unit)`);
                    
                    // COMPLETELY REWRITTEN: Create the transaction data string using the 'enterMarkets' method
                    // Convert the hTokenId to hex
                    const hTokenIdHex = Buffer.from(hTokenId).toString('hex');
                    
                    // Convert the enterMarkets function name to hex
                    const enterMarketsHex = Buffer.from("enterMarkets").toString('hex');
                    
                    // Construct the data string with the exact amount we calculated
                    const dataString = `ESDTTransfer@${hTokenIdHex}@${transferAmount}@${enterMarketsHex}`;
                    
                    elizaLogger.info(`Transaction data: ${dataString}`);
                    elizaLogger.info(`Transaction components: Token=${hTokenId}, Amount=${transferAmount}, Function=enterMarkets`);
                    
                    // Create the transaction using the modified data string
                    const transaction = new Transaction({
                        value: '0', // No EGLD value for token transfers
                        sender: address,
                        receiver: new Address(networkConfig.controllerAddress),
                        gasLimit: 120000000, // Adjusted to match the successful transaction example
                        chainID: networkConfig.chainId,
                        data: Buffer.from(dataString),
                    });
                    
                    // Verify the transaction data
                    const txData = transaction.getData().toString();
                    elizaLogger.info(`Final transaction data: ${txData}`);
                    if (!txData.includes(transferAmount)) {
                        elizaLogger.error(`CRITICAL ERROR: Transaction data does not contain the correct amount. Expected ${transferAmount} but got ${txData}`);
                        if (callback) {
                            callback({
                                text: `Error: There was a problem creating the transaction with the correct amount. Please try again.`,
                                content: { error: "Transaction data mismatch" },
                            });
                        }
                        return false;
                    }
                    
                    // Get the account nonce
                    const account = await apiProvider.getAccount(address);
                    transaction.nonce = BigInt(account.nonce);
                    
                    // Sign and send the transaction
                    const signature = await walletProvider.signTransaction(transaction);
                    transaction.signature = signature;
                    const txHash = await apiProvider.sendTransaction(transaction);
                    
                    elizaLogger.info(`Add collateral transaction sent: ${txHash}`);
                    
                    // Format the amount for display
                    const formattedAmount = contentData.amount || formatTokenBalance(transferAmount, hTokenDecimals);
                    
                    if (callback) {
                        callback({
                            text: `Successfully added ${formattedAmount} ${hTokenId} tokens as collateral in the Hatom lending protocol. These hTokens represent your supplied ${baseToken} and can now be used as collateral for borrowing.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                            content: { 
                                success: true,
                                txHash,
                                explorerUrl: `${explorerURL}/transactions/${txHash}`,
                                token: baseToken,
                                hTokenId: hTokenId,
                                amount: formattedAmount,
                                amountInSmallestUnit: transferAmount
                            },
                        });
                    }
                    
                    return true;
                } catch (tokenError) {
                    elizaLogger.error(`Error fetching hToken info: ${tokenError.message}`);
                    
                    // If we can't find the hToken, we'll try a fallback approach
                    if (callback) {
                        callback({
                            text: `Error: Could not find ${hTokenId} tokens in your wallet. You need to supply ${baseToken} to Hatom first to receive ${hTokenId} tokens before you can add them as collateral.`,
                            content: { 
                                error: `No ${hTokenId} tokens found`,
                                solution: `Supply ${baseToken} to Hatom first to receive ${hTokenId} tokens`
                            },
                        });
                    }
                    return false;
                }
            } catch (error) {
                elizaLogger.error(`Error adding collateral: ${error.message || "Unknown error"}`);
                if (callback) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    callback({
                        text: `Error adding collateral: ${errorMessage}`,
                        content: { error: errorMessage },
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error(`Error adding collateral: ${error.message || "Unknown error"}`);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error adding collateral: ${errorMessage}`,
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
                    text: "Add EGLD as collateral on Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully added HEGLD-d61095 tokens as collateral in the Hatom lending protocol. These hTokens represent your supplied EGLD and can now be used as collateral for borrowing.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "ADD_COLLATERAL",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Use my USDC as collateral in Hatom",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully added HUSDC-188be9 tokens as collateral in the Hatom lending protocol. These hTokens represent your supplied USDC and can now be used as collateral for borrowing.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "ADD_COLLATERAL",
                },
            },
        ],
    ] as ActionExample[][],
};

export default addCollateralAction; 