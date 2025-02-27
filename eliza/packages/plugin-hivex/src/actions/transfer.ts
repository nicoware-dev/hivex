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
import { initWalletProvider } from "../providers/wallet";
import { validateMultiversxConfig } from "../enviroment";
import { z } from "zod";

export interface TransferContent extends Content {
    tokenAddress: string;
    amount: string;
    tokenIdentifier?: string;
}

function isTransferContent(
    _runtime: IAgentRuntime,
    content: any
): content is TransferContent {
    return (
        typeof content.tokenAddress === "string" &&
        typeof content.amount === "string"
    );
}

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenAddress": "erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm",
    "amount": "1",
    "tokenIdentifier": "PEPE-3eca7c"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token address
- Amount to transfer
- Token identifier

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for transfer content
const transferSchema = z.object({
    tokenAddress: z.string(),
    amount: z.string(),
    tokenIdentifier: z.string().optional().nullable(),
});

export default {
    name: "SEND_TOKEN",
    similes: [
        "TRANSFER_TOKEN",
        "TRANSFER_TOKENS",
        "SEND_TOKENS",
        "SEND_EGLD",
        "PAY",
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
    description: "Transfer tokens from the agent wallet to another address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting SEND_TOKEN handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });

        // Generate transfer content
        const content = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.SMALL,
            schema: transferSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate transfer content
        if (!isTransferContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for TRANSFER_TOKEN action.");
            if (callback) {
                callback({
                    text: "Unable to process transfer request. Invalid content provided.",
                    content: { error: "Invalid transfer content" },
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
            const explorerURL = network === "mainnet" 
                ? "https://explorer.multiversx.com" 
                : `https://${network}-explorer.multiversx.com`;
            
            let txHash: string;
            
            // Handle ESDT token transfer
            if (contentData.tokenIdentifier && contentData.tokenIdentifier !== "EGLD") {
                txHash = await walletProvider.sendESDT({
                    receiverAddress: contentData.tokenAddress,
                    amount: contentData.amount,
                    identifier: contentData.tokenIdentifier,
                });
            } 
            // Handle EGLD transfer
            else {
                txHash = await walletProvider.sendEGLD({
                    receiverAddress: contentData.tokenAddress,
                    amount: contentData.amount,
                });
            }
            
            // Format the amount for display
            const formattedAmount = contentData.amount;
            const tokenType = contentData.tokenIdentifier || "EGLD";
            
            elizaLogger.log(`Transfer successful: ${formattedAmount} ${tokenType} to ${contentData.tokenAddress}`);
            
            if (callback) {
                callback({
                    text: `Successfully sent ${formattedAmount} ${tokenType} to ${contentData.tokenAddress}.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                    content: { 
                        success: true,
                        txHash,
                        explorerUrl: `${explorerURL}/transactions/${txHash}`,
                        amount: formattedAmount,
                        tokenType,
                        receiverAddress: contentData.tokenAddress
                    },
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error transferring tokens");
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error transferring tokens: ${errorMessage}`,
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
                    text: "Send 1 EGLD to erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll send 1 EGLD tokens now...\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SEND_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 TST-a8b23d to erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll send 1 TST-a8b23d tokens now...\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "SEND_TOKEN",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
