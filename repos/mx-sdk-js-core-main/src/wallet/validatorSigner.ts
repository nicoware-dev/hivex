import { ErrSignerCannotSign } from "../errors";
import { BLS, ValidatorSecretKey } from "./validatorKeys";

/**
 * Validator signer (BLS signer)
 */
export class ValidatorSigner {
    /**
     * Signs a message.
     */
    async signUsingPem(pemText: string, pemIndex: number = 0, signable: Buffer | Uint8Array): Promise<void> {
        await BLS.initIfNecessary();

        try {
            let secretKey = ValidatorSecretKey.fromPem(pemText, pemIndex);
            secretKey.sign(signable);
        } catch (err: any) {
            throw new ErrSignerCannotSign(err);
        }
    }
}
