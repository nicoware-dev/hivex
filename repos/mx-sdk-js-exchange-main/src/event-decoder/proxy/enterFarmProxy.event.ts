import {
    Address,
    AddressType,
    BigUIntType,
    BinaryCodec,
    BooleanType,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@multiversx/sdk-core';
import { WrappedFarmTokenAttributes } from '../../attributes-decoder/proxy/wrappedFarm.token';
import { ErrInvalidDataField } from '../../errors';
import { GenericToken } from '../../generic.token';
import { GenericEvent } from '../generic.event';
import { RawEventType } from '../generic.types';
import { EnterFarmProxyEventType } from './farm.proxy.types';
import { FarmProxyTopics } from './proxy.event.topics';

export class EnterFarmProxyEvent extends GenericEvent {
    private decodedTopics: FarmProxyTopics;

    private farmAddress: Address | undefined;
    private farmingToken: GenericToken | undefined;
    private wrappedFarmToken: GenericToken | undefined;
    private wrappedFarmAttributes: WrappedFarmTokenAttributes | undefined;
    private createdWithMerge: boolean | undefined;

    constructor(init: RawEventType) {
        super(init);
        this.decodedTopics = new FarmProxyTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
        this.farmingToken = new GenericToken({
            tokenID: decodedEvent.farmingTokenID.toString(),
            nonce: decodedEvent.farmingTokenNonce,
            amount: decodedEvent.farmingTokenAmount,
        });
        this.wrappedFarmToken = new GenericToken({
            tokenID: decodedEvent.wrappedFarmTokenID.toString(),
            nonce: decodedEvent.wrappedFarmTokenNonce,
            amount: decodedEvent.wrappedFarmTokenAmount,
        });
        this.wrappedFarmAttributes =
            WrappedFarmTokenAttributes.fromDecodedAttributes(
                decodedEvent.wrappedFarmAttributes,
            );
    }

    toJSON(): EnterFarmProxyEventType {
        return {
            ...super.toJSON(),
            farmAddress: this.farmAddress?.toString(),
            farmingToken: this.farmingToken?.toJSON(),
            wrappedFarmToken: this.wrappedFarmToken?.toJSON(),
            wrappedFarmAttributes: this.wrappedFarmAttributes?.toJSON(),
            createdWithMerge: this.createdWithMerge,
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    decodeEvent() {
        if (this.data == undefined) {
            throw new ErrInvalidDataField(EnterFarmProxyEvent.name);
        }

        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const eventStructure = this.getStructure();

        const [decoded] = codec.decodeNested(data, eventStructure);
        return decoded.valueOf();
    }

    getStructure(): StructType {
        return new StructType('EnterFarmProxyEvent', [
            new FieldDefinition('caller', '', new AddressType()),
            new FieldDefinition('farmAddress', '', new AddressType()),
            new FieldDefinition(
                'farmingTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('farmingTokenNonce', '', new U64Type()),
            new FieldDefinition('farmingTokenAmount', '', new BigUIntType()),
            new FieldDefinition(
                'wrappedFarmTokenID',
                '',
                new TokenIdentifierType(),
            ),
            new FieldDefinition('wrappedFarmTokenNonce', '', new U64Type()),
            new FieldDefinition(
                'wrappedFarmTokenAmount',
                '',
                new BigUIntType(),
            ),
            new FieldDefinition(
                'wrappedFarmAttributes',
                '',
                WrappedFarmTokenAttributes.getStructure(),
            ),
            new FieldDefinition('createdWithMerge', '', new BooleanType()),
            new FieldDefinition('block', '', new U64Type()),
            new FieldDefinition('epoch', '', new U64Type()),
            new FieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
