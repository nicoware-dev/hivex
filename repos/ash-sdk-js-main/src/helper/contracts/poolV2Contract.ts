import { Address, TokenPayment } from "@multiversx/sdk-core/out";
import poolV2Abi from "../../abi/pool_v2.abi.json";
import BigNumber from "bignumber.js";
import Contract from "./contract";

class PoolV2Contract extends Contract<typeof poolV2Abi> {
    constructor(address: string) {
        super(address, poolV2Abi);
    }

    async estimateAmountOut(
        tokenInIndex: number,
        tokenOutIndex: number,
        tokenAmtIn: BigNumber
    ): Promise<{ fee: BigNumber, outputAmount: BigNumber }> {
        let interaction = this.contract.methods.estimateAmountOut([
            tokenInIndex,
            tokenOutIndex,
            tokenAmtIn,
        ]);
        const { firstValue, secondValue } = await this.runQuery(interaction);
        return {
            fee: firstValue?.valueOf(),
            outputAmount: secondValue?.valueOf(),
        }
    }

    async estimateAddLiquidity(amounts: BigNumber[]): Promise<BigNumber> {
        let interaction = this.contract.methods.estimateAddLiquidity([amounts]);
        const { firstValue } = await this.runQuery(interaction);
        return firstValue?.valueOf();
    }

    async estimateRemoveLiquidityOneCoin(lpAmount: BigNumber, tokenOutIndex: number): Promise<BigNumber> {
        let interaction = this.contract.methods.estimateRemoveLiquidityOneCoin([lpAmount, tokenOutIndex]);
        const { firstValue } = await this.runQuery(interaction);
        return firstValue?.valueOf();
    }

    async getTotalSupply(): Promise<BigNumber> {
        let interaction = this.contract.methods.getLpTokenSupply();
        const { firstValue } = await this.runQuery(interaction);
        return firstValue?.valueOf();
    }

    async addLiquidity(sender: string, tokenPayments: TokenPayment[], minMintAmount: BigNumber, receiver?: Address) {
        let interaction = this.contract.methods.addLiquidity([minMintAmount, receiver || new Address(sender)]);
        interaction.withMultiESDTNFTTransfer(tokenPayments, new Address(sender)).withGasLimit(35_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async exchange(tokenPayment: TokenPayment, mintWeiOut: BigNumber) {
        let interaction = this.contract.methods.exchange([mintWeiOut]);
        interaction.withSingleESDTTransfer(tokenPayment).withGasLimit(35_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async removeLiquidity(sender: string, tokenPayment: TokenPayment, minAmounts: BigNumber[], receiver?: Address) {
        let interaction = this.contract.methods.removeLiquidity([minAmounts, receiver || new Address(sender)]);
        interaction.withSingleESDTTransfer(tokenPayment).withGasLimit(12_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    /**
     * other enpoints
     */

    async removeLiquidityOneCoin(sender: string, tokenPayment: TokenPayment, name: string, minAmount: BigNumber, receiver?: Address) {
        let interaction = this.contract.methods.removeLiquidityOneCoin([name, minAmount, receiver || new Address(sender)]);
        interaction.withSingleESDTTransfer(tokenPayment).withGasLimit(12_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async claimAdminFees() {
        let interaction = this.contract.methods.claimAdminFees([]);
        interaction.withGasLimit(35_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async setLpTokenIdentifier(tokenId: string) {
        let interaction = this.contract.methods.setLpTokenIdentifier([tokenId]);
        interaction.withGasLimit(35_000_000);
        return this.interceptInteraction(interaction).check().buildTransaction();
    }

    async getLpPrice() {
        let interaction = this.contract.methods.getLpPrice([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getA() {
        let interaction = this.contract.methods.getA([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getGamma() {
        let interaction = this.contract.methods.getGamma([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getFee() {
        let interaction = this.contract.methods.getGamma([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getLpToken() {
        let interaction = this.contract.methods.getLpTokenIdentifier([]);
        const { firstValue } = await this.runQuery(interaction);
        return firstValue?.valueOf() as string || "";
    }

    async getTokens() {
        let interaction = this.contract.methods.getTokens([]);
        const { firstValue } = await this.runQuery(interaction);
        return firstValue?.valueOf() as string[] || [];
    }

    async getBalances() {
        let interaction = this.contract.methods.getBalances([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber[]) || [];
    }

    async getFutureAGammaTime() {
        let interaction = this.contract.methods.getFutureAGammaTime([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as number) || 0;
    }

    async getFeeGamma() {
        let interaction = this.contract.methods.getFeeGamma([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getMidFee() {
        let interaction = this.contract.methods.getMidFee([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getOutFee() {
        let interaction = this.contract.methods.getOutFee([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getAdminFee() {
        let interaction = this.contract.methods.getAdminFee([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getD() {
        let interaction = this.contract.methods.getD([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getLpTokenSupply() {
        let interaction = this.contract.methods.getLpTokenSupply([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getPriceScale() {
        let interaction = this.contract.methods.getPriceScale([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getXp() {
        let interaction = this.contract.methods.getXcpProfit([]);
        const { firstValue } = await this.runQuery(interaction);
        return (firstValue?.valueOf() as BigNumber) || new BigNumber(0);
    }

    async getReserves() {
        const balances = await this.getBalances();
        const reserves = (await this.getTokens())
            .map(((_, index) => balances[index]))
        return await reserves;
    }
}

export default PoolV2Contract;
