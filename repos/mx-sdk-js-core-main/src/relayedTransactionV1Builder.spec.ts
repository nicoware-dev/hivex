import { assert } from "chai";
import { Address } from "./address";
import * as errors from "./errors";
import { TransactionOptions, TransactionVersion } from "./networkParams";
import { RelayedTransactionV1Builder } from "./relayedTransactionV1Builder";
import { TestWallet, loadTestWallets } from "./testutils";
import { TokenTransfer } from "./tokens";
import { Transaction } from "./transaction";
import { TransactionPayload } from "./transactionPayload";

describe("test relayed v1 transaction builder", function () {
    let alice: TestWallet, bob: TestWallet, carol: TestWallet, grace: TestWallet, frank: TestWallet;

    before(async function () {
        ({ alice, bob, carol, grace, frank } = await loadTestWallets());
    });

    it("should throw exception if args were not set", async function () {
        const builder = new RelayedTransactionV1Builder();
        assert.throw(() => builder.build(), errors.ErrInvalidRelayedV1BuilderArguments);

        const innerTx = new Transaction({
            nonce: 15,
            sender: alice.address,
            receiver: Address.fromBech32("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"),
            gasLimit: 10000000,
            chainID: "1",
            data: new TransactionPayload("getContractConfig"),
        });
        builder.setInnerTransaction(innerTx);
        assert.throw(() => builder.build(), errors.ErrInvalidRelayedV1BuilderArguments);

        const networkConfig = {
            MinGasLimit: 50_000,
            GasPerDataByte: 1_500,
            GasPriceModifier: 0.01,
            ChainID: "T",
        };
        builder.setNetworkConfig(networkConfig);
        assert.throw(() => builder.build(), errors.ErrInvalidRelayedV1BuilderArguments);

        builder.setRelayerAddress(alice.getAddress());
        assert.doesNotThrow(() => builder.build());
    });

    it("should compute relayed v1 transaction", async function () {
        const networkConfig = {
            MinGasLimit: 50_000,
            GasPerDataByte: 1_500,
            GasPriceModifier: 0.01,
            ChainID: "T",
        };

        const innerTx = new Transaction({
            nonce: 198,
            sender: bob.address,
            receiver: Address.fromBech32("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u"),
            gasLimit: 60000000,
            chainID: networkConfig.ChainID,
            data: new TransactionPayload("getContractConfig"),
        });

        innerTx.applySignature(await bob.signer.sign(innerTx.serializeForSigning()));

        const builder = new RelayedTransactionV1Builder();
        const relayedTxV1 = builder
            .setInnerTransaction(innerTx)
            .setRelayerNonce(2627)
            .setNetworkConfig(networkConfig)
            .setRelayerAddress(alice.address)
            .build();

        relayedTxV1.applySignature(await alice.signer.sign(relayedTxV1.serializeForSigning()));

        assert.equal(relayedTxV1.getNonce().valueOf(), 2627);
        assert.equal(
            relayedTxV1.getData().toString(),
            "relayedTx@7b226e6f6e6365223a3139382c2273656e646572223a2267456e574f65576d6d413063306a6b71764d354241707a61644b46574e534f69417643575163776d4750673d222c227265636569766572223a22414141414141414141414141415141414141414141414141414141414141414141414141414141432f2f383d222c2276616c7565223a302c226761735072696365223a313030303030303030302c226761734c696d6974223a36303030303030302c2264617461223a225a3256305132397564484a68593352446232356d6157633d222c227369676e6174757265223a2272525455544858677a4273496e4f6e454b6b7869642b354e66524d486e33534948314673746f577352434c434b3258514c41614f4e704449346531476173624c5150616130566f364144516d4f2b52446b6f364a43413d3d222c22636861696e4944223a2256413d3d222c2276657273696f6e223a327d",
        );
        assert.equal(
            relayedTxV1.getSignature().toString("hex"),
            "128e7cdc14c2b9beee2f3ff7a7fa5d1f5ef31a654a0c92e223c90ab28265fa277d306f23a06536248cf9573e828017004fb639617fade4d68a37524aafca710d",
        );
    });

    it("should compute relayed v1 transaction (with usernames)", async function () {
        const networkConfig = {
            MinGasLimit: 50_000,
            GasPerDataByte: 1_500,
            GasPriceModifier: 0.01,
            ChainID: "T",
        };

        const innerTx = new Transaction({
            nonce: 208,
            value: TokenTransfer.egldFromAmount(1),
            sender: carol.address,
            receiver: alice.address,
            senderUsername: "carol",
            receiverUsername: "alice",
            gasLimit: 50000,
            chainID: networkConfig.ChainID,
        });

        innerTx.applySignature(await carol.signer.sign(innerTx.serializeForSigning()));

        const builder = new RelayedTransactionV1Builder();
        const relayedTxV1 = builder
            .setInnerTransaction(innerTx)
            .setRelayerNonce(715)
            .setNetworkConfig(networkConfig)
            .setRelayerAddress(frank.address)
            .build();

        relayedTxV1.applySignature(await frank.signer.sign(relayedTxV1.serializeForSigning()));

        assert.equal(relayedTxV1.getNonce().valueOf(), 715);
        assert.equal(
            relayedTxV1.getData().toString(),
            "relayedTx@7b226e6f6e6365223a3230382c2273656e646572223a227371455656633553486b6c45344a717864556e59573068397a536249533141586f3534786f32634969626f3d222c227265636569766572223a2241546c484c76396f686e63616d433877673970645168386b77704742356a6949496f3349484b594e6165453d222c2276616c7565223a313030303030303030303030303030303030302c226761735072696365223a313030303030303030302c226761734c696d6974223a35303030302c2264617461223a22222c227369676e6174757265223a226a33427a6469554144325963517473576c65707663664a6f75657a48573063316b735a424a4d6339573167435450512b6870636759457858326f6f367a4b5654347464314b4b6f79783841526a346e336474576c44413d3d222c22636861696e4944223a2256413d3d222c2276657273696f6e223a322c22736e64557365724e616d65223a22593246796232773d222c22726376557365724e616d65223a22595778705932553d227d",
        );
        assert.equal(
            relayedTxV1.getSignature().toString("hex"),
            "3787d640e5a579e7977a4a1bcdd435ad11855632fa4a414a06fbf8355692d1a58d76ef0adbdd6ccd6bd3c329f36bd53c180d4873ec1a6c558e659aeb9ab92d00",
        );
    });

    it("should compute relayed v1 transaction with big value", async function () {
        const networkConfig = {
            MinGasLimit: 50_000,
            GasPerDataByte: 1_500,
            GasPriceModifier: 0.01,
            ChainID: "T",
        };

        const innerTx = new Transaction({
            nonce: 208,
            value: TokenTransfer.egldFromAmount(1999999),
            sender: carol.address,
            receiver: alice.address,
            senderUsername: "carol",
            receiverUsername: "alice",
            gasLimit: 50000,
            chainID: networkConfig.ChainID,
        });

        innerTx.applySignature(await carol.signer.sign(innerTx.serializeForSigning()));

        const builder = new RelayedTransactionV1Builder();
        const relayedTxV1 = builder
            .setInnerTransaction(innerTx)
            .setRelayerNonce(715)
            .setNetworkConfig(networkConfig)
            .setRelayerAddress(frank.address)
            .build();

        relayedTxV1.applySignature(await frank.signer.sign(relayedTxV1.serializeForSigning()));

        assert.equal(relayedTxV1.getNonce().valueOf(), 715);
        assert.equal(
            relayedTxV1.getData().toString(),
            "relayedTx@7b226e6f6e6365223a3230382c2273656e646572223a227371455656633553486b6c45344a717864556e59573068397a536249533141586f3534786f32634969626f3d222c227265636569766572223a2241546c484c76396f686e63616d433877673970645168386b77704742356a6949496f3349484b594e6165453d222c2276616c7565223a313939393939393030303030303030303030303030303030302c226761735072696365223a313030303030303030302c226761734c696d6974223a35303030302c2264617461223a22222c227369676e6174757265223a22594661677972512f726d614c7333766e7159307657553858415a7939354b4e31725738347a4f764b62376c7a3773576e2f566a546d68704378774d682b7261314e444832574d6f3965507648304f79427453776a44773d3d222c22636861696e4944223a2256413d3d222c2276657273696f6e223a322c22736e64557365724e616d65223a22593246796232773d222c22726376557365724e616d65223a22595778705932553d227d",
        );
        assert.equal(
            relayedTxV1.getSignature().toString("hex"),
            "c0fb5cf8c0a413d6988ba35dc279c63f8849572c5f23b1cab36dcc50952dc3ed9da01068d6ac0cbde7e14167bfc2eca5164d5c2154c89eb313c9c596e3f8b801",
        );
    });

    it("should compute guarded inner Tx - relayed v1 transaction", async function () {
        const networkConfig = {
            MinGasLimit: 50_000,
            GasPerDataByte: 1_500,
            GasPriceModifier: 0.01,
            ChainID: "T",
        };

        const innerTx = new Transaction({
            nonce: 198,
            sender: bob.address,
            receiver: Address.fromBech32("erd1qqqqqqqqqqqqqpgq54tsxmej537z9leghvp69hfu4f8gg5eu396q83gnnz"),
            gasLimit: 60000000,
            chainID: networkConfig.ChainID,
            data: new TransactionPayload("getContractConfig"),
            guardian: grace.address,
            version: TransactionVersion.withTxOptions(),
            options: TransactionOptions.withOptions({ guarded: true }),
        });

        innerTx.applySignature(await bob.signer.sign(innerTx.serializeForSigning()));
        innerTx.applyGuardianSignature(await grace.signer.sign(innerTx.serializeForSigning()));

        const builder = new RelayedTransactionV1Builder();
        const relayedTxV1 = builder
            .setInnerTransaction(innerTx)
            .setRelayerNonce(2627)
            .setNetworkConfig(networkConfig)
            .setRelayerAddress(alice.address)
            .build();

        relayedTxV1.applySignature(await alice.signer.sign(relayedTxV1.serializeForSigning()));

        assert.equal(relayedTxV1.getNonce().valueOf(), 2627);
        assert.equal(
            relayedTxV1.getData().toString(),
            "relayedTx@7b226e6f6e6365223a3139382c2273656e646572223a2267456e574f65576d6d413063306a6b71764d354241707a61644b46574e534f69417643575163776d4750673d222c227265636569766572223a22414141414141414141414146414b565841323879704877692f79693741364c64504b704f68464d386958513d222c2276616c7565223a302c226761735072696365223a313030303030303030302c226761734c696d6974223a36303030303030302c2264617461223a225a3256305132397564484a68593352446232356d6157633d222c227369676e6174757265223a224b4b78324f33383655725135416b4f465258307578327933446a384853334b373038487174344668377161557669424550716c45614e746e6158706a6f2f333651476d4a456934784435457a6c6f4f677a634d4442773d3d222c22636861696e4944223a2256413d3d222c2276657273696f6e223a322c226f7074696f6e73223a322c22677561726469616e223a22486f714c61306e655733766843716f56696c70715372744c5673774939535337586d7a563868477450684d3d222c22677561726469616e5369676e6174757265223a222b5431526f4833625a792f54423177342b6a365155477258645637457577553073753948646551626453515269463953757a686d634b705463526d58595252366c534c6652394931624d7134674730436538363741513d3d227d",
        );
        assert.equal(
            relayedTxV1.getSignature().toString("hex"),
            "39cff9d5100e290fbc7361cb6e2402261caf864257b4116f150e0c61e7869155dff8361fa5449431eb7a8ed847c01ba9b3b5ebafe5fac1a3d40c64829d827e00",
        );
    });

    it("should compute guarded inner tx and guarded relayed v1 transaction", async function () {
        const networkConfig = {
            MinGasLimit: 50_000,
            GasPerDataByte: 1_500,
            GasPriceModifier: 0.01,
            ChainID: "T",
        };

        const innerTx = new Transaction({
            nonce: 198,
            sender: bob.address,
            receiver: Address.fromBech32("erd1qqqqqqqqqqqqqpgq54tsxmej537z9leghvp69hfu4f8gg5eu396q83gnnz"),
            gasLimit: 60000000,
            chainID: networkConfig.ChainID,
            data: new TransactionPayload("addNumber"),
            guardian: grace.address,
            version: TransactionVersion.withTxOptions(),
            options: TransactionOptions.withOptions({ guarded: true }),
        });

        innerTx.applySignature(await bob.signer.sign(innerTx.serializeForSigning()));
        innerTx.applyGuardianSignature(await grace.signer.sign(innerTx.serializeForSigning()));
        const builder = new RelayedTransactionV1Builder();
        const relayedTxV1 = builder
            .setInnerTransaction(innerTx)
            .setRelayerNonce(2627)
            .setNetworkConfig(networkConfig)
            .setRelayerAddress(alice.address)
            .setRelayedTransactionVersion(TransactionVersion.withTxOptions())
            .setRelayedTransactionOptions(TransactionOptions.withOptions({ guarded: true }))
            .setRelayedTransactionGuardian(frank.address)
            .build();

        relayedTxV1.applySignature(await alice.signer.sign(relayedTxV1.serializeForSigning()));
        relayedTxV1.applyGuardianSignature(await frank.signer.sign(relayedTxV1.serializeForSigning()));

        assert.equal(relayedTxV1.getNonce().valueOf(), 2627);
        assert.equal(
            relayedTxV1.getData().toString(),
            "relayedTx@7b226e6f6e6365223a3139382c2273656e646572223a2267456e574f65576d6d413063306a6b71764d354241707a61644b46574e534f69417643575163776d4750673d222c227265636569766572223a22414141414141414141414146414b565841323879704877692f79693741364c64504b704f68464d386958513d222c2276616c7565223a302c226761735072696365223a313030303030303030302c226761734c696d6974223a36303030303030302c2264617461223a225957526b546e5674596d5679222c227369676e6174757265223a223469724d4b4a656d724d375174344e7635487633544c44683775654779487045564c4371674a3677652f7a662b746a4933354975573452633458543451533433475333356158386c6a533834324a38426854645043673d3d222c22636861696e4944223a2256413d3d222c2276657273696f6e223a322c226f7074696f6e73223a322c22677561726469616e223a22486f714c61306e655733766843716f56696c70715372744c5673774939535337586d7a563868477450684d3d222c22677561726469616e5369676e6174757265223a2270424754394e674a78307539624c56796b654d78786a454865374269696c37764932324a46676f32787a6e2f496e3032463769546563356b44395045324f747065386c475335412b532f4a36417762576834446744673d3d227d",
        );
        assert.equal(
            relayedTxV1.getSignature().toString("hex"),
            "8ede1bbeed96b102344dffeac12c2592c62b7313cdeb132e8c8bf11d2b1d3bb8189d257a6dbcc99e222393d9b9ec77656c349dae97a32e68bdebd636066bf706",
        );
    });
});
