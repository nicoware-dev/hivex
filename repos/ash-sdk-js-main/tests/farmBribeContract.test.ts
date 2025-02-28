import { Address, Transaction } from "@multiversx/sdk-core/out";
import { ContractManager } from "../src/helper/contracts";
import { getDappContract } from "../src/const/ashswapConfig";

describe("testing farm bride constract", () => {
    const contract = ContractManager.getFarmBribeContract(
        getDappContract().farmBribe
    );

    test("#claimReward", async () => {
        const tx = await contract.claimReward(Address.Zero(), "");

        expect(tx).toBeInstanceOf(Transaction);
    });

   
});