# AshSwap Sdk


## Pool Contracts
The Pool Contract acts as an AMM for trading tokens. The AMM is based on Curve's algorithm used for the stable coin. Fee contains two types of fees: trading fee and admin fee.

The trading fee will stay in the liquidity pool to leverage LP holder interest. The admin fee will be sent to the veASH holder.

```typescript
    //Example of swap

    const proxy = new ProxyNetworkProvider(MVXProxyNetworkAddress.Mainnet)
    const tokenIn = TOKENS_MAP["EGLD"]
    const tokenOut = TOKENS_MAP["ASH-a642d1"];
    const tokenPayment = TokenPayment.fungibleFromBigInteger(
        tokenIn.identifier,
        new BigNumber(10),
        tokenIn.decimals
    );

    const poolContract = ContractManager.getPoolContract(
        poolAddress
    ).onChain(ChainId.Mainnet).onProxy(proxy);

    const tx = await poolContract.exchange(
        tokenPayment,
        tokenOut.identifier,
        new BigNumber(1),
    );

```

See more in [example](https://github.com/ashswap/ash-sdk-js/tree/main/example/pool.ts)

## Farm Contract
The Farm Contract is a contract where users can lock their LP token to receive ASH.

Following Maiar Exchange, the farm position is represented by Farm Token, which is a Semi-Fungible Token. The reasoning behind this is that to calculate the reward for the token owner without storing anything on a smart contract.

```typescript
    //Example of stake

    const farm = FARMS_MAP[farmAddress];
    const farmContract = ContractManager.getFarmContract(
        farm.farm_address
    );
    const stakeAmt = new BigNumber(1);

    const farmTokenInWallet: IMetaESDT[] = [];

    const tokenPayments = farmTokenInWallet.map((t) =>
        TokenPayment.metaEsdtFromBigInteger(
            t.collection,
            t.nonce,
            t.balance,
            farm.farm_token_decimal
        )
    );
    tokenPayments.unshift(
        TokenPayment.fungibleFromBigInteger(
            farm.farming_token_id,
            stakeAmt,
            farm.farming_token_decimal
        )
    );
    const tx = await farmContract.enterFarm(
        Address.Zero().bech32(),
        tokenPayments,
    );
```
See more in [example](https://github.com/ashswap/ash-sdk-js/tree/main/example/farm.ts)

## Voting Escrow Contract (DAO)
Contract where users can lock their ASH token for pre-set periods to gain veASH (Votes). Votes have weight depending on time. A user who has veASH can receive an admin fee from Pool Contract as their reward.

Besides that, they can use their veASH as a voting weight in the DAO voting system.

```typescript
    const contract = ContractManager.getVotingEscrowContract("erd1...");
    const tx = await contract.withdraw();
```
See more in [example](https://github.com/ashswap/ash-sdk-js/tree/main/example/votingEscrow.ts)

## Fee Distributor Contract
The contract contains the admin fee that is collected from Pools and distribute it into veASH owner.

```typescript
    const contract = ContractManager.getFeeDistributorContract("erd1...");
    const tx = await contract.claim(new Address("erd1..."));
```
See more in [example](https://github.com/ashswap/ash-sdk-js/tree/main/example/freeDistributor.ts)

