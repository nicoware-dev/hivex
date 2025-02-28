import { Address, Transaction } from "@multiversx/sdk-core/out";
import { ContractManager } from "../src/helper/contracts";
import { getDappContract } from "../src/const/ashswapConfig";

describe("testing fee distributor contract", () => {
    const fdContract = ContractManager.getFeeDistributorContract(
        getDappContract().feeDistributor
    );

    test("claim test case", async () => {
        const tx = await fdContract.claim(Address.Zero());

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("checkpointToken test case", async () => {
        const tx = await fdContract.checkpointToken();

        expect(tx).toBeInstanceOf(Transaction);
    });
});