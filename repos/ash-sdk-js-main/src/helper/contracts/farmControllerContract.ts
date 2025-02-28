import Contract from "./contract";
import farmControllerAbi from "../../abi/farm_controller.abi.json";
import { Address } from "@multiversx/sdk-core/out";
import BigNumber from "bignumber.js";

class FarmControllerContract extends Contract<typeof farmControllerAbi> {
    constructor(address: string) {
        super(address, farmControllerAbi);
    }

    async voteForFarmWeights(farmAddress: Address, weight: BigNumber) {
        let interaction = this.contract.methods.voteForFarmWeights([
            farmAddress,
            weight,
        ]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    /**
     * other endpoints
     */

    async commitTransferOwnership(farmAddress: Address) {
        let interaction = this.contract.methods.commitTransferOwnership([
            farmAddress,
        ]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async applyTransferOwnership() {
        let interaction = this.contract.methods.commitTransferOwnership([]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async addFarm(farmAddress: Address, farmType: number, weight: BigNumber) {
        let interaction = this.contract.methods.addFarm([
            farmAddress,
            farmType,
            weight
        ]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async checkpoint() {
        let interaction = this.contract.methods.checkpoint([]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async checkpointFarm(farmAddress: Address) {
        let interaction = this.contract.methods.checkpointFarm([
            farmAddress,
        ]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async getFarmRelativeWeight(farmAddress: Address, time: number) {
        let interaction = this.contract.methods.getFarmRelativeWeight([
            farmAddress,
            time
        ]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async addType(name: string, weight: BigNumber) {
        let interaction = this.contract.methods.addType([
            name,
            weight
        ]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async changeTypeWeight(farmType: number, weight: BigNumber) {
        let interaction = this.contract.methods.changeTypeWeight([
            farmType,
            weight
        ]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async changeFarmWeight(farmAddress: Address, weight: BigNumber) {
        let interaction = this.contract.methods.changeFarmWeight([
            farmAddress,
            weight
        ]);
        interaction.withGasLimit(500_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

}

export default FarmControllerContract;
