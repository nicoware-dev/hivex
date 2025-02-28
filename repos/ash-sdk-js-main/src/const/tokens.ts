import { ashNetwork } from "../helper/contracts";
import { ChainId, ESDT, IESDTInfo } from "../helper/token/token";
import { AshNetwork } from "./env";

export const VE_ASH_DECIMALS = 18;

const DEVNET_TOKENS_ALPHA: IESDTInfo[] = [
    {
        identifier: "EGLD",
        chainId: ChainId.Devnet,
        symbol: "xEGLD",
        name: "MultiversX",
        decimals: 18,
    },
    {
        identifier: "WEGLD-d7c6bb",
        chainId: ChainId.Devnet,
        symbol: "wEGLD",
        name: "Wrapped EGLD",
        decimals: 18,
    },
    {
        identifier: "ASH-84eab0",
        chainId: ChainId.Devnet,
        symbol: "ASH",
        name: "Ashswap Token",
        decimals: 18,
    },
    {
        identifier: "USDT-3e3720",
        chainId: ChainId.Devnet,
        symbol: "USDT",
        name: "Tether",
        decimals: 6,
    },
    {
        identifier: "USDC-fd47e9",
        chainId: ChainId.Devnet,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
    },
    {
        identifier: "BUSD-b53884",
        chainId: ChainId.Devnet,
        symbol: "BUSD",
        name: "Binance USD",
        decimals: 18,
    },
    {
        identifier: "WEGLD-578a26",
        chainId: ChainId.Devnet,
        symbol: "wEGLD",
        name: "Wrapped EGLD",
        decimals: 18,
    },
    {
        identifier: "SEGLD-b8ba9a",
        chainId: ChainId.Devnet,
        symbol: "sEGLD",
        name: "Liquid Staked EGLD",
        decimals: 18,
    },
    {
        identifier: "AEGLD-126d13",
        chainId: ChainId.Devnet,
        symbol: "aEGLD",
        name: "A EGLD",
        decimals: 18,
    },
];
const DEVNET_TOKENS_BETA: IESDTInfo[] = [
    {
        identifier: "EGLD",
        chainId: ChainId.Devnet,
        symbol: "xEGLD",
        name: "MultiversX",
        decimals: 18,
    },
    {
        identifier: "WEGLD-d7c6bb",
        chainId: ChainId.Devnet,
        symbol: "wEGLD",
        name: "Wrapped EGLD",
        decimals: 18,
    },
    {
        identifier: "ASH-4ce444",
        chainId: ChainId.Devnet,
        symbol: "ASH",
        name: "Ashswap Token",
        decimals: 18,
    },
    {
        identifier: "USDC-8d4068",
        chainId: ChainId.Devnet,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
    },
    {
        identifier: "USDT-188935",
        chainId: ChainId.Devnet,
        symbol: "USDT",
        name: "Tether",
        decimals: 6,
    },
    {
        identifier: "BUSD-632f7d",
        chainId: ChainId.Devnet,
        symbol: "BUSD",
        name: "BUSD",
        decimals: 18,
    },
    {
        identifier: "HTM-fe1f69",
        chainId: ChainId.Devnet,
        symbol: "HTM",
        name: "Hatom Protocol",
        decimals: 18,
    },
    {
        identifier: "UTK-a2a792",
        chainId: ChainId.Devnet,
        symbol: "UTK",
        name: "Utrust",
        decimals: 18,
    },
    {
        identifier: "SEGLD-90b353",
        chainId: ChainId.Devnet,
        symbol: "sEGLD",
        name: "Liquid Staked EGLD",
        decimals: 18,
    },
    {
        identifier: "HSEGLD-8f2360",
        chainId: ChainId.Devnet,
        symbol: "HsEGLD",
        name: "Hatom sEGLD",
        decimals: 8,
    },
];

const MAINNET_TOKENS: IESDTInfo[] = [
    {
        identifier: "EGLD",
        chainId: ChainId.Mainnet,
        symbol: "EGLD",
        name: "MultiversX",
        decimals: 18,
    },
    {
        identifier: "WEGLD-bd4d79",
        chainId: ChainId.Mainnet,
        symbol: "wEGLD",
        name: "Wrapped EGLD",
        decimals: 18,
    },
    {
        identifier: "ASH-a642d1",
        chainId: ChainId.Mainnet,
        symbol: "ASH",
        name: "Ashswap Token",
        decimals: 18,
    },
    {
        identifier: "USDT-f8c08c",
        chainId: ChainId.Mainnet,
        symbol: "USDT",
        name: "Tether",
        decimals: 6,
    },
    {
        identifier: "USDC-c76f1f",
        chainId: ChainId.Mainnet,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
    },
    {
        identifier: "BUSD-40b57e",
        chainId: ChainId.Mainnet,
        symbol: "BUSD",
        name: "Binance USD",
        decimals: 18,
    },
];

export function getTokens() {
    var tokens: IESDTInfo[] = [];
    switch (ashNetwork) {
        case AshNetwork.DevnetAlpha:
            tokens = DEVNET_TOKENS_ALPHA;
            break;
        case AshNetwork.DevnetBeta:
            tokens = DEVNET_TOKENS_BETA;
            break;
        default:
            tokens = MAINNET_TOKENS;
            break;
    }
    return tokens;
}

export function getTokensMap() {
    return Object.fromEntries(
        getTokens().map((token) => [token.identifier, token])
    );
}

export function getToken(identifier: string) {
    return getTokensMap()[identifier];
}

export const MAINNET_TOKENS_MAP = Object.fromEntries(
    MAINNET_TOKENS.map((t) => [t.identifier, t])
);
export const DEVNET_ALPHA_TOKENS_MAP = Object.fromEntries(
    DEVNET_TOKENS_ALPHA.map((t) => [t.identifier, t])
);
export const DEVNET_BETA_TOKENS_MAP = Object.fromEntries(
    DEVNET_TOKENS_BETA.map((t) => [t.identifier, t])
);