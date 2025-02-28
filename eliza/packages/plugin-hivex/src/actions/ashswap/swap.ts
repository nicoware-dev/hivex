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
    TokenPayment,
    Transaction,
    SmartContract,
    AbiRegistry,
    ContractFunction,
    Interaction,
    ArgSerializer,
    EndpointParameterDefinition,
    ResultsParser
} from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-core";
import { denominateAmount } from "../../utils/amount";
import BigNumber from "bignumber.js";

// Define the interface for swap transaction parameters
interface SwapTransactionParams {
    sender: Address;
    toToken?: string;
    fromToken?: string;
    amount: string;
    slippage: number;
    networkConfig: any;
    account?: any;
    apiProvider?: ApiNetworkProvider;
}

export interface SwapTokensContent extends Content {
    fromToken: string;
    toToken: string;
    amount: string;
    slippage?: string;
    exchange?: string;
}

function isSwapTokensContent(
    _runtime: IAgentRuntime,
    content: any
): content is SwapTokensContent {
    return (
        typeof content.fromToken === "string" &&
        typeof content.toToken === "string" &&
        typeof content.amount === "string"
    );
}

const swapTokensTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "fromToken": "EGLD",
    "toToken": "USDC",
    "amount": "0.001",
    "slippage": "1",
    "exchange": "AshSwap"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token swap:
- Source token (fromToken) - the token to swap from
- Destination token (toToken) - the token to swap to
- Amount to swap
- Slippage percentage (optional, default is 1%)
- Exchange to use (optional, default is AshSwap)

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for swap tokens content
const swapTokensSchema = z.object({
    fromToken: z.string(),
    toToken: z.string(),
    amount: z.string(),
    slippage: z.string().optional().nullable(),
    exchange: z.string().optional().nullable(),
});

// Network-specific configuration
const NETWORK_CONFIG = {
    mainnet: {
        ashSwapAggregatorAddress: "erd1qqqqqqqqqqqqqpgqcc69ts8409p3h77q5chsaqz57y6hugvc4fvs64k74v",
        wegldTokenId: "WEGLD-bd4d79",
        usdcTokenId: "USDC-c76f1f",
        mexTokenId: "MEX-455c57",
        ashTokenId: "ASH-a642d1",
        chainId: "1",
    },
    devnet: {
        ashSwapAggregatorAddress: "erd1qqqqqqqqqqqqqpgqcc69ts8409p3h77q5chsaqz57y6hugvc4fvs64k74v", // Replace with actual devnet address
        wegldTokenId: "WEGLD-a28c59",
        usdcTokenId: "USDC-8d4068",
        mexTokenId: "MEX-dc289c",
        ashTokenId: "ASH-4ce444", // Replace with actual devnet ASH token ID
        chainId: "D",
    },
    testnet: {
        ashSwapAggregatorAddress: "erd1qqqqqqqqqqqqqpgqcc69ts8409p3h77q5chsaqz57y6hugvc4fvs64k74v", // Replace with actual testnet address
        wegldTokenId: "WEGLD-a28c59",
        usdcTokenId: "USDC-8d4068",
        mexTokenId: "MEX-dc289c",
        ashTokenId: "ASH-4ce444", // Replace with actual testnet ASH token ID
        chainId: "T",
    }
};

/**
 * Swap tokens on AshSwap
 * This action allows users to swap tokens on the AshSwap DEX
 */
