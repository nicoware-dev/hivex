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
        const privateKey = runtime.getSetting("MVX_PRIVATE_KEY") || process.env.MVX_PRIVATE_KEY;
        const network = runtime.getSetting("MVX_NETWORK") || process.env.MVX_NETWORK || "mainnet";
        
        const config = {
            MVX_PRIVATE_KEY: privateKey,
            MVX_NETWORK: network,
        };

        return multiversxEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => {
                    // Don't include actual private key values in error messages
                    if (err.path.includes("MVX_PRIVATE_KEY")) {
                        return `MVX_PRIVATE_KEY: ${err.message}`;
                    }
                    return `${err.path.join(".")}: ${err.message}`;
                })
                .join("\n");
            throw new Error(
                `MultiversX configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
