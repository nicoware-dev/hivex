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
    ArgSerializer
} from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-core";
import { denominateAmount } from "../../utils/amount";

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
        tasksComposerAddress: "erd1qqqqqqqqqqqqqpgqsytkvnexypp7argk02l0rasnj57sxa542jpshkl7df",
        routerAddress: "erd1qqqqqqqqqqqqqpgqq66xk9gfr4esuhem3jru86wg5hvp33a62jps2fy57p",
        wrapperAddress: "erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3",
        wegldTokenId: "WEGLD-bd4d79",
        usdcTokenId: "USDC-c76f1f",
        mexTokenId: "MEX-455c57",
        chainId: "1",
        pairs: {
            "WEGLD-bd4d79-USDC-c76f1f": "erd1qqqqqqqqqqqqqpgqfj3z3k4vlq7dc2928rxez0uhhlq46s6p4mtqerlxhc",
            "WEGLD-bd4d79-MEX-455c57": "erd1qqqqqqqqqqqqqpgqme9h4qake7hn7yd9q33z0qnzw6t4hjvs4mtqhtkpaz"
        }
    },
    devnet: {
        tasksComposerAddress: "erd1qqqqqqqqqqqqqpgqsytkvnexypp7argk02l0rasnj57sxa542jpshkl7df",
        routerAddress: "erd1qqqqqqqqqqqqqpgqrc4pg2xarca9z34njcxeur622qmfjp8w2jps89fxnl",
        wrapperAddress: "erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3",
        wegldTokenId: "WEGLD-a28c59",
        usdcTokenId: "USDC-8d4068",
        mexTokenId: "MEX-dc289c",
        chainId: "D",
        pairs: {
            "WEGLD-a28c59-USDC-8d4068": "erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq",
            "WEGLD-a28c59-MEX-dc289c": "erd1qqqqqqqqqqqqqpgq7ykazrzd905zvnlr88dpfw06677lxe9m2jps9e6jn7"
        }
    },
    testnet: {
        tasksComposerAddress: "erd1qqqqqqqqqqqqqpgqsytkvnexypp7argk02l0rasnj57sxa542jpshkl7df",
        routerAddress: "erd1qqqqqqqqqqqqqpgqrc4pg2xarca9z34njcxeur622qmfjp8w2jps89fxnl",
        wrapperAddress: "erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3",
        wegldTokenId: "WEGLD-a28c59",
        usdcTokenId: "USDC-8d4068",
        mexTokenId: "MEX-dc289c",
        chainId: "T",
        pairs: {
            "WEGLD-a28c59-USDC-8d4068": "erd1qqqqqqqqqqqqqpgqeel2kumf0r8ffyhth7pqdujjat9nx0862jpsg2pqaq"
        }
    }
};

/**
 * Swap tokens on xExchange
 * This action allows users to swap tokens on the xExchange DEX
 */
