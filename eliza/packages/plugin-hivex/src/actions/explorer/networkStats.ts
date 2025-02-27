import {
    elizaLogger,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";
import { validateMultiversxConfig } from "../../enviroment";
import { ApiNetworkProvider } from "@multiversx/sdk-core";

// Define interfaces for the network data to handle type issues
interface NetworkStatusData {
    Status?: string;
    CurrentRound?: number;
    EpochNumber?: number;
    [key: string]: any;
}

interface NetworkConfigData {
    RoundDuration: number;
    erd_num_shards_without_meta?: number;
    [key: string]: any;
}

interface NetworkStatsData {
    Nodes?: number;
    Validators?: number;
    Transactions?: number;
    TransactionsLast24h?: number;
    TPS?: number;
    PeakTPS?: number;
    Blocks?: number;
    Accounts?: number;
    [key: string]: any;
}

/**
 * Network stats action for fetching and displaying general statistics about the MultiversX network
 * This action responds to queries like "show network stats" and displays:
 * - Network status
 * - Shards information
 * - TPS (Transactions Per Second)
 * - Block height
 * - Other network metrics
 */
export default {
    name: "GET_NETWORK_STATS",
    similes: [
        "NETWORK_STATS",
        "NETWORK_STATUS",
        "NETWORK_INFO",
        "BLOCKCHAIN_STATS",
        "BLOCKCHAIN_STATUS",
        "BLOCKCHAIN_INFO",
        "SHOW_NETWORK_STATS",
        "SHOW_NETWORK_STATUS",
        "SHOW_NETWORK_INFO",
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
    description: "Get general statistics about the MultiversX network",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting GET_NETWORK_STATS handler...");

        try {
            // Validate MultiversX configuration
            await validateMultiversxConfig(runtime);
            
            // Get network configuration
            const network = runtime.getSetting("MVX_NETWORK") || "mainnet";
            const apiURL = network === "mainnet" 
                ? "https://api.multiversx.com" 
                : `https://${network}-api.multiversx.com`;
            const explorerURL = network === "mainnet" 
                ? "https://explorer.multiversx.com" 
                : `https://${network}-explorer.multiversx.com`;
            
            // Create API provider
            const apiProvider = new ApiNetworkProvider(apiURL, { clientName: "hivex-explorer" });
            
            // Fetch network statistics
            const networkConfig = await apiProvider.getNetworkConfig() as unknown as NetworkConfigData;
            const networkStatus = await apiProvider.getNetworkStatus() as unknown as NetworkStatusData;
            const networkStats = await apiProvider.getNetworkGeneralStatistics() as unknown as NetworkStatsData;
            
            // Format network stats response
            let networkStatsText = `MultiversX Network Statistics (${network})\n\n`;
            
            // Add network status
            networkStatsText += `Status: ${networkStatus.Status || "Unknown"}\n`;
            networkStatsText += `Current Round: ${networkStatus.CurrentRound || "Unknown"}\n`;
            networkStatsText += `Epoch: ${networkStatus.EpochNumber || "Unknown"}\n`;
            networkStatsText += `Round Time: ${networkConfig.RoundDuration / 1000} seconds\n\n`;
            
            // Add shards information
            networkStatsText += `Shards: ${networkConfig.erd_num_shards_without_meta || 3}\n`;
            networkStatsText += `Nodes: ${networkStats.Nodes || "Unknown"}\n`;
            networkStatsText += `Validators: ${networkStats.Validators || "Unknown"}\n\n`;
            
            // Add transactions information
            networkStatsText += `Transactions:\n`;
            networkStatsText += `- Total: ${networkStats.Transactions || "Unknown"}\n`;
            networkStatsText += `- Last 24h: ${networkStats.TransactionsLast24h || "Unknown"}\n`;
            
            // Add TPS information if available
            if (networkStats.TPS !== undefined) {
                networkStatsText += `- Current TPS: ${networkStats.TPS}\n`;
            }
            if (networkStats.PeakTPS !== undefined) {
                networkStatsText += `- Peak TPS: ${networkStats.PeakTPS}\n`;
            }
            networkStatsText += "\n";
            
            // Add blocks information
            networkStatsText += `Blocks:\n`;
            networkStatsText += `- Total: ${networkStats.Blocks || "Unknown"}\n`;
            
            // Add accounts information
            networkStatsText += `Accounts: ${networkStats.Accounts || "Unknown"}\n\n`;
            
            // Add footer with explorer link
            networkStatsText += `View more details on explorer: ${explorerURL}/stats`;
            
            // Prepare network stats content for callback
            const networkStatsContent = {
                network,
                explorerUrl: `${explorerURL}/stats`,
                status: networkStatus.Status?.toString() || "Unknown",
                currentRound: networkStatus.CurrentRound?.toString() || "Unknown",
                epoch: networkStatus.EpochNumber?.toString() || "Unknown",
                roundDuration: (networkConfig.RoundDuration / 1000).toString(),
                shards: (networkConfig.erd_num_shards_without_meta || 3).toString(),
                nodes: networkStats.Nodes?.toString() || "Unknown",
                validators: networkStats.Validators?.toString() || "Unknown",
                totalTransactions: networkStats.Transactions?.toString() || "Unknown",
                last24hTransactions: networkStats.TransactionsLast24h?.toString() || "Unknown",
                currentTPS: networkStats.TPS?.toString() || "N/A",
                peakTPS: networkStats.PeakTPS?.toString() || "N/A",
                totalBlocks: networkStats.Blocks?.toString() || "Unknown",
                totalAccounts: networkStats.Accounts?.toString() || "Unknown",
            };
            
            elizaLogger.log("Network statistics retrieved successfully");
            
            if (callback) {
                callback({
                    text: networkStatsText,
                    content: networkStatsContent,
                });
            }
            
            return true;
        } catch (error) {
            elizaLogger.error("Error retrieving network statistics");
            if (callback) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                callback({
                    text: `Error retrieving network statistics: ${errorMessage}`,
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
                    text: "Show me network stats",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "MultiversX Network Statistics (mainnet)\n\nStatus: Running\nCurrent Round: 15243789\nEpoch: 1524\nRound Time: 6 seconds\n\nShards: 3\nNodes: 3216\nValidators: 2169\n\nTransactions:\n- Total: 156789012\n- Last 24h: 234567\n- Current TPS: 12.5\n- Peak TPS: 30.2\n\nBlocks:\n- Total: 15243789\nAccounts: 1876543\n\nView more details on explorer: https://explorer.multiversx.com/stats",
                    action: "GET_NETWORK_STATS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the current status of the MultiversX network?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "MultiversX Network Statistics (mainnet)\n\nStatus: Running\nCurrent Round: 15243789\nEpoch: 1524\nRound Time: 6 seconds\n\nShards: 3\nNodes: 3216\nValidators: 2169\n\nTransactions:\n- Total: 156789012\n- Last 24h: 234567\n- Current TPS: 12.5\n- Peak TPS: 30.2\n\nBlocks:\n- Total: 15243789\nAccounts: 1876543\n\nView more details on explorer: https://explorer.multiversx.com/stats",
                    action: "GET_NETWORK_STATS",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 