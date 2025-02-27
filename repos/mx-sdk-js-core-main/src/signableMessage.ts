import { Address } from "./address";
import { ISignature } from "./interface";
import { interpretSignatureAsBuffer } from "./signature";
import { MESSAGE_PREFIX } from "./constants";
const createKeccakHash = require("keccak");

/**
 * @deprecated Use {@link Message} instead.
 */
export class SignableMessage {
    /**
     * Actual message being signed.
     */
    message: Buffer;
    /**
     * Signature obtained by a signer of type @param signer .
     */
    signature: Buffer;

    /**
     * Address of the wallet that performed the signing operation
     */
    address: Address;

    /**
     * Text representing the identifer for the application that signed the message
     */
    signer: string;

    /**
     * Number representing the signable message version
     */
    version: number;

    public constructor(init?: Partial<SignableMessage>) {
        this.message = Buffer.from([]);
        this.signature = Buffer.from([]);
        this.version = 1;
        this.signer = "ErdJS";
        this.address = Address.empty();

        Object.assign(this, init);
    }

    serializeForSigning(): Buffer {
        const messageSize = Buffer.from(this.message.length.toString());
        const signableMessage = Buffer.concat([messageSize, this.message]);
        let bytesToHash = Buffer.concat([Buffer.from(MESSAGE_PREFIX), signableMessage]);

        return createKeccakHash("keccak256").update(bytesToHash).digest();
    }

    serializeForSigningRaw(): Buffer {
        return Buffer.concat([this.getMessageSize(), this.message]);
    }

    getSignature(): Buffer {
        return this.signature;
    }

    applySignature(signature: ISignature | Uint8Array) {
        this.signature = interpretSignatureAsBuffer(signature);
    }

    getMessageSize(): Buffer {
        const messageSize = Buffer.alloc(4);
        messageSize.writeUInt32BE(this.message.length, 0);

        return messageSize;
    }

    toJSON(): object {
        return {
            address: this.address.bech32(),
            message: "0x" + this.message.toString("hex"),
            signature: "0x" + this.signature.toString("hex"),
            version: this.version,
            signer: this.signer,
        };
    }
}
