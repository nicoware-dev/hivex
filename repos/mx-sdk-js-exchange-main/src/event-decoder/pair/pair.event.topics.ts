import { Address } from '@multiversx/sdk-core';

export class PairEventTopics {
    private readonly eventName: string;
    private readonly firstTokenID: string;
    private readonly secondTokenID: string;
    private caller: Address;
    private readonly epoch: number;

    constructor(rawTopics: string[]) {
        this.eventName = Buffer.from(rawTopics[0], 'base64').toString();
        this.firstTokenID = Buffer.from(rawTopics[1], 'base64').toString();
        this.secondTokenID = Buffer.from(rawTopics[2], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[3], 'base64'));
        this.epoch = parseInt(
            Buffer.from(rawTopics[4], 'base64').toString('hex'),
            16,
        );
    }

    toPlainObject() {
        return {
            eventName: this.eventName,
            firstTokenID: this.firstTokenID,
            secondTokenID: this.secondTokenID,
            caller: this.caller.bech32(),
            epoch: this.epoch,
        };
    }
}

export class SwapNoFeeTopics {
    private readonly eventName: string;
    private readonly tokenOutID: string;
    private readonly caller: Address;
    private readonly epoch: number;

    constructor(rawTopics: string[]) {
        this.eventName = Buffer.from(rawTopics[0], 'base64').toString();
        this.tokenOutID = Buffer.from(rawTopics[1], 'base64').toString();
        this.caller = new Address(Buffer.from(rawTopics[2], 'base64'));
        this.epoch = parseInt(
            Buffer.from(rawTopics[3], 'base64').toString('hex'),
            16,
        );
    }

    toPlainObject() {
        return {
            eventName: this.eventName,
            tokenOutID: this.tokenOutID,
            caller: this.caller.bech32(),
            epoch: this.epoch,
        };
    }
}
