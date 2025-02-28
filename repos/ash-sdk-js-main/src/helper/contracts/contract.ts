import {
    AbiRegistry, Address, ArgSerializer,
    EndpointParameterDefinition, Interaction, ResultsParser, SmartContract, SmartContractAbi
} from "@multiversx/sdk-core/out";
import { ProxyNetworkProvider } from "@multiversx/sdk-network-providers/out";
import { gasLimitBuffer, gasPrice, maxGasLimit } from "../../const/dappConfig";
import { getDefaultProxyNetworkProvider } from "../proxy/util";
import { ChainId } from "../token/token";

type AbiType = {
    types: Record<string, any>;
}
export default class Contract<T extends AbiType = any> {
    protected chainId = ChainId.Mainnet;
    protected proxy: ProxyNetworkProvider = getDefaultProxyNetworkProvider();

    protected resultParser = new ResultsParser();
    address: Address;
    contract: SmartContract;
    abiRegistry: AbiRegistry;


    constructor(address: string, abi: T) {
        this.address = new Address(address);
        this.abiRegistry = AbiRegistry.create(abi as any);
        this.contract = new SmartContract({
            address: this.address,
            abi: new SmartContractAbi(this.abiRegistry),
        });
    }
    protected getProxy() {
        return this.proxy;
    }

    protected interceptInteraction(interaction: Interaction) {
        return interaction
            .withChainID(this.chainId)
            .withGasPrice(gasPrice)
            .withGasLimit(
                Math.min(
                    Math.floor(
                        interaction.getGasLimit().valueOf() * gasLimitBuffer
                    ),
                    maxGasLimit
                )
            );
    }

    protected async runQuery(interaction: Interaction) {
        const res = await this.getProxy().queryContract(
            interaction.check().buildQuery()
        );
        return this.resultParser.parseQueryResponse(
            res,
            interaction.getEndpoint()
        );
    }

    protected getAbiType(typeName: string) {
        const type = this.abiRegistry.customTypes.find(
            (t) => t.getName() === typeName
        );
        if (!type) throw new Error("invalid custom type");
        return type;
    }

    onChain(chainId: ChainId) {
        this.chainId = chainId;
        return this;
    }

    onProxy(proxy: ProxyNetworkProvider) {
        this.proxy = proxy;
        return this;
    }

    parseCustomType<U = any>(data: string, typeName: keyof T["types"]): U {
        const arg = new ArgSerializer();
        const type = this.getAbiType(typeName as string);
        return arg
            .buffersToValues(
                [Buffer.from(data, "base64")],
                [new EndpointParameterDefinition("foo", "bar", type)]
            )[0]
            ?.valueOf();
    }
}
