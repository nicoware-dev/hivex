import { Address, Transaction } from "@multiversx/sdk-core/out";
import { ContractManager } from "../src/helper/contracts";
import { getDappContract } from "../src/const/ashswapConfig";
import { AshNetwork } from "../src/const/env";

describe("testing dao bride constract", () => {
    ContractManager.setAshNetwork(AshNetwork.DevnetAlpha)

    const contract = ContractManager.getDAOBribeContract(
        getDappContract().daoBribe
    );

    test("#claimReward", async () => {
        const tx = await contract.claimReward(0, []);

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("#addRewardAmount", async () => {
        const tx = await contract.addRewardAmount(Address.Zero().bech32(), 0, []);

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("#withdrawReward", async () => {
        const tx = await contract.withdrawReward(0);

        expect(tx).toBeInstanceOf(Transaction);
    });

});