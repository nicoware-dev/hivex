import { Address } from "@multiversx/sdk-core/out";
import { ContractManager } from "../src/helper/contracts";
import { getDappContract } from "../src/const/ashswapConfig";

async function feeDistributor() {
    const fdContract = ContractManager.getFeeDistributorContract(
        getDappContract().feeDistributor
    );
    const tx = await fdContract.claim(Address.Zero());
    return tx;
}