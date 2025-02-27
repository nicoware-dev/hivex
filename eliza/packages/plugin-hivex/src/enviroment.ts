import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const multiversxEnvSchema = z.object({
    MVX_PRIVATE_KEY: z
        .string()
        .min(1, "MultiversX wallet private key is required"),
    MVX_NETWORK: z.enum(["mainnet", "devnet", "testnet"]),
});

export type MultiversxConfig = z.infer<typeof multiversxEnvSchema>;

export async function validateMultiversxConfig(
    runtime: IAgentRuntime
): Promise<MultiversxConfig> {
    try {
        // Log the environment variables for debugging
        console.log("Checking MultiversX configuration...");
        console.log("MVX_PRIVATE_KEY from runtime:", runtime.getSetting("MVX_PRIVATE_KEY") ? "Set (hidden for security)" : "Not set");
        console.log("MVX_PRIVATE_KEY from process.env:", process.env.MVX_PRIVATE_KEY ? "Set (hidden for security)" : "Not set");
        console.log("MVX_NETWORK from runtime:", runtime.getSetting("MVX_NETWORK"));
        console.log("MVX_NETWORK from process.env:", process.env.MVX_NETWORK);
        
        // Get the private key from runtime settings or environment variables
        const privateKey = runtime.getSetting("MVX_PRIVATE_KEY") || process.env.MVX_PRIVATE_KEY;
        
        // Get the network from runtime settings or environment variables, default to mainnet
        const network = runtime.getSetting("MVX_NETWORK") || process.env.MVX_NETWORK || "mainnet";
        
        const config = {
            MVX_PRIVATE_KEY: privateKey,
            MVX_NETWORK: network,
        };

        console.log("Final config (network only):", { MVX_NETWORK: config.MVX_NETWORK });
        
        // Validate the configuration against the schema
        return multiversxEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            
            // Provide more helpful error messages
            let helpMessage = "\n\nTo fix this issue:";
            helpMessage += "\n1. Make sure you have set the MVX_PRIVATE_KEY and MVX_NETWORK in your .env file";
            helpMessage += "\n2. MVX_NETWORK must be one of: mainnet, devnet, testnet";
            helpMessage += "\n3. Restart your agent after updating the .env file";
            
            throw new Error(
                `MultiversX configuration validation failed:\n${errorMessages}${helpMessage}`
            );
        }
        throw error;
    }
}
