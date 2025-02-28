import { Transaction } from "@multiversx/sdk-core/out";
import { getDappContract } from "../src/const/ashswapConfig";
import { ContractManager } from "../src/helper/contracts";

describe("testing vosting escrow constract", () => {
    const veContract = ContractManager.getVotingEscrowContract(
        getDappContract().voteEscrowedContract
    );

    test("#withdraw", async () => {
        const tx = await veContract.withdraw();

        expect(tx).toBeInstanceOf(Transaction);
    });

   
});