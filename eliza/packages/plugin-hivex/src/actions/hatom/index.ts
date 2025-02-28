import supplyAction from "./supply";
import withdrawAction from "./withdraw";
import borrowAction from "./borrow";
import repayAction from "./repay";
import addCollateralAction from "./addCollateral";
import removeCollateralAction from "./removeCollateral";

/**
 * Hatom lending protocol actions for the MultiversX blockchain
 * These actions provide functionality for interacting with the Hatom lending protocol
 */
export const HatomActions = [
    supplyAction,
    withdrawAction,
    borrowAction,
    repayAction,
    addCollateralAction,
    removeCollateralAction,
];

export default HatomActions;
