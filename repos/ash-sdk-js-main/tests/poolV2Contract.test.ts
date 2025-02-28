import { Address, TokenPayment, Transaction } from "@multiversx/sdk-core/out";
import { ContractManager } from "../src/helper/contracts";
import BigNumber from "bignumber.js";
import { MAINNET_TOKENS_MAP } from "../src/const/tokens";

describe("testing poolV2 constract", () => {
    const poolAddress = "erd1qqqqqqqqqqqqqpgqs8p2v9wr8j48vqrmudcj94wu47kqra3r4fvshfyd9c";
    const poolV2Contract = ContractManager.getPoolV2Contract(poolAddress);
    const tokenIn = MAINNET_TOKENS_MAP["EGLD"]
    const tokenPayment = TokenPayment.fungibleFromBigInteger(
        tokenIn.identifier,
        new BigNumber(10),
        tokenIn.decimals
    );

    test("#addLiquidity", async () => {
        
        const tokenPayments = [tokenPayment]
        const tx = await poolV2Contract.addLiquidity(Address.Zero().bech32(), tokenPayments, new BigNumber(0)) ;

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("#exchange", async () => {
        
        const tx = await poolV2Contract.exchange(
            tokenPayment,
            new BigNumber(1),
        );

        expect(tx).toBeInstanceOf(Transaction);
    });


    test("#exchange", async () => {
        
        const tx = await poolV2Contract.exchange(
            tokenPayment,
            new BigNumber(1),
        );

        expect(tx).toBeInstanceOf(Transaction);
    });
   
});