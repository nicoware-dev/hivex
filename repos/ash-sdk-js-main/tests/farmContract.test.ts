import { Address, TokenPayment, Transaction } from "@multiversx/sdk-core/out";
import { ContractManager } from "../src/helper/contracts";
import { getFarms } from "../src/const/farms";
import BigNumber from "bignumber.js";
import { IMetaESDT } from "../src/interface/tokens";

describe("testing farm constract", () => {
    const farm = getFarms()[0]
    const farmContract = ContractManager.getFarmContract(
        farm.farm_address
    );  

    test("#enterFarm", async () => {
        const stakeAmt = new BigNumber(1);

        const farmTokenInWallet: IMetaESDT[] = [];
        const tokenPayments = farmTokenInWallet.map((t) =>
            TokenPayment.metaEsdtFromBigInteger(
                t.collection,
                t.nonce,
                t.balance,
                farm.farm_token_decimal
            )
        );
        tokenPayments.unshift(
            TokenPayment.fungibleFromBigInteger(
                farm.farming_token_id,
                stakeAmt,
                farm.farming_token_decimal
            )
        );
        const tx = await farmContract.enterFarm(
            Address.Zero().bech32(),
            tokenPayments,
        );

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("#exitFarm", async () => {
        const farmToken: IMetaESDT[] = [];

        const tokenPayments = farmToken.map((t) =>
            TokenPayment.metaEsdtFromBigInteger(
                t.collection,
                t.nonce,
                t.balance
            )
        );
        const tx = await farmContract.exitFarm(
            Address.Zero().bech32(),
            tokenPayments,
        );

        expect(tx).toBeInstanceOf(Array);
    });

    test("#claimRewards", async () => {
        const farmToken: IMetaESDT[] = [];

        const tokenPayments = farmToken.map((t) =>
            TokenPayment.metaEsdtFromBigInteger(
                t.collection,
                t.nonce,
                t.balance,
                farm.farm_token_decimal
            )
        );
        const tx = await farmContract.claimRewards(
            Address.Zero().bech32(),
            tokenPayments,
        );

        expect(tx).toBeInstanceOf(Array);
    });

    test("#checkpointFarmRewards", async () => {
        const tx = await farmContract.checkpointFarmRewards();

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("#queryFarm", async () => {
        
        const farmTokenId = await farmContract.getFarmTokenId();
        const rewardTokenId = await farmContract.getRewardTokenId();
        const farmingTokenId = await farmContract.getFarmingTokenId();
        const rewardPerSec = await farmContract.getRewardPerSec();
        const rewardPerShare = await farmContract.getRewardPerShare();
        const lastRewardBlockTs = await farmContract.getLastRewardBlockTs();
        const divisionSafetyConstant = await farmContract.getDivisionSafetyConstant();
    });

   
});