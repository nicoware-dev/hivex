import { Address, TokenPayment, Transaction } from "@multiversx/sdk-core/out";
import { ContractManager } from "../src/helper/contracts";
import BigNumber from "bignumber.js";
import { MAINNET_TOKENS_MAP } from "../src/const/tokens";

describe("testing pool constract", () => {
    const poolAddress = "erd1qqqqqqqqqqqqqpgqs8p2v9wr8j48vqrmudcj94wu47kqra3r4fvshfyd9c";
    const poolContract = ContractManager.getPoolContract(poolAddress);
    const tokenIn = MAINNET_TOKENS_MAP["EGLD"]
    const tokenOut = MAINNET_TOKENS_MAP["ASH-a642d1"];
    const tokenPayment = TokenPayment.fungibleFromBigInteger(
        tokenIn.identifier,
        new BigNumber(10),
        tokenIn.decimals
    );
    
    test("#addLiquidity", async () => {
        
        const tokenPayments = [tokenPayment]
        const tx = await poolContract.addLiquidity(Address.Zero().bech32(), tokenPayments, new BigNumber(0)) ;

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("#exchange", async () => {
        
        const tx = await poolContract.exchange(
            tokenPayment,
            tokenOut.identifier,
            new BigNumber(1),
        );

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("#queryPool", async () => {
        
        const totalSupply = await poolContract.getTotalSupply();
        const lpToken = await poolContract.getLpToken();
        const tokens = await poolContract.getTokens();
        const reserves = await poolContract.getReserves();
        const swapFeePercent = await poolContract.getSwapFeePercent();
        const adminFeePercent = await poolContract.getAdminFeePercent();
        const ampFactor = await poolContract.getAmpFactor();
    });

   
});