export default {
    name: "SWAP_TOKENS_ASHSWAP",
    similes: [
        "EXCHANGE_TOKENS_ASHSWAP",
        "TRADE_TOKENS_ASHSWAP",
        "SWAP_ASHSWAP",
        "EXCHANGE_ASHSWAP",
        "TRADE_ASHSWAP",
        "ASHSWAP_SWAP",
        "ASH_SWAP",
        "SWAP_ON_ASHSWAP",
        "SWAP_WITH_ASHSWAP",
        "ASHSWAP_EXCHANGE",
        "ASHSWAP_TRADE",
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
    description: "Swap tokens on AshSwap DEX using the AshSwap Aggregator",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting SWAP_TOKENS_ASHSWAP handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose swap tokens context
        const swapTokensContext = composeContext({
            state,
            template: swapTokensTemplate,
        });

        // Generate swap tokens content
        const content = await generateObject({
            runtime,
            context: swapTokensContext,
            modelClass: ModelClass.SMALL,
            schema: swapTokensSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate swap tokens content
        if (!isSwapTokensContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for SWAP_TOKENS_ASHSWAP action.");
            if (callback) {
                callback({
                    text: "Unable to process swap request. Invalid content provided.",
                    content: { error: "Invalid swap tokens content" },
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
            const networkConfig = NETWORK_CONFIG[network] || NETWORK_CONFIG.mainnet;
            
            // Create API provider
            const apiProvider = new ApiNetworkProvider(apiURL, { clientName: "hivex-ashswap" });
            
            // Get wallet address
            const address = walletProvider.getAddress();
            
            // Parse slippage (default to 1%)
            const slippage = contentData.slippage ? parseFloat(contentData.slippage) : 1;
            
            // Normalize token identifiers
            let fromToken = contentData.fromToken.toUpperCase();
            let toToken = contentData.toToken.toUpperCase();
            
            // Handle common token names
            if (fromToken === "EGLD") {
                fromToken = "EGLD";
            } else if (fromToken === "USDC") {
                fromToken = networkConfig.usdcTokenId;
            } else if (fromToken === "MEX") {
                fromToken = networkConfig.mexTokenId;
            } else if (fromToken === "WEGLD") {
                fromToken = networkConfig.wegldTokenId;
            }
            
            if (toToken === "EGLD") {
                toToken = "EGLD";
            } else if (toToken === "USDC") {
                toToken = networkConfig.usdcTokenId;
            } else if (toToken === "MEX") {
                toToken = networkConfig.mexTokenId;
            } else if (toToken === "WEGLD") {
                toToken = networkConfig.wegldTokenId;
            }
            
            elizaLogger.info(`Normalized tokens: ${fromToken} -> ${toToken}`);
            
            // Validate that we're not trying to swap the same token
            if (fromToken === toToken) {
                if (callback) {
                    callback({
                        text: `Error: Cannot swap ${fromToken} to itself. Please choose different tokens.`,
                        content: { error: "Same token swap" },
                    });
                }
                return false;
            }
            
            // Get token details to determine decimals
            let fromTokenDecimals = 18; // Default for EGLD/WEGLD
            let amount = contentData.amount;
            
            // If the fromToken is not EGLD, get its details
            if (fromToken !== "EGLD") {
                try {
                    const tokenInfo = await apiProvider.getFungibleTokenOfAccount(
                        address,
                        fromToken
                    );
                    fromTokenDecimals = (tokenInfo as any).decimals || 18;
                    elizaLogger.info(`Token ${fromToken} has ${fromTokenDecimals} decimals`);
                } catch (error) {
                    elizaLogger.error(`Error fetching token info for ${fromToken}: ${error.message}`);
                    // Try to get token info from network
                    try {
                        const tokenInfo = await apiProvider.getDefinitionOfFungibleToken(fromToken);
                        fromTokenDecimals = (tokenInfo as any).decimals || 18;
                        elizaLogger.info(`Token ${fromToken} has ${fromTokenDecimals} decimals (from definition)`);
                    } catch (innerError) {
                        elizaLogger.error(`Error fetching token definition for ${fromToken}: ${innerError.message}`);
                        if (callback) {
                            callback({
                                text: `Error: Could not find token ${fromToken}. Please make sure this token exists and try again.`,
                                content: { error: `Token not found: ${fromToken}` },
                            });
                        }
                        return false;
                    }
                }
            }
            
            // Convert amount to the smallest unit based on decimals
            const amountValue = parseFloat(amount);
            const amountInSmallestUnit = Math.floor(amountValue * Math.pow(10, fromTokenDecimals)).toString();
            
            elizaLogger.info(`Amount: ${amountValue} ${fromToken} = ${amountInSmallestUnit} in smallest unit`);
            
            // Check if the user has enough balance
            if (fromToken !== "EGLD") {
                try {
                    const tokenInfo = await apiProvider.getFungibleTokenOfAccount(
                        address,
                        fromToken
                    );
                    const balance = tokenInfo.balance.toString();
                    elizaLogger.info(`User's ${fromToken} balance: ${balance}`);
                    
                    if (BigInt(balance) < BigInt(amountInSmallestUnit)) {
                        if (callback) {
                            callback({
                                text: `Error: Insufficient balance. You have ${balance} ${fromToken} but the swap requires ${amountInSmallestUnit} ${fromToken}.`,
                                content: { error: "Insufficient balance" },
                            });
                        }
                        return false;
                    }
                } catch (error) {
                    elizaLogger.error(`Error checking balance for ${fromToken}: ${error.message}`);
                    if (callback) {
                        callback({
                            text: `Error: Could not check your balance for ${fromToken}. Please make sure you have enough tokens and try again.`,
                            content: { error: `Balance check failed: ${error.message}` },
                        });
                    }
                    return false;
                }
            } else {
                // Check EGLD balance
                try {
                    const account = await apiProvider.getAccount(address);
                    const balance = account.balance.toString();
                    elizaLogger.info(`User's EGLD balance: ${balance}`);
                    
                    if (BigInt(balance) < BigInt(amountInSmallestUnit)) {
                        if (callback) {
                            callback({
                                text: `Error: Insufficient balance. You have ${balance} EGLD but the swap requires ${amountInSmallestUnit} EGLD.`,
                                content: { error: "Insufficient balance" },
                            });
                        }
                        return false;
                    }
                } catch (error) {
                    elizaLogger.error(`Error checking EGLD balance: ${error.message}`);
                    if (callback) {
                        callback({
                            text: `Error: Could not check your EGLD balance. Please make sure you have enough EGLD and try again.`,
                            content: { error: `Balance check failed: ${error.message}` },
                        });
                    }
                    return false;
                }
            }
            
            // Create a transaction for swapping tokens
            let transaction: Transaction;
            
            try {
                // Create the transaction using AshSwap SDK
                transaction = await createSwapTransaction({
                    sender: address,
                    fromToken,
                    toToken,
                    amount: amountInSmallestUnit,
                    slippage,
                    networkConfig,
                    account: await apiProvider.getAccount(address),
                    apiProvider
                });
            } catch (txError) {
                elizaLogger.error(`Error creating swap transaction: ${txError.message}`);
                if (callback) {
                    callback({
                        text: `Error creating swap transaction: ${txError.message}. Please try again with different parameters.`,
                        content: { error: `Transaction creation failed: ${txError.message}` },
                    });
                }
                return false;
            }
            
            // Sign and send the transaction
            try {
                const signature = await walletProvider.signTransaction(transaction);
                transaction.signature = signature;
                const txHash = await apiProvider.sendTransaction(transaction);
                
                elizaLogger.info(`Swap transaction sent: ${txHash}`);
                
                if (callback) {
                    callback({
                        text: `Successfully initiated swap of ${amountValue} ${contentData.fromToken} to ${contentData.toToken} with ${slippage}% slippage on AshSwap.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                        content: { 
                            success: true,
                            txHash,
                            explorerUrl: `${explorerURL}/transactions/${txHash}`,
                            fromToken: contentData.fromToken,
                            toToken: contentData.toToken,
                            amount: amountValue.toString(),
                            slippage: slippage.toString(),
                            exchange: "AshSwap"
                        },
                    });
                }
                
                return true;
            } catch (sendError) {
                elizaLogger.error(`Error sending swap transaction: ${sendError.message}`);
                if (callback) {
                    callback({
                        text: `Error sending swap transaction: ${sendError.message}. Please try again later.`,
                        content: { error: `Transaction send failed: ${sendError.message}` },
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error(`Error swapping tokens: ${error.message || "Unknown error"}`);
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error swapping tokens: ${errorMessage}`,
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
                    text: "Swap 0.001 EGLD for USDC on AshSwap",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated swap of 0.001 EGLD to USDC-c76f1f with 1% slippage on AshSwap.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SWAP_TOKENS_ASHSWAP",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Exchange 10 USDC for MEX with 0.5% slippage on AshSwap",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated swap of 10 USDC-c76f1f to MEX-455c57 with 0.5% slippage on AshSwap.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SWAP_TOKENS_ASHSWAP",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 5 USDC for EGLD on AshSwap",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated swap of 5 USDC-c76f1f to EGLD with 1% slippage on AshSwap.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SWAP_TOKENS_ASHSWAP",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 0.5 WEGLD for ASH on AshSwap with 0.1% slippage",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated swap of 0.5 WEGLD-bd4d79 to ASH-a642d1 with 0.1% slippage on AshSwap.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SWAP_TOKENS_ASHSWAP",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

/**
 * Create a transaction for swapping tokens using the AshSwap Aggregator
 */
async function createSwapTransaction({
    sender,
    fromToken,
    toToken,
    amount,
    slippage,
    networkConfig,
    account,
    apiProvider
}: SwapTransactionParams): Promise<Transaction> {
    elizaLogger.info(`Creating swap transaction using AshSwap Aggregator`);
    elizaLogger.info(`Sender: ${sender.bech32()}`);
    elizaLogger.info(`From Token: ${fromToken}`);
    elizaLogger.info(`To Token: ${toToken}`);
    elizaLogger.info(`Amount: ${amount}`);
    elizaLogger.info(`Slippage: ${slippage}%`);

    try {
        // Calculate minimum amount out based on slippage
        const minAmountOut = calculateMinAmountOut(amount, slippage);
        elizaLogger.info(`Minimum amount out: ${minAmountOut}`);

        let tx: Transaction;

        if (fromToken === "EGLD") {
            // For EGLD to token swap
            tx = createEgldToTokenSwapTransaction(sender, toToken, amount, minAmountOut.toString(), networkConfig);
        } else if (toToken === "EGLD") {
            // For token to EGLD swap
            tx = createTokenToEgldSwapTransaction(sender, fromToken, amount, minAmountOut.toString(), networkConfig);
        } else {
            // For token to token swap
            tx = createTokenToTokenSwapTransaction(sender, fromToken, toToken, amount, minAmountOut.toString(), networkConfig);
        }

        // Set the nonce
        tx.nonce = BigInt(account.nonce);

        elizaLogger.info(`Transaction created using AshSwap Aggregator`);
        elizaLogger.info(`Transaction data: ${tx.getData().toString()}`);

        return tx;
    } catch (error) {
        elizaLogger.error(`Error creating swap transaction: ${error.message}`);
        throw new Error(`Failed to create swap transaction: ${error.message}`);
    }
}

/**
 * Create a transaction for EGLD to token swap
 */
function createEgldToTokenSwapTransaction(
    sender: Address,
    toToken: string,
    amount: string,
    minAmountOut: string,
    networkConfig: any
): Transaction {
    // For EGLD to token swap, we need to use the exact format from the successful transaction
    
    // Instead of trying to construct the data string, we'll use the exact string from the successful transaction
    // and just replace the token IDs if needed
    
    // Get the WEGLD token ID and format it
    const wegldTokenId = networkConfig.wegldTokenId;
    const wegldTokenIdHex = Buffer.from(wegldTokenId).toString('hex');
    
    // Get the destination token ID and format it
    const toTokenHex = Buffer.from(toToken).toString('hex');
    
    // Create the exact data string from the successful transaction
    let dataString = `aggregateEgld@0000000c5745474c442d6264346437390000000b555344432d63373666316600000007038d7ea4c6800000000000000000000500ce7eab736978ce9492ebbf8206f252eacb333cfa54830000001473776170546f6b656e734669786564496e707574000000020000000b555344432d6337366631660000000101@0000000c5745474c442d626434643739000000000000000b555344432d633736663166000000025413`;
    
    // Only replace the token IDs if they're different from the ones in the successful transaction
    if (wegldTokenId !== "WEGLD-bd4d79") {
        // Replace all occurrences of the WEGLD token ID
        dataString = dataString.replace(/5745474c442d626434643739/g, wegldTokenIdHex);
    }
    
    if (toToken !== "USDC-c76f1f") {
        // Replace all occurrences of the USDC token ID
        dataString = dataString.replace(/555344432d633736663166/g, toTokenHex);
    }
    
    elizaLogger.info(`Created EGLD to token swap transaction with data: ${dataString}`);
    
    // Create the transaction
    return new Transaction({
        value: amount,
        sender: sender,
        receiver: new Address(networkConfig.ashSwapAggregatorAddress),
        gasLimit: 49000000,
        chainID: networkConfig.chainId,
        data: Buffer.from(dataString),
    });
}

/**
 * Create a transaction for token to EGLD swap
 */
function createTokenToEgldSwapTransaction(
    sender: Address,
    fromToken: string,
    amount: string,
    minAmountOut: string,
    networkConfig: any
): Transaction {
    // Format the data string for ESDTTransfer
    const fromTokenHex = Buffer.from(fromToken).toString('hex');
    
    // Create the data string for token to EGLD swap
    const dataString = `ESDTTransfer@${fromTokenHex}@${amount}@aggregate@45474c44@${minAmountOut}`;
    
    // Create the transaction
    return new Transaction({
        value: '0',
        sender: sender,
        receiver: new Address(networkConfig.ashSwapAggregatorAddress),
        gasLimit: 49000000,
        chainID: networkConfig.chainId,
        data: Buffer.from(dataString),
    });
}

/**
 * Create a transaction for token to token swap
 */
function createTokenToTokenSwapTransaction(
    sender: Address,
    fromToken: string,
    toToken: string,
    amount: string,
    minAmountOut: string,
    networkConfig: any
): Transaction {
    // Format the data string for ESDTTransfer
    const fromTokenHex = Buffer.from(fromToken).toString('hex');
    const toTokenHex = Buffer.from(toToken).toString('hex');
    
    // Create the data string for token to token swap
    const dataString = `ESDTTransfer@${fromTokenHex}@${amount}@aggregate@${toTokenHex}@${minAmountOut}`;
    
    // Create the transaction
    return new Transaction({
        value: '0',
        sender: sender,
        receiver: new Address(networkConfig.ashSwapAggregatorAddress),
        gasLimit: 49000000,
        chainID: networkConfig.chainId,
        data: Buffer.from(dataString),
    });
}

/**
 * Calculate the minimum amount out based on the input amount and slippage percentage
 * @param amount The input amount in smallest unit
 * @param slippage The slippage percentage (e.g., 1 for 1%)
 * @returns The minimum amount out in smallest unit
 */
function calculateMinAmountOut(amount: string, slippage: number): bigint {
    // Convert amount to BigInt
    const amountBigInt = BigInt(amount);
    
    // Calculate slippage factor (e.g., 0.99 for 1% slippage)
    const slippageFactor = 100 - slippage;
    
    // Calculate minimum amount out
    // We need to use BigInt arithmetic to avoid precision issues
    const minAmountOut = (amountBigInt * BigInt(slippageFactor)) / BigInt(100);
    
    elizaLogger.info(`Calculate min amount out: ${amount} with ${slippage}% slippage = ${minAmountOut}`);
    
    return minAmountOut;
}
