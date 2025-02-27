import { IAddress } from "../interface";
import {
    IAccountOnNetwork,
    IContractQueryResponse,
    INetworkConfig,
    ITransactionOnNetwork,
    ITransactionStatus,
} from "../interfaceOfNetwork";
import { ApiNetworkProvider, ProxyNetworkProvider } from "../networkProviders";
import { Query } from "../smartcontracts/query";
import { Transaction } from "../transaction";

export function createLocalnetProvider(): INetworkProvider {
    return new ProxyNetworkProvider("http://localhost:7950", { timeout: 5000 });
}

export function createTestnetProvider(): INetworkProvider {
    return new ApiNetworkProvider("https://testnet-api.multiversx.com", {
        timeout: 5000,
        clientName: "mx-sdk-js-core/tests",
    });
}

export function createDevnetProvider(): INetworkProvider {
    return new ProxyNetworkProvider("https://devnet-gateway.multiversx.com", {
        timeout: 5000,
        clientName: "mx-sdk-js-core/tests",
    });
}

export function createMainnetProvider(): INetworkProvider {
    return new ProxyNetworkProvider("https://gateway.multiversx.com", {
        timeout: 10000,
        clientName: "mx-sdk-js-core/tests",
    });
}

export interface INetworkProvider {
    getNetworkConfig(): Promise<INetworkConfig>;
    getAccount(address: IAddress): Promise<IAccountOnNetwork>;
    getTransaction(txHash: string, withProcessStatus?: boolean): Promise<ITransactionOnNetwork>;
    getTransactionStatus(txHash: string): Promise<ITransactionStatus>;
    sendTransaction(tx: Transaction): Promise<string>;
    simulateTransaction(tx: Transaction): Promise<any>;
    queryContract(query: Query): Promise<IContractQueryResponse>;
}
