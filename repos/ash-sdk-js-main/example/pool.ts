import { TokenPayment } from "@multiversx/sdk-core/out";
import { ProxyNetworkProvider } from "@multiversx/sdk-network-providers/out";
import { ContractManager } from '../src/helper/contracts';
import { MVXProxyNetworkAddress } from "../src/helper/proxy/util";
import { ChainId } from "../src/helper/token/token";
import PoolContract from "../src/helper/contracts/pool";
import BigNumber from "bignumber.js";
import { getPool } from "../src/const/pool";
import { AshNetwork } from "../src/const/env";
import { TokenAmount } from "../src/helper/token/tokenAmount";
import { Percent } from "../src/helper/fraction/percent";
import { EPoolType } from "../src/interface/pool";
import { getToken } from "../src/const/tokens";


const poolAddress = "erd1qqqqqqqqqqqqqpgqs8p2v9wr8j48vqrmudcj94wu47kqra3r4fvshfyd9c"
ContractManager.setAshNetwork(AshNetwork.Mainnet)
estimateAmountOut()

async function swap() {

    const proxy = new ProxyNetworkProvider(MVXProxyNetworkAddress.Mainnet)
    const tokenIn = getToken("EGLD")
    const tokenOut = getToken("ASH-a642d1");
    const tokenPayment = TokenPayment.fungibleFromBigInteger(
        tokenIn.identifier,
        new BigNumber(10),
        tokenIn.decimals
    );

    const poolContract = ContractManager.getPoolContract(
        poolAddress
    ).onChain(ChainId.Mainnet).onProxy(proxy);

    const tx = await poolContract.exchange(
        tokenPayment,
        tokenOut.identifier,
        new BigNumber(1),
    );

    return tx;

}

async function estimateAmountOut() {
    const pool = getPool(poolAddress);
    if (pool.type == EPoolType.PoolV2) {
        const poolContract = ContractManager.getPoolV2Contract(
            poolAddress
        );
        const amp = await poolContract.getA();
        const xp = await poolContract.getXp();
        const reserves = await poolContract.getReserves();
        const priceScale = await poolContract.getPriceScale();
        const gamma = await poolContract.getGamma();
        const d = await poolContract.getD();
        const futureAGammaTime = await poolContract.getFutureAGammaTime();
        const feeGamma = await poolContract.getFeeGamma();
        const midFee = await poolContract.getMidFee();
        const outFee = await poolContract.getOutFee();
        const tokenInIndex = pool.tokens.findIndex(
            (t) => t.identifier === "EGLD"
        );
        const tokenOutIndex = pool.tokens.findIndex(
            (t) => t.identifier === "ASH-a642d1"
        );
        const context = {
            priceScale: priceScale,
            reserves: reserves,
            ann: amp,
            gamma: gamma,
            d: d,
            futureAGammaTime: futureAGammaTime,
            xp: xp,
            feeGamma: feeGamma,
            midFee: midFee,
            outFee: outFee
        };
        return await PoolContract.estimateAmountOut(
            pool.tokens,
            context,
            tokenInIndex,
            tokenOutIndex,
            new BigNumber(1)
        )
    } else {
        const poolContract = ContractManager.getPoolContract(
            poolAddress
        );
    
        const ampFactor = await poolContract.getAmpFactor();
        const reserves = await poolContract.getReserves();
        const reserveAmounts = pool.tokens.map((t, i) => new TokenAmount(t, reserves[i]));
        const tokenInAmount = new TokenAmount(pool.tokens[0], new BigNumber(1))
        const tokenOut = pool.tokens[1]
        const swap = await poolContract.getSwapFeePercent();
        const admin = await poolContract.getAdminFeePercent();
        const fees = {
            swap: new Percent(swap || 0, 100_000),
            admin: new Percent(admin || 0, 100_000),
        }
    
        return await PoolContract.calculateEstimatedSwapOutputAmount(
            new BigNumber(ampFactor),
            reserveAmounts,
            tokenInAmount,
            tokenOut,
            fees
        )
    }
}

async function estimateAddLiquidity() {
    const poolContract = ContractManager.getPoolContract(
        poolAddress
    );

    return await poolContract.estimateAddLiquidity([]);

}

async function queryPool() {
    const poolContract = ContractManager.getPoolContract(
        poolAddress
    );
    const totalSupply = await poolContract.getTotalSupply();
    const lpToken = await poolContract.getLpToken();
    const tokens = await poolContract.getTokens();
    const reserves = await poolContract.getReserves();
    const swapFeePercent = await poolContract.getSwapFeePercent();
    const adminFeePercent = await poolContract.getAdminFeePercent();
    const ampFactor = await poolContract.getAmpFactor();
}