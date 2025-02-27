import BigNumber from "bignumber.js";
import { assert } from "chai";
import { ArgSerializer } from "./argSerializer";
import {
    EndpointParameterDefinition,
    I16Value,
    I32Value,
    I64Value,
    List,
    OptionValue,
    Tuple,
    TypedValue,
    U16Value,
    U32Value,
    U8Value,
} from "./typesystem";
import { BytesValue } from "./typesystem/bytes";
import { CompositeValue } from "./typesystem/composite";
import { TypeExpressionParser } from "./typesystem/typeExpressionParser";
import { TypeMapper } from "./typesystem/typeMapper";
import { VariadicValue } from "./typesystem/variadic";

describe("test serializer", () => {
    let serializer = new ArgSerializer();
    let typeParser = new TypeExpressionParser();
    let typeMapper = new TypeMapper();

    it("should serialize <valuesToString> then back <stringToValues>", async () => {
        serializeThenDeserialize(
            ["u32", "i64", "bytes"],
            [new U32Value(100), new I64Value(new BigNumber("-1")), new BytesValue(Buffer.from("abba", "hex"))],
            "64@ff@abba",
        );

        serializeThenDeserialize(
            ["Option<u32>", "Option<u8>", "MultiArg<u8, bytes>"],
            [
                OptionValue.newProvided(new U32Value(100)),
                OptionValue.newMissing(),
                CompositeValue.fromItems(new U8Value(3), new BytesValue(Buffer.from("abba", "hex"))),
            ],
            "0100000064@@03@abba",
        );

        serializeThenDeserialize(
            ["MultiArg<List<u16>>", "VarArgs<bytes>"],
            [
                CompositeValue.fromItems(List.fromItems([new U16Value(8), new U16Value(9)])),
                VariadicValue.fromItems(
                    new BytesValue(Buffer.from("abba", "hex")),
                    new BytesValue(Buffer.from("abba", "hex")),
                    new BytesValue(Buffer.from("abba", "hex")),
                ),
            ],
            "00080009@abba@abba@abba",
        );

        serializeThenDeserialize(
            ["MultiArg<Option<u8>, List<u16>>", "VarArgs<bytes>"],
            [
                CompositeValue.fromItems(
                    OptionValue.newProvided(new U8Value(7)),
                    List.fromItems([new U16Value(8), new U16Value(9)]),
                ),
                VariadicValue.fromItems(
                    new BytesValue(Buffer.from("abba", "hex")),
                    new BytesValue(Buffer.from("abba", "hex")),
                    new BytesValue(Buffer.from("abba", "hex")),
                ),
            ],
            "0107@00080009@abba@abba@abba",
        );
    });

    it("should serialize <valuesToString> then back <stringToValues>: tuples", async () => {
        serializeThenDeserialize(
            ["tuple2<i32, i16>"],
            [Tuple.fromItems([new I32Value(100), new I16Value(10)])],
            "00000064000a",
        );
    });

    function serializeThenDeserialize(typeExpressions: string[], values: TypedValue[], expectedJoinedString: string) {
        let types = typeExpressions
            .map((expression) => typeParser.parse(expression))
            .map((type) => typeMapper.mapType(type));
        let endpointDefinitions = types.map((type) => new EndpointParameterDefinition("foo", "bar", type));

        // values => joined string
        let { argumentsString: actualJoinedString } = serializer.valuesToString(values);
        assert.equal(actualJoinedString, expectedJoinedString);

        // joined string => values
        let decodedValues = serializer.stringToValues(actualJoinedString, endpointDefinitions);

        // Now let's check for equality
        assert.lengthOf(decodedValues, values.length);

        for (let i = 0; i < values.length; i++) {
            let value = values[i];
            let decoded = decodedValues[i];

            assert.deepEqual(decoded.valueOf(), value.valueOf(), `index = ${i}`);
        }
    }
});
