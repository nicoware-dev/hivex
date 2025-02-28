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
    account: any;
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
    name: "SWAP_TOKENS",
    similes: [
        "EXCHANGE_TOKENS",
        "TRADE_TOKENS",
        "SWAP",
        "EXCHANGE",
        "TRADE",
        "DEX_SWAP",
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
    description: "Swap tokens on xExchange",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.info("Starting SWAP_TOKENS handler...");

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
            elizaLogger.error("Invalid content for SWAP_TOKENS action.");
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
            
            // Handle EGLD as a special case
            if (fromToken === "EGLD") {
                fromToken = "EGLD";
            } else if (fromToken === "USDC") {
                fromToken = networkConfig.usdcTokenId;
            } else if (fromToken === "MEX") {
                fromToken = networkConfig.mexTokenId;
            }
            
            if (toToken === "EGLD") {
                toToken = "EGLD";
            } else if (toToken === "USDC") {
                toToken = networkConfig.usdcTokenId;
            } else if (toToken === "MEX") {
                toToken = networkConfig.mexTokenId;
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
                } catch (error) {
                    elizaLogger.error(`Error fetching token info for ${fromToken}`);
                    // Try to get token info from network
                    try {
                        const tokenInfo = await apiProvider.getDefinitionOfFungibleToken(fromToken);
                        fromTokenDecimals = (tokenInfo as any).decimals || 18;
                    } catch (innerError) {
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
            
            // Create a transaction for swapping tokens
            let transaction: Transaction;
            
            if (fromToken === "EGLD") {
                // EGLD to Token swap
                transaction = await createEgldToTokenSwapTransaction({
                    sender: address,
                    toToken,
                    amount: amountInSmallestUnit,
                    slippage,
                    networkConfig,
                    account: await apiProvider.getAccount(address)
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
            
            // Sign and send the transaction
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
                    action: "SWAP_TOKENS",
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
                    action: "SWAP_TOKENS",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

/**
 * Create a transaction for swapping EGLD to a token on xExchange
 * This requires wrapping EGLD to WEGLD first, then swapping WEGLD to the desired token
 */
async function createEgldToTokenSwapTransaction({
    sender,
    toToken,
    amount,
    slippage,
    networkConfig,
    account,
}: SwapTransactionParams): Promise<Transaction> {
    elizaLogger.info(`Creating EGLD to token swap transaction`);
    elizaLogger.info(`Sender: ${sender}`);
    elizaLogger.info(`To Token: ${toToken}`);
    elizaLogger.info(`Amount: ${amount}`);
    elizaLogger.info(`Slippage: ${slippage}`);

    // Calculate minimum amount out based on slippage
    const minAmountOut = calculateMinAmountOut(amount, slippage);
    elizaLogger.info(`Minimum amount out: ${minAmountOut}`);

    // For EGLD to token swap, we need to use the Tasks Composer contract with the composeTasks method
    // The format is: composeTasks@[token_id_len(4 bytes)][token_id][amount_in_hex]@@@[num_pairs(1 byte)]@[pair_data]
    
    // Prepare the token ID with length prefix (4 bytes)
    const tokenIdHex = Buffer.from(toToken).toString('hex');
    const tokenIdLength = Buffer.alloc(4);
    tokenIdLength.writeUInt32BE(toToken.length, 0);
    elizaLogger.info(`Token ID length: ${tokenIdLength.toString('hex')}`);
    elizaLogger.info(`Token ID hex: ${tokenIdHex}`);

    // Format the amount as hex
    const amountBigInt = BigInt(amount);
    const amountHex = amountBigInt.toString(16).padStart(16, '0');
    elizaLogger.info(`Amount hex: ${amountHex}`);

    // Format the minimum amount out as hex
    const minAmountOutHex = minAmountOut.toString(16).padStart(16, '0');
    elizaLogger.info(`Min amount out hex: ${minAmountOutHex}`);

    // Create the data string for the composeTasks method
    // The pair data includes the swap function and parameters
    const pairData = `00000020000000000000000005000000000000000000000000000000000000000000001573776170546f6b656e7346697865644f7574707574${tokenIdHex}${minAmountOutHex}`;
    const dataString = `composeTasks@${tokenIdLength.toString('hex')}${tokenIdHex}${amountHex}@@@01@${pairData}`;
    elizaLogger.info(`Transaction data: ${dataString}`);

    // Create the transaction
    const transaction = new Transaction({
        value: amount,
        sender: sender,
        receiver: new Address(networkConfig.tasksComposerAddress),
        gasLimit: 180000000, // Increased gas limit based on successful transaction
        chainID: networkConfig.chainId,
        data: Buffer.from(dataString),
        nonce: BigInt(account.nonce),
    });

    elizaLogger.info(`Transaction created:`);
    elizaLogger.info(`- Value: ${transaction.getValue()}`);
    elizaLogger.info(`- Sender: ${transaction.getSender()}`);
    elizaLogger.info(`- Receiver: ${transaction.getReceiver()}`);
    elizaLogger.info(`- Gas limit: ${transaction.getGasLimit()}`);
    elizaLogger.info(`- Chain ID: ${transaction.getChainID()}`);
    elizaLogger.info(`- Data: ${transaction.getData().toString()}`);
    elizaLogger.info(`- Nonce: ${transaction.getNonce()}`);

    return transaction;
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
}: {
    sender: Address;
    fromToken: string;
    amount: string;
    slippage: number;
    networkConfig: any;
    apiProvider: ApiNetworkProvider;
}): Promise<Transaction> {
    elizaLogger.info(`Creating token to EGLD swap transaction`);
    elizaLogger.info(`Sender: ${sender.bech32()}`);
    elizaLogger.info(`From Token: ${fromToken}`);
    elizaLogger.info(`Amount: ${amount}`);
    elizaLogger.info(`Slippage: ${slippage}%`);
    
    // Calculate minimum amount out based on slippage
    const minAmountOut = calculateMinAmountOut(amount, slippage);
    elizaLogger.info(`Minimum amount out: ${minAmountOut}`);
    
    // For token to EGLD swap, we use ESDTTransfer to the router
    const dataString = `ESDTTransfer@${Buffer.from(fromToken).toString('hex')}@${amount}@swapTokensFixedInputAndUnwrapEgld@${Buffer.from(networkConfig.wegldTokenId).toString('hex')}@${minAmountOut.toString(16)}`;
    elizaLogger.info(`Transaction data: ${dataString}`);
    
    // Create a new transaction
    const transaction = new Transaction({
        value: '0',
        sender: sender,
        receiver: new Address(networkConfig.routerAddress),
        gasLimit: 60000000, // High gas limit for swap operations
        chainID: networkConfig.chainId,
        data: Buffer.from(dataString)
    });
    
    elizaLogger.info(`Transaction created:`);
    elizaLogger.info(`- Value: ${transaction.getValue().toString()}`);
    elizaLogger.info(`- Sender: ${transaction.getSender().bech32()}`);
    elizaLogger.info(`- Receiver: ${transaction.getReceiver().bech32()}`);
    elizaLogger.info(`- Gas limit: ${transaction.getGasLimit().toString()}`);
    elizaLogger.info(`- Chain ID: ${transaction.getChainID()}`);
    elizaLogger.info(`- Data: ${transaction.getData().toString()}`);
    
    // Get the account nonce
    const account = await apiProvider.getAccount(sender);
    transaction.nonce = BigInt(account.nonce);
    elizaLogger.info(`Transaction nonce: ${transaction.getNonce().toString()}`);
    
    return transaction;
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
}: {
    sender: Address;
    fromToken: string;
    toToken: string;
    amount: string;
    slippage: number;
    networkConfig: any;
    apiProvider: ApiNetworkProvider;
}): Promise<Transaction> {
    elizaLogger.info(`Creating token to token swap transaction`);
    elizaLogger.info(`Sender: ${sender.bech32()}`);
    elizaLogger.info(`From Token: ${fromToken}`);
    elizaLogger.info(`To Token: ${toToken}`);
    elizaLogger.info(`Amount: ${amount}`);
    elizaLogger.info(`Slippage: ${slippage}%`);
    
    // Calculate minimum amount out based on slippage
    const minAmountOut = calculateMinAmountOut(amount, slippage);
    elizaLogger.info(`Minimum amount out: ${minAmountOut}`);
    
    // For token to token swap, we use ESDTTransfer to the router
    const dataString = `ESDTTransfer@${Buffer.from(fromToken).toString('hex')}@${amount}@swapTokensFixedInput@${Buffer.from(toToken).toString('hex')}@${minAmountOut.toString(16)}`;
    elizaLogger.info(`Transaction data: ${dataString}`);
    
    // Create a new transaction
    const transaction = new Transaction({
        value: '0',
        sender: sender,
        receiver: new Address(networkConfig.routerAddress),
        gasLimit: 60000000, // High gas limit for swap operations
        chainID: networkConfig.chainId,
        data: Buffer.from(dataString)
    });
    
    elizaLogger.info(`Transaction created:`);
    elizaLogger.info(`- Value: ${transaction.getValue().toString()}`);
    elizaLogger.info(`- Sender: ${transaction.getSender().bech32()}`);
    elizaLogger.info(`- Receiver: ${transaction.getReceiver().bech32()}`);
    elizaLogger.info(`- Gas limit: ${transaction.getGasLimit().toString()}`);
    elizaLogger.info(`- Chain ID: ${transaction.getChainID()}`);
    elizaLogger.info(`- Data: ${transaction.getData().toString()}`);
    
    // Get the account nonce
    const account = await apiProvider.getAccount(sender);
    transaction.nonce = BigInt(account.nonce);
    elizaLogger.info(`Transaction nonce: ${transaction.getNonce().toString()}`);
    
    return transaction;
}

/**
 * Calculate the minimum amount out based on the input amount and slippage
 * @param amount The input amount in smallest unit
 * @param slippage The slippage percentage (e.g., 1 for 1%)
 * @returns The minimum amount out in smallest unit
 */
function calculateMinAmountOut(amount: string, slippage: number): bigint {
    const amountBigInt = BigInt(amount);
    const slippageFactor = BigInt(10000) - BigInt(Math.floor(slippage * 100));
    const minAmountOut = (amountBigInt * slippageFactor) / BigInt(10000);
    elizaLogger.info(`Calculate min amount out: ${amount} with ${slippage}% slippage = ${minAmountOut}`);
    return minAmountOut;
} 