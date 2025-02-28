import { IESDTInfo } from "../helper/token/token";
import BigNumber from "bignumber.js";

export enum EPoolType {
    PlainPool, LendingPool, MetaPool, PoolV2
}
export default interface IPool {
    address: string;
    tokens: IESDTInfo[];
    lpToken: IESDTInfo;
    type: EPoolType;
}

export interface RemoveLiquidityAttributes {
    token: string,
    attribute: string,
    amount_removed: BigNumber
}

export interface RemoveLiquidityResultType {
    burn_amount: BigNumber, 
    tokens: RemoveLiquidityAttributes[]
}