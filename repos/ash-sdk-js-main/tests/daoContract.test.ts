import { Transaction } from "@multiversx/sdk-core/out";
import { ContractManager } from "../src/helper/contracts";
import BigNumber from "bignumber.js";
import { getDappContract } from "../src/const/ashswapConfig";
import { AshNetwork } from "../src/const/env";

describe("testing dao constract", () => {
    ContractManager.setAshNetwork(AshNetwork.DevnetAlpha)

    const contract = ContractManager.getDAOContract(
        getDappContract().dao
    );

    test("#execute", async () => {
        const tx = await contract.execute(0);

        expect(tx).toBeInstanceOf(Transaction);
    });

    test("#vote", async () => {
        const tx = await contract.vote(0, new BigNumber(0), new BigNumber(0));

        expect(tx).toBeInstanceOf(Transaction);
    });

});