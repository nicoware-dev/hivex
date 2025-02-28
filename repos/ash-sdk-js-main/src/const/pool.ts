import { ashNetwork } from "../helper/contracts";
import { ChainId } from "../helper/token/token";
import IPool, { EPoolType } from "../interface/pool";
import { AshNetwork } from "./env";
import { DEVNET_ALPHA_TOKENS_MAP, DEVNET_BETA_TOKENS_MAP, MAINNET_TOKENS_MAP } from "./tokens";

type PoolConfig = {
    beta: IPool[];
    alpha: IPool[];
};
const devnet: PoolConfig = {
    alpha: [
        {
            address:
                "erd1qqqqqqqqqqqqqpgq3k6l3skxzf0derlh5nknv5qr6fuuz82nrmcqwmm23p",
            lpToken: {
                identifier: "ALP-6539d6",
                chainId: ChainId.Devnet,
                symbol: "LPT-3pool",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [
                DEVNET_ALPHA_TOKENS_MAP["USDC-fd47e9"],
                DEVNET_ALPHA_TOKENS_MAP["USDT-3e3720"],
                DEVNET_ALPHA_TOKENS_MAP["BUSD-b53884"],
            ],
            type: EPoolType.PlainPool,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgqq369pu8z594n4nghpyg3jgkwxc2ccgpwrmcqx6s2xt",
            lpToken: {
                identifier: "ALP-e58883",
                chainId: ChainId.Devnet,
                symbol: "LPT-BUSD-wEGLD",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [DEVNET_ALPHA_TOKENS_MAP["BUSD-b53884"], DEVNET_ALPHA_TOKENS_MAP["WEGLD-578a26"]],
            type: EPoolType.PoolV2,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgq0wn05f529heqv5r8dkl6u8n3s2hsxa6rrmcqdlutmw",
            lpToken: {
                identifier: "ALP-21e933",
                chainId: ChainId.Devnet,
                symbol: "LPT-ASH-USDT",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [DEVNET_ALPHA_TOKENS_MAP["USDT-3e3720"], DEVNET_ALPHA_TOKENS_MAP["ASH-84eab0"]],
            type: EPoolType.PoolV2,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgqy5kf74ltag6235ksu4h653y53w33ysumrmcq07hjd3",
            lpToken: {
                identifier: "ALP-33fc69",
                chainId: ChainId.Devnet,
                symbol: "LPT-wEGLD-sEGLD",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [DEVNET_ALPHA_TOKENS_MAP["WEGLD-578a26"], DEVNET_ALPHA_TOKENS_MAP["SEGLD-b8ba9a"]],
            type: EPoolType.LendingPool,
        },
    ],
    beta: [
        {
            address:
                "erd1qqqqqqqqqqqqqpgq3sfgh89vurcdet6lwl4cysqddeyk0rqh2gesqpkk4e",
            lpToken: {
                identifier: "ALP-9b7a73",
                chainId: ChainId.Devnet,
                symbol: "ALP-3pool",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [
                DEVNET_BETA_TOKENS_MAP["USDC-8d4068"],
                DEVNET_BETA_TOKENS_MAP["USDT-188935"],
                DEVNET_BETA_TOKENS_MAP["BUSD-632f7d"],
            ],
            type: EPoolType.PlainPool,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgq65a4d6rv2czrk3uvfcxan7543geyvdp82ges44d43y",
            lpToken: {
                identifier: "ALP-6b7c94",
                chainId: ChainId.Devnet,
                symbol: "ALP-BUSD-wEGLD",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [DEVNET_BETA_TOKENS_MAP["BUSD-632f7d"], DEVNET_BETA_TOKENS_MAP["WEGLD-d7c6bb"]],
            type: EPoolType.PoolV2,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgq9flqlgtsek6k5ppcqh0hphzv9vv2dxn62geskve0ly",
            lpToken: {
                identifier: "ALP-0e6b1c",
                chainId: ChainId.Devnet,
                symbol: "ALP-ASH-USDT",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [DEVNET_BETA_TOKENS_MAP["USDT-188935"], DEVNET_BETA_TOKENS_MAP["ASH-4ce444"]],
            type: EPoolType.PoolV2,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgqtrla4ke85vs57e3jlua9dkm0ycgn6n2c2gesa02uuc",
            lpToken: {
                identifier: "ALP-3c3066",
                chainId: ChainId.Devnet,
                symbol: "ALP-BUSD-UTK",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [DEVNET_BETA_TOKENS_MAP["BUSD-632f7d"], DEVNET_BETA_TOKENS_MAP["UTK-a2a792"]],
            type: EPoolType.PoolV2,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgqwqrrwk3npn4d26q5f0ltsang08q0fj8w2gesa4karx",
            lpToken: {
                identifier: "ALP-b9e453",
                chainId: ChainId.Devnet,
                symbol: "ALP-USDT-HTM",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [DEVNET_BETA_TOKENS_MAP["USDT-188935"], DEVNET_BETA_TOKENS_MAP["HTM-fe1f69"]],
            type: EPoolType.PoolV2,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgq6t46575knqqfamnchlfgxvd56x2ymhvf2ges6xpr4s",
            lpToken: {
                identifier: "ALP-bf3d53",
                chainId: ChainId.Devnet,
                symbol: "ALP-sEGLD",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [
                DEVNET_BETA_TOKENS_MAP["WEGLD-d7c6bb"],
                DEVNET_BETA_TOKENS_MAP["SEGLD-90b353"],
            ],
            type: EPoolType.LendingPool,
        },
        {
            address:
                "erd1qqqqqqqqqqqqqpgqn4uu4yauhv8pjjvhvgxmhyqk82ftzytq2gesrmrprk",
            lpToken: {
                identifier: "ALP-9836b4",
                chainId: ChainId.Devnet,
                symbol: "ALP-sEGLD",
                name: "Ashswap LP",
                decimals: 18,
            },
            tokens: [
                DEVNET_BETA_TOKENS_MAP["WEGLD-d7c6bb"],
                DEVNET_BETA_TOKENS_MAP["HSEGLD-8f2360"],
            ],
            type: EPoolType.LendingPool,
        },
    ],
};

const mainnet: IPool[] = [
    {
        address:
            "erd1qqqqqqqqqqqqqpgqs8p2v9wr8j48vqrmudcj94wu47kqra3r4fvshfyd9c",
        lpToken: {
            identifier: "ALP-afc922",
            chainId: ChainId.Mainnet,
            symbol: "ALP-3pool",
            name: "Ashswap LP",
            decimals: 18,
        },
        tokens: [
            MAINNET_TOKENS_MAP["USDC-c76f1f"],
            MAINNET_TOKENS_MAP["USDT-f8c08c"],
            MAINNET_TOKENS_MAP["BUSD-40b57e"],
        ],
        type: EPoolType.PlainPool,
    },
    {
        address:
            "erd1qqqqqqqqqqqqqpgq5l05l0ts4lphdktx33apl0ss9rzf4r244fvsva6j53",
        lpToken: {
            identifier: "ALP-5f9191",
            chainId: ChainId.Mainnet,
            symbol: "ALP-BUSD-WEGLD",
            name: "Ashswap LP",
            decimals: 18,
        },
        tokens: [MAINNET_TOKENS_MAP["BUSD-40b57e"], MAINNET_TOKENS_MAP["WEGLD-bd4d79"]],
        type: EPoolType.PoolV2,
    },
    {
        address:
            "erd1qqqqqqqqqqqqqpgqn7969pvzaatp8p9yu6u5h2ce2gyw0x9j4fvsplvthl",
        lpToken: {
            identifier: "ALP-2d0cf8",
            chainId: ChainId.Mainnet,
            symbol: "ALP-USDT-ASH",
            name: "Ashswap LP",
            decimals: 18,
        },
        tokens: [MAINNET_TOKENS_MAP["USDT-f8c08c"], MAINNET_TOKENS_MAP["ASH-a642d1"]],
        type: EPoolType.PoolV2,
    },
];

export function getPools(): IPool[] {
    var pools: IPool[] = [];
    switch (ashNetwork) {
        case AshNetwork.DevnetAlpha:
            pools = devnet.alpha;
            break;
        case AshNetwork.DevnetBeta:
            pools = [...devnet.beta];
            break;
        default:
            pools = [...mainnet];
            break;
    }
    return pools;
}

export function getPoolsMap() {
    return Object.fromEntries(
        getPools().map((p) => [p.address, p])
    );
}

export function getPool(address: string) {
    return getPoolsMap()[address];
}
