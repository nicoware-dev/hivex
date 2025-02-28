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
    TokenTransfer,
    Transaction,
    Token,
    ContractCallPayloadBuilder,
    ContractFunction,
    TypedValue,
    BytesValue,
    BigUIntValue,
    U32Value,
    ArgSerializer,
    TransactionPayload
} from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-core";
import { denominateAmount } from "../../utils/amount";

// Define the interface for swap transaction parameters
interface SwapTransactionParams {
    sender: string;
    toToken: string;
    amount: string;
    slippage: number;
    networkConfig: {
        chainId: string;
        wrapperAddress: string;
        wegldTokenId: string;
        wegldUsdcPoolAddress: string;
    };
    account: {
        nonce: number;
    };
    apiProvider: ApiNetworkProvider;
}

export interface SwapTokensContent extends Content {
    fromToken: string;
    toToken: string;
    amount: string;
    slippage?: string;
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
    "fromToken": "WEGLD-bd4d79",
    "toToken": "USDC-c76f1f",
    "amount": "1",
    "slippage": "1"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token swap:
- Source token (fromToken) - the token to swap from
- Destination token (toToken) - the token to swap to
- Amount to swap
- Slippage percentage (optional, default is 1%)

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for swap tokens content
const swapTokensSchema = z.object({
    fromToken: z.string(),
    toToken: z.string(),
    amount: z.string(),
    slippage: z.string().optional().nullable(),
});

// Network-specific configuration
const NETWORK_CONFIG = {
    mainnet: {
        wegldUsdcPoolAddress: "erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq",
        wegldTokenId: "WEGLD-bd4d79",
        usdcTokenId: "USDC-c76f1f",
        chainId: "1",
    },
    devnet: {
        wegldUsdcPoolAddress: "erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq",
        wegldTokenId: "WEGLD-a28c59",
        usdcTokenId: "USDC-8d4068",
        chainId: "D",
    },
    testnet: {
        wegldUsdcPoolAddress: "erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq",
        wegldTokenId: "WEGLD-a28c59",
        usdcTokenId: "USDC-8d4068",
        chainId: "T",
    }
};

/**
 * Calculate minimum amount out based on slippage
 * @param amount Amount in smallest denomination
 * @param slippage Slippage percentage (e.g. 1 for 1%)
 * @returns Minimum amount out in smallest denomination
 */
function calculateMinAmountOut(amount: string, slippage: number): string {
    const amountBigInt = BigInt(amount);
    const slippageFactor = BigInt(Math.floor((100 - slippage) * 100)) / BigInt(100 * 100);
    return (amountBigInt * slippageFactor).toString();
}

/**
 * Create a transaction for EGLD to token swap
 * This requires wrapping EGLD to WEGLD first, then swapping WEGLD to the desired token
 */
async function createEgldToTokenSwapTransaction({
    sender,
    toToken,
    amount,
    slippage,
    networkConfig,
    account,
    apiProvider
}: SwapTransactionParams): Promise<Transaction> {
    elizaLogger.info(`Creating EGLD to token swap transaction`);
    elizaLogger.info(`Sender: ${sender}`);
    elizaLogger.info(`To Token: ${toToken}`);
    elizaLogger.info(`Amount: ${amount} EGLD = ${amount} in smallest unit`);
    elizaLogger.info(`Slippage: ${slippage}`);

    // Calculate minimum amount out based on slippage
    const minAmountOut = calculateMinAmountOut(amount, slippage);
    elizaLogger.info(`Minimum amount out: ${minAmountOut}`);

    try {
        // First wrap EGLD to WEGLD
        const wrapEgldHex = "wrapEgld";
        const wegldTokenId = networkConfig.wegldTokenId;
        const minAmountHex = BigInt(minAmountOut).toString(16);
        const paddedMinAmountHex = minAmountHex.padStart(16, '0');

        // Create the swap function call
        const swapFunctionName = "swapTokensFixedInput";
        
        // Construct the complete data string with @ separators
        const dataString = `${wrapEgldHex}@${wegldTokenId}@${toToken}@${paddedMinAmountHex}@${swapFunctionName}`;
        
        // Create the transaction with the data as a Buffer
        const transaction = new Transaction({
            value: amount,
            sender: sender,
            receiver: new Address(networkConfig.wrapperAddress),
            gasLimit: 180200000, // Based on successful transaction
            chainID: networkConfig.chainId,
            data: Buffer.from(dataString),
            nonce: BigInt(account.nonce),
        });

        elizaLogger.info(`Created EGLD to token swap transaction`);
        elizaLogger.info(`Transaction data: ${dataString}`);
        return transaction;
    } catch (error) {
        elizaLogger.error(`Error creating EGLD to token swap transaction: ${error.message}`);
        throw new Error(`Failed to create EGLD to token swap transaction: ${error.message}`);
    }
}

/**
 * Swap tokens on xExchange using direct pool interaction
 * This action allows users to swap tokens on the xExchange DEX by interacting directly with the liquidity pools
 */
export default {
    name: "SWAP_TOKENS_XEXCHANGE_V2",
    similes: [
        "EXCHANGE_TOKENS_XEXCHANGE_V2",
        "TRADE_TOKENS_XEXCHANGE_V2",
        "SWAP_XEXCHANGE_V2",
        "EXCHANGE_XEXCHANGE_V2",
        "TRADE_XEXCHANGE_V2",
        "DEX_SWAP_XEXCHANGE_V2",
        "XEXCHANGE_SWAP_V2",
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
    description: "Swap tokens on xExchange DEX using direct pool interaction",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting SWAP_TOKENS_XEXCHANGE_V2 handler...");

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
            elizaLogger.error("Invalid content for SWAP_TOKENS_XEXCHANGE_V2 action.");
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
            const apiProvider = new ApiNetworkProvider(apiURL, { clientName: "hivex-exchange" });
            
            // Get wallet address
            const address = walletProvider.getAddress();
            
            // Parse slippage (default to 1%)
            const slippage = contentData.slippage ? parseFloat(contentData.slippage) : 1;
            
            // Normalize token identifiers
            let fromToken = contentData.fromToken.toUpperCase();
            let toToken = contentData.toToken.toUpperCase();
            
            // Handle common token names
            if (fromToken === "EGLD") {
                fromToken = networkConfig.wegldTokenId;
            } else if (fromToken === "USDC") {
                fromToken = networkConfig.usdcTokenId;
            }
            
            if (toToken === "EGLD") {
                toToken = networkConfig.wegldTokenId;
            } else if (toToken === "USDC") {
                toToken = networkConfig.usdcTokenId;
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
            
            // If the fromToken is not EGLD/WEGLD, get its details
            if (fromToken !== networkConfig.wegldTokenId) {
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
            const amountInSmallestUnit = denominateAmount({ 
                amount: amountValue.toString(), 
                decimals: fromTokenDecimals 
            });
            
            elizaLogger.info(`Amount: ${amountValue} ${fromToken} = ${amountInSmallestUnit} in smallest unit`);
            
            // Check if the user has enough balance
            if (fromToken !== networkConfig.wegldTokenId) {
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

            // Calculate minimum amount out based on slippage
            const minAmountOut = BigInt(Math.floor(Number(amountInSmallestUnit) * (1 - slippage / 100))).toString();
            elizaLogger.info(`Minimum amount out: ${minAmountOut}`);

            // Create the transaction data string
            // Format: swapTokensFixedInput@<token_out>@<amount_out_min>
            const swapTokensFixedInputHex = Buffer.from("swapTokensFixedInput").toString('hex');
            const toTokenHex = Buffer.from(toToken).toString('hex');
            const minAmountOutHex = BigInt(minAmountOut).toString(16).padStart(16, '0');
            const dataString = `${swapTokensFixedInputHex}@${toTokenHex}@${minAmountOutHex}`;
            
            elizaLogger.info(`Transaction data: ${dataString}`);

            // Create the transaction
            let transaction = new Transaction({
                value: fromToken === networkConfig.wegldTokenId ? amountInSmallestUnit : '0',
                sender: address,
                receiver: new Address(networkConfig.wegldUsdcPoolAddress),
                gasLimit: 180200000, // Exact gas limit from successful transaction
                chainID: networkConfig.chainId,
                data: Buffer.from(dataString),
            });

            // Get the account nonce
            const account = await apiProvider.getAccount(address);
            transaction.nonce = BigInt(account.nonce);

            // If we're sending a token (not EGLD), add the token transfer data
            if (fromToken !== networkConfig.wegldTokenId) {
                const tokenTransferHex = Buffer.from("ESDTTransfer").toString('hex');
                const fromTokenHex = Buffer.from(fromToken).toString('hex');
                const amountHex = BigInt(amountInSmallestUnit).toString(16).padStart(16, '0');
                transaction = new Transaction({
                    ...transaction,
                    value: '0',
                    data: Buffer.from(`${tokenTransferHex}@${fromTokenHex}@${amountHex}@${swapTokensFixedInputHex}@${toTokenHex}@${minAmountOutHex}`),
                });
            }

            // Sign and send the transaction
            try {
                const signature = await walletProvider.signTransaction(transaction);
                transaction.signature = signature;
                const txHash = await apiProvider.sendTransaction(transaction);
                
                elizaLogger.info(`Swap transaction sent: ${txHash}`);
                
                if (callback) {
                    callback({
                        text: `Successfully initiated swap of ${amountValue} ${contentData.fromToken} to ${contentData.toToken} with ${slippage}% slippage.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                        content: { 
                            success: true,
                            txHash,
                            explorerUrl: `${explorerURL}/transactions/${txHash}`,
                            fromToken: contentData.fromToken,
                            toToken: contentData.toToken,
                            amount: amountValue.toString(),
                            slippage: slippage.toString()
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
                    text: "Swap 1 WEGLD for USDC using xExchange V2",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated swap of 1 WEGLD-bd4d79 to USDC-c76f1f with 1% slippage.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SWAP_TOKENS_XEXCHANGE_V2",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Exchange 10 USDC for WEGLD with 0.5% slippage using xExchange V2",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated swap of 10 USDC-c76f1f to WEGLD-bd4d79 with 0.5% slippage.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SWAP_TOKENS_XEXCHANGE_V2",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
