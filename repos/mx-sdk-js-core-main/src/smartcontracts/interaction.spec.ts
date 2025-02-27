import { ContractQueryResponse } from "../networkProviders";
import BigNumber from "bignumber.js";
import { assert } from "chai";
import { Address } from "../address";
import {
    loadAbiRegistry,
    loadTestWallets,
    MockNetworkProvider,
    setupUnitTestWatcherTimeouts,
    TestWallet,
} from "../testutils";
import { ContractController } from "../testutils/contractController";
import { Token, TokenTransfer } from "../tokens";
import { Transaction } from "../transaction";
import { ContractFunction } from "./function";
import { Interaction } from "./interaction";
import { ReturnCode } from "./returnCode";
import { SmartContract } from "./smartContract";
import { BigUIntValue, OptionalValue, OptionValue, TokenIdentifierValue, U32Value } from "./typesystem";
import { BytesValue } from "./typesystem/bytes";

describe("test smart contract interactor", function () {
    let dummyAddress = new Address("erd1qqqqqqqqqqqqqpgqak8zt22wl2ph4tswtyc39namqx6ysa2sd8ss4xmlj3");
    let provider = new MockNetworkProvider();
    let alice: TestWallet;

    before(async function () {
        ({ alice } = await loadTestWallets());
    });

    it("should set transaction fields", async function () {
        let contract = new SmartContract({ address: dummyAddress });
        let dummyFunction = new ContractFunction("dummy");
        let interaction = new Interaction(contract, dummyFunction, []);

        let transaction = interaction
            .withSender(alice.address)
            .withNonce(7)
            .withValue(TokenTransfer.egldFromAmount(1))
            .withGasLimit(20000000)
            .buildTransaction();

        assert.deepEqual(transaction.getReceiver(), dummyAddress);
        assert.equal(transaction.getValue().toString(), "1000000000000000000");
        assert.equal(transaction.getNonce(), 7);
        assert.equal(transaction.getGasLimit().valueOf(), 20000000);
    });

    it("should set transfers (payments) on contract calls (transfer and execute)", async function () {
        let contract = new SmartContract({ address: dummyAddress });
        let dummyFunction = new ContractFunction("dummy");
        let alice = new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");

        const TokenFoo = (amount: BigNumber.Value) => TokenTransfer.fungibleFromAmount("FOO-6ce17b", amount, 0);
        const TokenBar = (amount: BigNumber.Value) => TokenTransfer.fungibleFromAmount("BAR-5bc08f", amount, 3);
        const LKMEX = (nonce: number, amount: BigNumber.Value) =>
            TokenTransfer.metaEsdtFromAmount("LKMEX-aab910", nonce, amount, 18);
        const nonFungibleToken = (nonce: number) => TokenTransfer.nonFungible("MOS-b9b4b2", nonce);

        const hexFoo = "464f4f2d366365313762";
        const hexBar = "4241522d356263303866";
        const hexLKMEX = "4c4b4d45582d616162393130";
        const hexNFT = "4d4f532d623962346232";
        const hexContractAddress = new Address(contract.getAddress().bech32()).hex();
        const hexDummyFunction = "64756d6d79";

        // ESDT, single
        let transaction = new Interaction(contract, dummyFunction, [])
            .withSender(alice)
            .withSingleESDTTransfer(TokenFoo(10))
            .buildTransaction();

        assert.equal(transaction.getData().toString(), `ESDTTransfer@${hexFoo}@0a@${hexDummyFunction}`);

        // Meta ESDT (special SFT), single
        transaction = new Interaction(contract, dummyFunction, [])
            .withSender(alice)
            .withSingleESDTNFTTransfer(LKMEX(123456, 123.456))
            .buildTransaction();

        assert.equal(transaction.getSender().bech32(), alice.bech32());
        assert.equal(transaction.getReceiver().bech32(), alice.bech32());
        assert.equal(
            transaction.getData().toString(),
            `ESDTNFTTransfer@${hexLKMEX}@01e240@06b14bd1e6eea00000@${hexContractAddress}@${hexDummyFunction}`,
        );

        // Meta ESDT (special SFT), single, but using "withSender()" (recommended)
        transaction = new Interaction(contract, dummyFunction, [])
            .withSingleESDTNFTTransfer(LKMEX(123456, 123.456))
            .withSender(alice)
            .buildTransaction();

        assert.equal(transaction.getSender().bech32(), alice.bech32());
        assert.equal(transaction.getReceiver().bech32(), alice.bech32());
        assert.equal(
            transaction.getData().toString(),
            `ESDTNFTTransfer@${hexLKMEX}@01e240@06b14bd1e6eea00000@${hexContractAddress}@${hexDummyFunction}`,
        );

        // NFT, single
        transaction = new Interaction(contract, dummyFunction, [])
            .withSender(alice)
            .withSingleESDTNFTTransfer(nonFungibleToken(1))
            .buildTransaction();

        assert.equal(transaction.getSender().bech32(), alice.bech32());
        assert.equal(transaction.getReceiver().bech32(), alice.bech32());
        assert.equal(
            transaction.getData().toString(),
            `ESDTNFTTransfer@${hexNFT}@01@01@${hexContractAddress}@${hexDummyFunction}`,
        );

        // NFT, single, but using "withSender()" (recommended)
        transaction = new Interaction(contract, dummyFunction, [])
            .withSingleESDTNFTTransfer(nonFungibleToken(1))
            .withSender(alice)
            .buildTransaction();

        assert.equal(transaction.getSender().bech32(), alice.bech32());
        assert.equal(transaction.getReceiver().bech32(), alice.bech32());
        assert.equal(
            transaction.getData().toString(),
            `ESDTNFTTransfer@${hexNFT}@01@01@${hexContractAddress}@${hexDummyFunction}`,
        );

        // ESDT, multiple
        transaction = new Interaction(contract, dummyFunction, [])
            .withSender(alice)
            .withMultiESDTNFTTransfer([TokenFoo(3), TokenBar(3.14)])
            .buildTransaction();

        assert.equal(transaction.getSender().bech32(), alice.bech32());
        assert.equal(transaction.getReceiver().bech32(), alice.bech32());
        assert.equal(
            transaction.getData().toString(),
            `MultiESDTNFTTransfer@${hexContractAddress}@02@${hexFoo}@@03@${hexBar}@@0c44@${hexDummyFunction}`,
        );

        // ESDT, multiple, but using "withSender()" (recommended)
        transaction = new Interaction(contract, dummyFunction, [])
            .withMultiESDTNFTTransfer([TokenFoo(3), TokenBar(3.14)])
            .withSender(alice)
            .buildTransaction();

        assert.equal(transaction.getSender().bech32(), alice.bech32());
        assert.equal(transaction.getReceiver().bech32(), alice.bech32());
        assert.equal(
            transaction.getData().toString(),
            `MultiESDTNFTTransfer@${hexContractAddress}@02@${hexFoo}@@03@${hexBar}@@0c44@${hexDummyFunction}`,
        );

        // NFT, multiple
        transaction = new Interaction(contract, dummyFunction, [])
            .withSender(alice)
            .withMultiESDTNFTTransfer([nonFungibleToken(1), nonFungibleToken(42)])
            .buildTransaction();

        assert.equal(transaction.getSender().bech32(), alice.bech32());
        assert.equal(transaction.getReceiver().bech32(), alice.bech32());
        assert.equal(
            transaction.getData().toString(),
            `MultiESDTNFTTransfer@${hexContractAddress}@02@${hexNFT}@01@01@${hexNFT}@2a@01@${hexDummyFunction}`,
        );

        // NFT, multiple, but using "withSender()" (recommended)
        transaction = new Interaction(contract, dummyFunction, [])
            .withMultiESDTNFTTransfer([nonFungibleToken(1), nonFungibleToken(42)])
            .withSender(alice)
            .buildTransaction();

        assert.equal(transaction.getSender().bech32(), alice.bech32());
        assert.equal(transaction.getReceiver().bech32(), alice.bech32());
    });

    it("should create transaction, with ABI, with transfer & execute", async function () {
        const abiRegistry = await loadAbiRegistry("src/testdata/answer.abi.json");
        const contract = new SmartContract({ address: dummyAddress, abi: abiRegistry });
        const alice = new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");
        const token = new Token({ identifier: "FOO-abcdef", nonce: 0n });

        const transaction = contract.methods
            .getUltimateAnswer()
            .withChainID("T")
            .withSender(alice)
            .withGasLimit(543210)
            .withSingleESDTTransfer(new TokenTransfer({ token, amount: 100n }))
            .withNonce(42)
            .buildTransaction();

        assert.deepEqual(
            transaction,
            new Transaction({
                chainID: "T",
                sender: alice.toBech32(),
                receiver: dummyAddress.toBech32(),
                data: Buffer.from("ESDTTransfer@464f4f2d616263646566@64@676574556c74696d617465416e73776572"),
                gasLimit: 543210n,
                value: 0n,
                version: 2,
                nonce: 42n,
            }),
        );
    });

    it("should interact with 'answer'", async function () {
        setupUnitTestWatcherTimeouts();

        let abiRegistry = await loadAbiRegistry("src/testdata/answer.abi.json");
        let contract = new SmartContract({ address: dummyAddress, abi: abiRegistry });
        let controller = new ContractController(provider);

        let interaction = <Interaction>contract.methods.getUltimateAnswer().withGasLimit(543210).withChainID("T");

        assert.equal(contract.getAddress(), dummyAddress);
        assert.deepEqual(interaction.getFunction(), new ContractFunction("getUltimateAnswer"));
        assert.lengthOf(interaction.getArguments(), 0);
        assert.deepEqual(interaction.getGasLimit(), 543210);

        provider.mockQueryContractOnFunction(
            "getUltimateAnswer",
            new ContractQueryResponse({ returnData: [Buffer.from([42]).toString("base64")], returnCode: "ok" }),
        );

        // Query
        let {
            values: queryValues,
            firstValue: queryAnwser,
            returnCode: queryCode,
        } = await controller.query(interaction);
        assert.lengthOf(queryValues, 1);
        assert.deepEqual(queryAnwser!.valueOf(), new BigNumber(42));
        assert.isTrue(queryCode.equals(ReturnCode.Ok));

        // Execute, do not wait for execution
        let transaction = interaction.withSender(alice.address).withNonce(0).buildTransaction();
        transaction.setSender(alice.address);
        transaction.applySignature(await alice.signer.sign(transaction.serializeForSigning()));
        await provider.sendTransaction(transaction);
        assert.equal(transaction.getNonce().valueOf(), 0);
        assert.equal(transaction.getData().toString(), "getUltimateAnswer");
        assert.equal(
            transaction.getHash().toString(),
            "3579ad09099feb9755c860ddd225251170806d833342e912fccdfe2ed5c3a364",
        );

        transaction = interaction.withNonce(1).buildTransaction();
        transaction.setSender(alice.address);
        transaction.applySignature(await alice.signer.sign(transaction.serializeForSigning()));
        await provider.sendTransaction(transaction);
        assert.equal(transaction.getNonce().valueOf(), 1);
        assert.equal(
            transaction.getHash().toString(),
            "ad513ce7c5d371d30e48f073326899766736eac1ac231d847d45bc3facbcb496",
        );

        // Execute, and wait for execution
        transaction = interaction.withNonce(2).buildTransaction();
        transaction.setSender(alice.address);
        transaction.applySignature(await alice.signer.sign(transaction.serializeForSigning()));
        provider.mockGetTransactionWithAnyHashAsNotarizedWithOneResult("@6f6b@2bs");
        let { bundle } = await controller.execute(interaction, transaction);

        assert.lengthOf(bundle.values, 1);
        assert.deepEqual(bundle.firstValue!.valueOf(), new BigNumber(43));
        assert.isTrue(bundle.returnCode.equals(ReturnCode.Ok));
    });

    it("should interact with 'counter'", async function () {
        setupUnitTestWatcherTimeouts();

        let abiRegistry = await loadAbiRegistry("src/testdata/counter.abi.json");
        let contract = new SmartContract({ address: dummyAddress, abi: abiRegistry });
        let controller = new ContractController(provider);

        let getInteraction = <Interaction>contract.methodsExplicit.get().check();
        let incrementInteraction = (<Interaction>contract.methods.increment()).withGasLimit(543210);
        let decrementInteraction = (<Interaction>contract.methods.decrement()).withGasLimit(987654);

        // For "get()", return fake 7
        provider.mockQueryContractOnFunction(
            "get",
            new ContractQueryResponse({ returnData: [Buffer.from([7]).toString("base64")], returnCode: "ok" }),
        );

        // Query "get()"
        let { firstValue: counterValue } = await controller.query(getInteraction);

        assert.deepEqual(counterValue!.valueOf(), new BigNumber(7));

        let incrementTransaction = incrementInteraction
            .withSender(alice.address)
            .withNonce(14)
            .withChainID("mock")
            .buildTransaction();

        incrementTransaction.applySignature(await alice.signer.sign(incrementTransaction.serializeForSigning()));
        provider.mockGetTransactionWithAnyHashAsNotarizedWithOneResult("@6f6b@08");
        let {
            bundle: { firstValue: valueAfterIncrement },
        } = await controller.execute(incrementInteraction, incrementTransaction);
        assert.deepEqual(valueAfterIncrement!.valueOf(), new BigNumber(8));

        // Decrement three times (simulate three parallel broadcasts). Wait for execution of the latter (third transaction). Return fake "5".
        // Decrement #1
        let decrementTransaction = decrementInteraction
            .withSender(alice.address)
            .withNonce(15)
            .withChainID("mock")
            .buildTransaction();

        decrementTransaction.applySignature(await alice.signer.sign(decrementTransaction.serializeForSigning()));
        await provider.sendTransaction(decrementTransaction);
        // Decrement #2
        decrementTransaction = decrementInteraction.withNonce(16).buildTransaction();
        decrementTransaction.applySignature(await alice.signer.sign(decrementTransaction.serializeForSigning()));
        await provider.sendTransaction(decrementTransaction);
        // Decrement #3

        decrementTransaction = decrementInteraction.withNonce(17).buildTransaction();
        decrementTransaction.applySignature(await alice.signer.sign(decrementTransaction.serializeForSigning()));
        provider.mockGetTransactionWithAnyHashAsNotarizedWithOneResult("@6f6b@05");
        let {
            bundle: { firstValue: valueAfterDecrement },
        } = await controller.execute(decrementInteraction, decrementTransaction);
        assert.deepEqual(valueAfterDecrement!.valueOf(), new BigNumber(5));
    });

    it("should interact with 'lottery-esdt'", async function () {
        setupUnitTestWatcherTimeouts();

        let abiRegistry = await loadAbiRegistry("src/testdata/lottery-esdt.abi.json");
        let contract = new SmartContract({ address: dummyAddress, abi: abiRegistry });
        let controller = new ContractController(provider);

        let startInteraction = <Interaction>contract.methodsExplicit
            .start([
                BytesValue.fromUTF8("lucky"),
                new TokenIdentifierValue("lucky-token"),
                new BigUIntValue(1),
                OptionValue.newMissing(),
                OptionValue.newMissing(),
                OptionValue.newProvided(new U32Value(1)),
                OptionValue.newMissing(),
                OptionValue.newMissing(),
                OptionalValue.newMissing(),
            ])
            .withGasLimit(5000000)
            .check();

        let statusInteraction = <Interaction>contract.methods.status(["lucky"]).withGasLimit(5000000);

        let getLotteryInfoInteraction = <Interaction>contract.methods.getLotteryInfo(["lucky"]).withGasLimit(5000000);

        // start()
        let startTransaction = startInteraction
            .withSender(alice.address)
            .withNonce(14)
            .withChainID("mock")
            .buildTransaction();

        startTransaction.applySignature(await alice.signer.sign(startTransaction.serializeForSigning()));
        provider.mockGetTransactionWithAnyHashAsNotarizedWithOneResult("@6f6b");
        let {
            bundle: { returnCode: startReturnCode, values: startReturnValues },
        } = await controller.execute(startInteraction, startTransaction);

        assert.equal(
            startTransaction.getData().toString(),
            "start@6c75636b79@6c75636b792d746f6b656e@01@@@0100000001@@",
        );
        assert.isTrue(startReturnCode.equals(ReturnCode.Ok));
        assert.lengthOf(startReturnValues, 0);

        // status() (this is a view function, but for the sake of the test, we'll execute it)
        let statusTransaction = statusInteraction
            .withSender(alice.address)
            .withNonce(15)
            .withChainID("mock")
            .buildTransaction();

        statusTransaction.applySignature(await alice.signer.sign(statusTransaction.serializeForSigning()));
        provider.mockGetTransactionWithAnyHashAsNotarizedWithOneResult("@6f6b@01");
        let {
            bundle: { returnCode: statusReturnCode, values: statusReturnValues, firstValue: statusFirstValue },
        } = await controller.execute(statusInteraction, statusTransaction);

        assert.equal(statusTransaction.getData().toString(), "status@6c75636b79");
        assert.isTrue(statusReturnCode.equals(ReturnCode.Ok));
        assert.lengthOf(statusReturnValues, 1);
        assert.deepEqual(statusFirstValue!.valueOf(), { name: "Running", fields: [] });

        // lotteryInfo() (this is a view function, but for the sake of the test, we'll execute it)
        let getLotteryInfoTransaction = getLotteryInfoInteraction
            .withSender(alice.address)
            .withNonce(15)
            .withChainID("mock")
            .buildTransaction();

        getLotteryInfoTransaction.applySignature(
            await alice.signer.sign(getLotteryInfoTransaction.serializeForSigning()),
        );
        provider.mockGetTransactionWithAnyHashAsNotarizedWithOneResult(
            "@6f6b@0000000b6c75636b792d746f6b656e000000010100000000000000005fc2b9dbffffffff00000001640000000a140ec80fa7ee88000000",
        );
        let {
            bundle: { returnCode: infoReturnCode, values: infoReturnValues, firstValue: infoFirstValue },
        } = await controller.execute(getLotteryInfoInteraction, getLotteryInfoTransaction);

        assert.equal(getLotteryInfoTransaction.getData().toString(), "getLotteryInfo@6c75636b79");
        assert.isTrue(infoReturnCode.equals(ReturnCode.Ok));
        assert.lengthOf(infoReturnValues, 1);

        assert.deepEqual(infoFirstValue!.valueOf(), {
            token_identifier: "lucky-token",
            ticket_price: new BigNumber("1"),
            tickets_left: new BigNumber(0),
            deadline: new BigNumber("0x000000005fc2b9db", 16),
            max_entries_per_user: new BigNumber(0xffffffff),
            prize_distribution: Buffer.from([0x64]),
            prize_pool: new BigNumber("94720000000000000000000"),
        });
    });
});
