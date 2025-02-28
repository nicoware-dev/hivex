import Contract from "./contract";
import votingEscowAbi from "../../abi/voting_escrow.abi.json";
import { TokenPayment } from "@multiversx/sdk-core/out";
import BigNumber from "bignumber.js";
class VotingEscrowContract extends Contract<typeof votingEscowAbi> {
    constructor(address: string) {
        super(address, votingEscowAbi);
    }

    async createLock(tokenPayment: TokenPayment, unlockTS: number) {
        let interaction = this.contract.methods.create_lock([unlockTS]);
        interaction
            .withSingleESDTTransfer(tokenPayment)
            .withGasLimit(100_000_000);// 7m
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async increaseAmount(tokenPayment: TokenPayment) {
        let interaction = this.contract.methods.increase_amount([]);
        interaction
            .withSingleESDTTransfer(tokenPayment)
            .withGasLimit(100_000_000);//7m
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async increaseUnlockTime(unlockTS: number) {
        let interaction = this.contract.methods.increase_unlock_time([
            unlockTS,
        ]);
        interaction.withGasLimit(100_000_000);//7m
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async withdraw() {
        let interaction = this.contract.methods.withdraw([]);
        interaction.withGasLimit(100_000_000);//7m
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async getUserLocked(
        address: string
    ): Promise<{ amount: BigNumber; end: BigNumber }> {
        let interaction = this.contract.methods.getUserLocked([address]);
        const { firstValue } = await this.runQuery(interaction);
        return firstValue?.valueOf();
    }

    /**
     * other endponts
     */

    async checkpoint() {
        let interaction = this.contract.methods.checkpoint([]);
        interaction.withGasLimit(100_000_000);//7m
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async depositFor(tokenPayment: TokenPayment, address: string) {
        let interaction = this.contract.methods.deposit_for([address]);
        interaction
            .withSingleESDTTransfer(tokenPayment)
            .withGasLimit(100_000_000);//7m
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async getUserBalanceAtTs(address: string, ts: number) {
        let interaction = this.contract.methods.getUserBalanceAtTs([address, ts]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getUserBalanceAtBlock(address: string, block: number) {
        let interaction = this.contract.methods.getUserBalanceAtBlock([address, block]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getTotalSupplyAtTs(ts: number) {
        let interaction = this.contract.methods.getTotalSupplyAtTs([ts]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getTotalSupplyAtBlock(block: number) {
        let interaction = this.contract.methods.getTotalSupplyAtBlock([block]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getLockedToken() {
        let interaction = this.contract.methods.getLockedToken([]);
        interaction.withGasLimit(100_000_000);//7m
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async getEpoch() {
        let interaction = this.contract.methods.getEpoch([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as number) || 0;
    }

    async getPointHistory(
        epoch: number
    ): Promise<{ bias: BigNumber; slope: BigNumber; ts: number, block: number }> {
        let interaction = this.contract.methods.getPointHistory([epoch]);
        const { firstValue } = await this.runQuery(interaction);
        return firstValue?.valueOf();
    }

    async getUserPointHistory(
        address: string,
        epoch: number
    ): Promise<{ bias: BigNumber; slope: BigNumber; ts: number, block: number }> {
        let interaction = this.contract.methods.getPointHistory([address, epoch]);
        const { firstValue } = await this.runQuery(interaction);
        return firstValue?.valueOf();
    }

    async getUserPointEpoch(address: string) {
        let interaction = this.contract.methods.getUserPointEpoch([address]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as number) || 0;
    }

    async getTotalLocked() {
        let interaction = this.contract.methods.getTotalLocked([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getSlopeChanges(time: number) {
        let interaction = this.contract.methods.getSlopeChanges([time]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }
}

export default VotingEscrowContract;
