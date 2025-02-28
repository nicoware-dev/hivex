import { TokenPayment } from "@multiversx/sdk-core/out";
import wegldAbi from "../../abi/multiversx-wegld-swap-sc.abi.json";
import BigNumber from "bignumber.js";
import Contract from "./contract";

class WrappedEGLDContract extends Contract<typeof wegldAbi> {
    constructor(address: string) {
        super(address, wegldAbi);
    }

    async wrapEgld(amt: BigNumber) {
        let interaction = this.contract.methods.wrapEgld([]);
        interaction.withValue(amt);
        interaction.withGasLimit(5_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async unwrapEgld(tokenPayment: TokenPayment) {
        let interaction = this.contract.methods.unwrapEgld([]);
        interaction.withSingleESDTTransfer(tokenPayment)
        interaction.withGasLimit(5_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    /**
     * other endponts
     */

    async getLockedEgldBalance() {
        let interaction = this.contract.methods.getLockedEgldBalance([]);
        interaction.withGasLimit(5_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async getWrappedEgldTokenId() {
        let interaction = this.contract.methods.getWrappedEgldTokenId([]);
        interaction.withGasLimit(5_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async pause() {
        let interaction = this.contract.methods.pause([]);
        interaction.withGasLimit(5_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async unpause() {
        let interaction = this.contract.methods.unpause([]);
        interaction.withGasLimit(5_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }

    async isPaused() {
        let interaction = this.contract.methods.isPaused([]);
        interaction.withGasLimit(5_000_000);
        return this.interceptInteraction(interaction)
            .check()
            .buildTransaction();
    }
}

export default WrappedEGLDContract;