export default {
    name: "SWAP_TOKENS_XEXCHANGE",
    similes: [
        "EXCHANGE_TOKENS_XEXCHANGE",
        "TRADE_TOKENS_XEXCHANGE",
        "SWAP_XEXCHANGE",
        "EXCHANGE_XEXCHANGE",
        "TRADE_XEXCHANGE",
        "DEX_SWAP_XEXCHANGE",
        "XEXCHANGE_SWAP",
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
    description: "Swap tokens on xExchange DEX",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting SWAP_TOKENS_XEXCHANGE handler...");

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
            elizaLogger.error("Invalid content for SWAP_TOKENS_XEXCHANGE action.");
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
            const amountInSmallestUnit = denominateAmount({ 
                amount: amountValue.toString(), 
                decimals: fromTokenDecimals 
            });
            
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
                if (fromToken === "EGLD") {
                    // EGLD to Token swap
                    transaction = await createEgldToTokenSwapTransaction({
                        sender: address,
                        toToken,
                        amount: amountInSmallestUnit,
                        slippage,
                        networkConfig,
                        account: await apiProvider.getAccount(address),
                        apiProvider
                    });
                } else if (toToken === "EGLD") {
                    // Token to EGLD swap
                    transaction = await createTokenToEgldSwapTransaction({
                        sender: address,
                        fromToken,
                        amount: amountInSmallestUnit,
                        slippage,
                        networkConfig,
                        apiProvider
                    });
                } else {
                    // Token to Token swap
                    transaction = await createTokenToTokenSwapTransaction({
                        sender: address,
                        fromToken,
                        toToken,
                        amount: amountInSmallestUnit,
                        slippage,
                        networkConfig,
                        apiProvider
                    });
                }
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
                    text: "Swap 1 WEGLD for USDC",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated swap of 1 WEGLD-bd4d79 to USDC-c76f1f with 1% slippage.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SWAP_TOKENS_XEXCHANGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Exchange 10 USDC for MEX with 0.5% slippage",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully initiated swap of 10 USDC-c76f1f to MEX-455c57 with 0.5% slippage.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SWAP_TOKENS_XEXCHANGE",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

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
    elizaLogger.info(`Amount: ${amount}`);
    elizaLogger.info(`Slippage: ${slippage}`);

    // Calculate minimum amount out based on slippage
    const minAmountOut = calculateMinAmountOut(amount, slippage);
    elizaLogger.info(`Minimum amount out: ${minAmountOut}`);

    try {
        // Check if the token is WEGLD, if so, we can just wrap EGLD
        if (toToken === networkConfig.wegldTokenId) {
            // For wrapping EGLD to WEGLD, we send EGLD directly to the wrapper contract
            const transaction = new Transaction({
                value: amount,
                sender: sender,
                receiver: new Address(networkConfig.wrapperAddress),
                gasLimit: 30000000,
                chainID: networkConfig.chainId,
                data: Buffer.from("wrapEgld"),
                nonce: BigInt(account.nonce),
            });
            
            elizaLogger.info(`Created wrap EGLD transaction`);
            return transaction;
        }
        
        // For EGLD to other tokens, we need to use the exact format from the successful transaction
        
        // Format the destination token ID with proper length prefix
        const toTokenHex = Buffer.from(toToken).toString('hex');
        const toTokenLengthHex = toToken.length.toString(16).padStart(8, '0');
        
        // Format the minimum amount out as hex with proper padding
        const minAmountOutHex = minAmountOut.toString(16).padStart(8, '0');
        
        // Create the task data for the swap
        // This is the exact format from the successful transaction, with our token and amount
        const taskData = `00000020000000000000000005001f49372ab3b57402e9ad1519a0b0271d5190186654830000001573776170546f6b656e7346697865644f75747075740000000${toTokenLengthHex}${toTokenHex}000000${minAmountOutHex}`;
        
        // Create the full data string using the exact format from the successful transaction
        // The format from the successful transaction is:
        // composeTasks@0000000b555344432d6337366631660000000000000000000000022710@@@03@...
        const amountHex = BigInt(amount).toString(16).padStart(8, '0');
        const dataString = `composeTasks@0000000${toTokenLengthHex}${toTokenHex}0000000000000000000000${amountHex}@@@01@${taskData}`;
        
        elizaLogger.info(`Transaction data: ${dataString}`);

        // Create the transaction with the exact gas limit from the successful transaction
        const transaction = new Transaction({
            value: amount,
            sender: sender,
            receiver: new Address(networkConfig.tasksComposerAddress),
            gasLimit: 180200000, // Exact gas limit from successful transaction
            chainID: networkConfig.chainId,
            data: Buffer.from(dataString),
            nonce: BigInt(account.nonce),
        });

        elizaLogger.info(`Transaction created for EGLD to ${toToken} swap`);
        return transaction;
    } catch (error) {
        elizaLogger.error(`Error creating EGLD to token swap transaction: ${error.message}`);
        throw new Error(`Failed to create EGLD to token swap transaction: ${error.message}`);
    }
}

/**
 * Create a transaction for swapping a token to EGLD on xExchange
 * This requires swapping the token to WEGLD first, then unwrapping WEGLD to EGLD
 */
async function createTokenToEgldSwapTransaction({
    sender,
    fromToken,
    amount,
    slippage,
    networkConfig,
    apiProvider
}: SwapTransactionParams): Promise<Transaction> {
    elizaLogger.info(`Creating token to EGLD swap transaction`);
    elizaLogger.info(`Sender: ${sender.bech32()}`);
    elizaLogger.info(`From Token: ${fromToken}`);
    elizaLogger.info(`Amount: ${amount}`);
    elizaLogger.info(`Slippage: ${slippage}%`);
    
    try {
        // Calculate minimum amount out based on slippage
        const minAmountOut = calculateMinAmountOut(amount, slippage);
        elizaLogger.info(`Minimum amount out: ${minAmountOut}`);
        
        // Check if the token is WEGLD, if so, we can just unwrap it
        if (fromToken === networkConfig.wegldTokenId) {
            // For unwrapping WEGLD to EGLD, we use ESDTTransfer to the wrapper contract
            const dataString = `ESDTTransfer@${Buffer.from(fromToken).toString('hex')}@${amount}@unwrapEgld`;
            
            // Create a new transaction
            const transaction = new Transaction({
                value: '0',
                sender: sender,
                receiver: new Address(networkConfig.wrapperAddress),
                gasLimit: 30000000,
                chainID: networkConfig.chainId,
                data: Buffer.from(dataString)
            });
            
            // Get the account nonce
            const account = await apiProvider.getAccount(sender);
            transaction.nonce = BigInt(account.nonce);
            
            elizaLogger.info(`Created unwrap WEGLD transaction`);
            return transaction;
        }
        
        // For other tokens to EGLD, we'll use the composeTasks method with the exact format from the successful transaction
        // Get the token IDs and format them with proper length prefixes
        const fromTokenHex = Buffer.from(fromToken).toString('hex');
        const fromTokenLengthHex = fromToken.length.toString(16).padStart(8, '0');
        const wegldTokenId = networkConfig.wegldTokenId;
        const wegldTokenHex = Buffer.from(wegldTokenId).toString('hex');
        const wegldTokenLengthHex = wegldTokenId.length.toString(16).padStart(8, '0');
        
        // Format the minimum amount out as hex with proper padding
        const minAmountOutHex = minAmountOut.toString(16).padStart(8, '0');
        
        // Create the task data for the swap to WEGLD and then unwrap
        // This is the exact format from the successful transaction, with our token and amount
        const taskData1 = `00000020000000000000000005001f49372ab3b57402e9ad1519a0b0271d5190186654830000001573776170546f6b656e7346697865644f75747075740000000${wegldTokenLengthHex}${wegldTokenHex}000000${minAmountOutHex}`;
        const taskData2 = `0000001c756e77726170457364744e6674546f6b656e@${wegldTokenLengthHex}${wegldTokenHex}`;
        
        // Create the full data string using the exact format from the successful transaction
        // The format from the successful transaction is:
        // composeTasks@0000000b555344432d6337366631660000000000000000000000022710@@@03@...
        const amountHex = BigInt(amount).toString(16).padStart(8, '0');
        const dataString = `composeTasks@0000000${fromTokenLengthHex}${fromTokenHex}0000000000000000000000${amountHex}@@@02@${taskData1}@${taskData2}`;
        
        elizaLogger.info(`Transaction data: ${dataString}`);
        
        // Create a new transaction with the exact gas limit from the successful transaction
        const transaction = new Transaction({
            value: '0',
            sender: sender,
            receiver: new Address(networkConfig.tasksComposerAddress),
            gasLimit: 180200000, // Exact gas limit from successful transaction
            chainID: networkConfig.chainId,
            data: Buffer.from(dataString)
        });
        
        // Get the account nonce
        const account = await apiProvider.getAccount(sender);
        transaction.nonce = BigInt(account.nonce);
        
        elizaLogger.info(`Transaction created for ${fromToken} to EGLD swap`);
        return transaction;
    } catch (error) {
        elizaLogger.error(`Error creating token to EGLD swap transaction: ${error.message}`);
        throw new Error(`Failed to create token to EGLD swap transaction: ${error.message}`);
    }
}

/**
 * Create a transaction for swapping a token to another token on xExchange
 */
async function createTokenToTokenSwapTransaction({
    sender,
    fromToken,
    toToken,
    amount,
    slippage,
    networkConfig,
    apiProvider
}: SwapTransactionParams): Promise<Transaction> {
    elizaLogger.info(`Creating token to token swap transaction`);
    elizaLogger.info(`Sender: ${sender.bech32()}`);
    elizaLogger.info(`From Token: ${fromToken}`);
    elizaLogger.info(`To Token: ${toToken}`);
    elizaLogger.info(`Amount: ${amount}`);
    elizaLogger.info(`Slippage: ${slippage}%`);
    
    try {
        // Calculate minimum amount out based on slippage
        const minAmountOut = calculateMinAmountOut(amount, slippage);
        elizaLogger.info(`Minimum amount out: ${minAmountOut}`);
        
        // For token to token swap, we'll use the composeTasks method with the exact format from the successful transaction
        // Get the token IDs and format them with proper length prefixes
        const fromTokenHex = Buffer.from(fromToken).toString('hex');
        const fromTokenLengthHex = fromToken.length.toString(16).padStart(8, '0');
        const toTokenHex = Buffer.from(toToken).toString('hex');
        const toTokenLengthHex = toToken.length.toString(16).padStart(8, '0');
        
        // Format the minimum amount out as hex with proper padding
        const minAmountOutHex = minAmountOut.toString(16).padStart(8, '0');
        
        // Create the task data for the swap using the exact format from the successful transaction
        const taskData = `00000020000000000000000005001f49372ab3b57402e9ad1519a0b0271d5190186654830000001573776170546f6b656e7346697865644f75747075740000000${toTokenLengthHex}${toTokenHex}000000${minAmountOutHex}`;
        
        // Create the full data string using the exact format from the successful transaction
        // The format from the successful transaction is:
        // composeTasks@0000000b555344432d6337366631660000000000000000000000022710@@@03@...
        const amountHex = BigInt(amount).toString(16).padStart(8, '0');
        const dataString = `composeTasks@0000000${fromTokenLengthHex}${fromTokenHex}0000000000000000000000${amountHex}@@@01@${taskData}`;
        
        elizaLogger.info(`Transaction data: ${dataString}`);
        
        // Create a new transaction with the exact gas limit from the successful transaction
        const transaction = new Transaction({
            value: '0',
            sender: sender,
            receiver: new Address(networkConfig.tasksComposerAddress),
            gasLimit: 180200000, // Exact gas limit from successful transaction
            chainID: networkConfig.chainId,
            data: Buffer.from(dataString)
        });
        
        // Get the account nonce
        const account = await apiProvider.getAccount(sender);
        transaction.nonce = BigInt(account.nonce);
        
        elizaLogger.info(`Transaction created for ${fromToken} to ${toToken} swap`);
        return transaction;
    } catch (error) {
        elizaLogger.error(`Error creating token to token swap transaction: ${error.message}`);
        throw new Error(`Failed to create token to token swap transaction: ${error.message}`);
    }
}

/**
 * Calculate the minimum amount out based on the input amount and slippage percentage
 * @param amount The input amount in smallest unit
 * @param slippage The slippage percentage (e.g., 1 for 1%)
 * @returns The minimum amount out in smallest unit
 */
function calculateMinAmountOut(amount: string, slippage: number): bigint {
    elizaLogger.info(`Calculate min amount out: ${amount} with ${slippage}% slippage = ${BigInt(Math.floor(Number(amount) * (1 - slippage / 100)))}`);
    
    // Convert amount to BigInt
    const amountBigInt = BigInt(amount);
    
    // Calculate slippage factor (e.g., 0.99 for 1% slippage)
    const slippageFactor = 100 - slippage;
    
    // Calculate minimum amount out
    // We need to use BigInt arithmetic to avoid precision issues
    const minAmountOut = (amountBigInt * BigInt(slippageFactor)) / BigInt(100);
    
    return minAmountOut;
} 