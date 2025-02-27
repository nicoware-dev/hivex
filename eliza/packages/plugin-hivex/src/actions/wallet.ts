import {
    elizaLogger,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";
import { initWalletProvider } from "../providers/wallet";
import { validateMultiversxConfig } from "../enviroment";

export default {
    name: "GET_WALLET_INFO",
    similes: [
        "WALLET_INFO",
        "WALLET_ADDRESS",
        "WALLET_BALANCE",
        "MY_WALLET",
        "SHOW_WALLET",
        "MULTIVERSX_WALLET",
        "MVX_WALLET",
        "SHOW_ME_MY_WALLET",
        "SHOW_ME_MY_WALLET_ADDRESS",
        "SHOW_ME_MY_MULTIVERSX_WALLET",
        "SHOW_ME_MY_MULTIVERSX_WALLET_ADDRESS",
        "WHAT_IS_MY_WALLET_ADDRESS",
        "WHAT_IS_MY_MULTIVERSX_WALLET_ADDRESS",
        "GET_MY_WALLET_ADDRESS",
        "GET_MY_MULTIVERSX_WALLET_ADDRESS"
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
    description: "Get MultiversX wallet information",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting GET_WALLET_INFO handler...");

        try {
            // Validate MultiversX configuration
            await validateMultiversxConfig(runtime);
            
            // Initialize wallet provider
            const walletProvider = initWalletProvider(runtime);
            
            const address = walletProvider.getAddress().bech32();
            const balanceRaw = await walletProvider.getBalance();
            
            // Format the balance with proper decimal places (18 decimals for EGLD)
            const balanceInEGLD = (BigInt(balanceRaw) / BigInt(10**18)).toString();
            const remainderInWei = (BigInt(balanceRaw) % BigInt(10**18)).toString().padStart(18, '0');
            const formattedBalance = `${balanceInEGLD}.${remainderInWei.substring(0, 6)}`;
            
            const network = runtime.getSetting("MVX_NETWORK") || "mainnet";
            const explorerURL = network === "mainnet" 
                ? "https://explorer.multiversx.com" 
                : `https://${network}-explorer.multiversx.com`;
            
            const walletInfo = `MultiversX Wallet Address: ${address}\nBalance: ${formattedBalance} EGLD\nNetwork: ${network}\nExplorer: ${explorerURL}/accounts/${address}`;
            
            elizaLogger.log("Retrieved wallet info successfully");
            
            if (callback) {
                callback({
                    text: walletInfo,
                    content: { 
                        address,
                        balance: formattedBalance,
                        network,
                        explorerUrl: `${explorerURL}/accounts/${address}`
                    },
                });
            }
            
            return true;
        } catch (error) {
            elizaLogger.error("Error retrieving wallet info");
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error retrieving wallet information: ${errorMessage}`,
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
                    text: "What's my MultiversX wallet address?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your MultiversX wallet address is erd1...\nBalance: 10.5 EGLD\nNetwork: mainnet\nExplorer: https://explorer.multiversx.com/accounts/erd1...",
                    action: "GET_WALLET_INFO",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me my wallet balance",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your MultiversX wallet has a balance of 10 EGLD on mainnet.\nMultiversX Wallet Address: erd1...\nExplorer: https://explorer.multiversx.com/accounts/erd1...",
                    action: "GET_WALLET_INFO",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me my MultiversX wallet address",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "MultiversX Wallet Address: erd1...\nBalance: 10.5 EGLD\nNetwork: mainnet\nExplorer: https://explorer.multiversx.com/accounts/erd1...",
                    action: "GET_WALLET_INFO",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 