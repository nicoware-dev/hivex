import { ContractManager } from "../src/helper/contracts";
import BigNumber from "bignumber.js";
import { getWrappedEgld } from "../src/const/wrappedEGLD";
import { Transaction } from "@multiversx/sdk-core/out";

describe("testing wrapped EGLD contract", () => {
    const contract = ContractManager.getWrappedEGLDContract(
        getWrappedEgld().wegldContracts[0]
    );

    test("#wrapEgld", async () => {
        const tx = await contract.wrapEgld(new BigNumber(0));

        expect(tx).toBeInstanceOf(Transaction);
    });

   
});