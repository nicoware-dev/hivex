import {
    ProxyNetworkProvider,
} from "@multiversx/sdk-network-providers/out";

export enum MVXProxyNetworkAddress {
    Mainnet = "https://api.multiversx.com",
    Testnet = "https://testnet-api.multiversx.com",
    Devnet = "https://devnet-api.multiversx.com",
}

let proxyProvider: ProxyNetworkProvider | null = null;
export const getDefaultProxyNetworkProvider = () => {
    if (!proxyProvider) {
        proxyProvider = new ProxyNetworkProvider(MVXProxyNetworkAddress.Mainnet);
    }
    return proxyProvider;
};

