import {
    CodeMetadataValue,
    PrimitiveType,
    PrimitiveValue,
    onPrimitiveTypeSelect,
    NumericalType,
    onPrimitiveValueSelect,
    BooleanValue,
    NumericalValue,
    AddressValue,
    StringValue,
} from "../typesystem";
import { AddressBinaryCodec } from "./address";
import { BooleanBinaryCodec } from "./boolean";
import { BinaryCodec } from "./binary";
import { NumericalBinaryCodec } from "./numerical";
import { BytesValue } from "../typesystem/bytes";
import { H256BinaryCodec } from "./h256";
import { H256Value } from "../typesystem/h256";
import { BytesBinaryCodec } from "./bytes";
import { TokenIdentifierCodec } from "./tokenIdentifier";
import { TokenIdentifierValue } from "../typesystem/tokenIdentifier";
import { CodeMetadataCodec } from "./codemetadata";
import { NothingCodec } from "./nothing";
import { StringBinaryCodec } from "./string";

export class PrimitiveBinaryCodec {
    private readonly binaryCodec: BinaryCodec;

    private readonly booleanCodec: BooleanBinaryCodec;
    private readonly numericalCodec: NumericalBinaryCodec;
    private readonly addressCodec: AddressBinaryCodec;
    private readonly h256Codec: H256BinaryCodec;
    private readonly bytesCodec: BytesBinaryCodec;
    private readonly stringCodec: StringBinaryCodec;
    private readonly tokenIdentifierCodec: TokenIdentifierCodec;
    private readonly codeMetadataCodec: CodeMetadataCodec;
    private readonly nothingCodec: NothingCodec;

    constructor(binaryCodec: BinaryCodec) {
        this.binaryCodec = binaryCodec;

        this.booleanCodec = new BooleanBinaryCodec();
        this.numericalCodec = new NumericalBinaryCodec();
        this.addressCodec = new AddressBinaryCodec();
        this.h256Codec = new H256BinaryCodec();
        this.bytesCodec = new BytesBinaryCodec();
        this.stringCodec = new StringBinaryCodec();
        this.tokenIdentifierCodec = new TokenIdentifierCodec();
        this.codeMetadataCodec = new CodeMetadataCodec();
        this.nothingCodec = new NothingCodec();
    }

    decodeNested(buffer: Buffer, type: PrimitiveType): [PrimitiveValue, number] {
        return onPrimitiveTypeSelect<[PrimitiveValue, number]>(type, {
            onBoolean: () => this.booleanCodec.decodeNested(buffer),
            onNumerical: () => this.numericalCodec.decodeNested(buffer, <NumericalType>type),
            onAddress: () => this.addressCodec.decodeNested(buffer),
            onBytes: () => this.bytesCodec.decodeNested(buffer),
            onString: () => this.stringCodec.decodeNested(buffer),
            onH256: () => this.h256Codec.decodeNested(buffer),
            onTokenIndetifier: () => this.tokenIdentifierCodec.decodeNested(buffer),
            onCodeMetadata: () => this.codeMetadataCodec.decodeNested(buffer),
            onNothing: () => this.nothingCodec.decodeNested(),
        });
    }

    decodeTopLevel(buffer: Buffer, type: PrimitiveType): PrimitiveValue {
        return onPrimitiveTypeSelect<PrimitiveValue>(type, {
            onBoolean: () => this.booleanCodec.decodeTopLevel(buffer),
            onNumerical: () => this.numericalCodec.decodeTopLevel(buffer, <NumericalType>type),
            onAddress: () => this.addressCodec.decodeTopLevel(buffer),
            onBytes: () => this.bytesCodec.decodeTopLevel(buffer),
            onString: () => this.stringCodec.decodeTopLevel(buffer),
            onH256: () => this.h256Codec.decodeTopLevel(buffer),
            onTokenIndetifier: () => this.tokenIdentifierCodec.decodeTopLevel(buffer),
            onCodeMetadata: () => this.codeMetadataCodec.decodeTopLevel(buffer),
            onNothing: () => this.nothingCodec.decodeTopLevel(),
        });
    }

    encodeNested(value: PrimitiveValue): Buffer {
        return onPrimitiveValueSelect<Buffer>(value, {
            onBoolean: () => this.booleanCodec.encodeNested(<BooleanValue>value),
            onNumerical: () => this.numericalCodec.encodeNested(<NumericalValue>value),
            onAddress: () => this.addressCodec.encodeNested(<AddressValue>value),
            onBytes: () => this.bytesCodec.encodeNested(<BytesValue>value),
            onString: () => this.stringCodec.encodeNested(<StringValue>value),
            onH256: () => this.h256Codec.encodeNested(<H256Value>value),
            onTypeIdentifier: () => this.tokenIdentifierCodec.encodeNested(<TokenIdentifierValue>value),
            onCodeMetadata: () => this.codeMetadataCodec.encodeNested(<CodeMetadataValue>value),
            onNothing: () => this.nothingCodec.encodeNested(),
        });
    }

    encodeTopLevel(value: PrimitiveValue): Buffer {
        return onPrimitiveValueSelect<Buffer>(value, {
            onBoolean: () => this.booleanCodec.encodeTopLevel(<BooleanValue>value),
            onNumerical: () => this.numericalCodec.encodeTopLevel(<NumericalValue>value),
            onAddress: () => this.addressCodec.encodeTopLevel(<AddressValue>value),
            onBytes: () => this.bytesCodec.encodeTopLevel(<BytesValue>value),
            onString: () => this.stringCodec.encodeTopLevel(<StringValue>value),
            onH256: () => this.h256Codec.encodeTopLevel(<H256Value>value),
            onTypeIdentifier: () => this.tokenIdentifierCodec.encodeTopLevel(<TokenIdentifierValue>value),
            onCodeMetadata: () => this.codeMetadataCodec.encodeTopLevel(<CodeMetadataValue>value),
            onNothing: () => this.nothingCodec.encodeTopLevel(),
        });
    }
}
