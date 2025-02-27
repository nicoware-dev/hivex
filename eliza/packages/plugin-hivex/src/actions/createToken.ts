import {
    elizaLogger,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    generateObject,
    composeContext,
    type Action,
} from "@elizaos/core";
import { initWalletProvider } from "../providers/wallet";
import { validateMultiversxConfig } from "../enviroment";
import { z } from "zod";

export interface CreateTokenContent extends Content {
    tokenName: string;
    tokenTicker: string;
    decimals: string;
    amount: string;
}

function isCreateTokenContent(
    _runtime: IAgentRuntime,
    content: any
): content is CreateTokenContent {
    return (
        typeof content.tokenName === "string" &&
        typeof content.tokenTicker === "string" &&
        typeof content.amount === "string"
    );
}

const createTokenTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenName": "TEST",
    "tokenTicker": "TST",
    "amount: 100,
    "decimals": 18
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token creation:
- Token name
- Token ticker
- Amount
- Decimals

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema for create token content
const createTokenSchema = z.object({
    tokenName: z.string(),
    tokenTicker: z.string(),
    amount: z.string(),
    decimals: z.string().default("18"),
});

export default {
    name: "CREATE_TOKEN",
    similes: ["DEPLOY_TOKEN", "ISSUE_TOKEN", "MINT_TOKEN"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            await validateMultiversxConfig(runtime);
            return true;
        } catch (error) {
            elizaLogger.error("MultiversX configuration validation failed");
            return false;
        }
    },
    description: "Create a new token.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting CREATE_TOKEN handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: createTokenTemplate,
        });

        // Generate transfer content
        const content = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.SMALL,
            schema: createTokenSchema,
        });

        // Get the actual content data
        const contentData = content.object ? content.object : content;

        // Validate transfer content
        if (!isCreateTokenContent(runtime, contentData)) {
            elizaLogger.error("Invalid content for CREATE_TOKEN action.");
            if (callback) {
                callback({
                    text: "Unable to process token creation request. Invalid content provided.",
                    content: { error: "Invalid token creation content" },
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

            const txHash = await walletProvider.createESDT({
                tokenName: contentData.tokenName,
                amount: contentData.amount,
                decimals: Number(contentData.decimals) || 18,
                tokenTicker: contentData.tokenTicker,
            });
            
            elizaLogger.log(`Token created successfully: ${contentData.tokenName} (${contentData.tokenTicker})`);
            
            if (callback) {
                callback({
                    text: `Successfully created token ${contentData.tokenName} (${contentData.tokenTicker}) with an initial supply of ${contentData.amount} and ${contentData.decimals} decimals.\n\nTransaction hash: ${txHash}\nView on explorer: ${explorerURL}/transactions/${txHash}`,
                    content: { 
                        success: true,
                        txHash,
                        explorerUrl: `${explorerURL}/transactions/${txHash}`,
                        tokenName: contentData.tokenName,
                        tokenTicker: contentData.tokenTicker,
                        amount: contentData.amount,
                        decimals: contentData.decimals
                    },
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error creating token");
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error creating token: ${errorMessage}`,
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
                    text: "Create a token XTREME with ticker XTR and supply of 10000",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully created token XTREME (XTR) with an initial supply of 10000 and 18 decimals.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "CREATE_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a token TEST with ticker TST, 18 decimals and supply of 10000",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully created token TEST (TST) with an initial supply of 10000 and 18 decimals.\n\nTransaction hash: 0x123abc...\nView on explorer: https://explorer.multiversx.com/transactions/0x123abc...",
                    action: "CREATE_TOKEN",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
