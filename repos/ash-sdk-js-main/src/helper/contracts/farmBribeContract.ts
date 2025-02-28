import { Address, TokenPayment } from "@multiversx/sdk-core/out";
import farmBribeAbi from "../../abi/farm_bribe.abi.json";
import Contract from "./contract";

class FarmBribeContract extends Contract<typeof farmBribeAbi> {
    constructor(address: string) {
        super(address, farmBribeAbi);
    }

    async addRewardAmount(sender: string, farmAddress: Address, tokenPayments: TokenPayment[]) {
        const interaction = this.contract.methods
            .addRewardAmount([farmAddress])
            .withMultiESDTNFTTransfer(tokenPayments, new Address(sender))
            .withGasLimit(50_000_000 + tokenPayments.length * 2_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async claimReward(farmAddress: Address, tokenId: string){
        const interaction = this.contract.methods.claimReward([farmAddress, tokenId]).withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    /**
     * other endpoints
     */
    
    async commitTransferOwnership(farmAddress: Address) {
        const interaction = this.contract.methods
            .commitTransferOwnership([farmAddress])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async applyTransferOwnership() {
        const interaction = this.contract.methods
            .applyTransferOwnership()
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async addWhitelistToken(tokenId: string) {
        const interaction = this.contract.methods
            .addWhitelistToken([tokenId])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async removeWhitelistToken(tokenId: string) {
        const interaction = this.contract.methods
            .removeWhitelistToken([tokenId])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async checkpointRewardPerToken(farmAddress: Address, tokenId: string) {
        const interaction = this.contract.methods
            .checkpointRewardPerToken([farmAddress, tokenId])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async getClaimable(address: Address, farmAddress: Address, tokenId: string) {
        const interaction = this.contract.methods
            .getClaimable([address, farmAddress, tokenId])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    /**
     * @returns Address
     */
    async getAdmin() {
        const interaction = this.contract.methods
            .getAdmin()
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async getFutureAdmin() {
        const interaction = this.contract.methods
            .getFutureAdmin()
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async getFarmControllerAddress() {
        const interaction = this.contract.methods
            .getFarmControllerAddress()
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async getClaimsPerFarm(farmAddress: Address, tokenId: string) {
        const interaction = this.contract.methods
            .getClaimsPerFarm([farmAddress, tokenId])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async getRewardPerFarm(farmAddress: Address, tokenId: string) {
        const interaction = this.contract.methods
            .getRewardPerFarm([farmAddress, tokenId])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async getActivePeriod(farmAddress: Address, tokenId: string) {
        const interaction = this.contract.methods.getActivePeriod([farmAddress, tokenId]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as number) || 0;
    }

    async getLastUserClaim(address: Address, farmAddress: Address, tokenId: string) {
        const interaction = this.contract.methods.getLastUserClaim([address, farmAddress, tokenId]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as number) || 0;
    }

    async getRewardsPerFarm(address: Address) {
        const interaction = this.contract.methods
            .getRewardsPerFarm([address])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async getWhitelistTokens(tokenId: string) {
        const interaction = this.contract.methods
            .getWhitelistTokens([tokenId])
            .withGasLimit(50_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

}

export default FarmBribeContract;
