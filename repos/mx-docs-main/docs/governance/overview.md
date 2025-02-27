---
id: overview
title: Governance - Overview
---

[comment]: # (mx-abstract)

This page provides an overview of the On-chain Governance module that will be available on the `v1.6.x` release.

[comment]: # (mx-context-auto)

## Table of contents

| Name                                                                              | Description                                                              |
|-----------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| [Interacting with the on-chain governance SC](/governance/governance-interaction) | Interacting with the governance system smart contract.                   |

[comment]: # (mx-context-auto)

## Overview

The MultiversX network is able to handle on-chain governance proposes by issuing special types of transactions. This was implemented as a mean for further increasing the decentralization of the decision-making process.

Anyone can create a proposal using their wallet and issuing a special type of transaction specifying an identifier, a starting epoch and an end epoch.

Users that staked EGLD will be able to cast votes upon opened proposals. The voting power is proportional with the staked value and is computed as `voting_power = staked_value` (linear voting).

[comment]: # (mx-context-auto)

## Implementation details

Each proposal costs 1000 EGLD that will be locked during the voting of the proposal. If the proposal is either rejected or accepted, the entire locked sum can be unlocked & withdrawn. If the proposal do not pass, 10 EGLD will remain locked in the governance smart contract as a penalty fee. The proposal costs around 51 million of gas units.

There are 4 types of votes: **Yes**, **No**, **Abstain** and **Veto**. Each of the vote costs around 6 million of gas units.

A user can create any number of proposals as long as it pays the locking fee & the gas used for the transaction. The proposal can be closed in any epoch following the provided end epoch.

The quorum is computed as the sum of the staked EGLD for all addresses that cast votes.

The votes will be added for each category (**Yes**, **No**, **Abstain** and **Veto**). The vote is computed as `vote = total_staked_value` for each address that cast a vote.

A proposal can pass only if all conditions are met:
- the quorum value is at least the minimumQuorumThresholdPercentage * total staked value held by the staking contracts;
- the **Yes** value > **No** value (simple majority);
- the **Yes** value is at least the minimumPassThresholdPercentage * sum of votes on all 4 categories.
- the **Veto** value did not reach the minimumVetoThresholdPercentage * sum of votes on all 4 categories;

[comment]: # (mx-context-auto)

### Example
Let's suppose we have the following addresses that cast the following votes:
- `alice`: staked value 2000 EGLD that vote **Yes**
- `bob`: staked value 3000 EGLD that vote **Yes**
- `charlie`: staked value 4000 EGLD that vote **Yes**
- `delta`: staked value 1500 EGLD that vote **No**

The quorum in this case will be a value `(2000+3000+4000+1500) * 10^18 = 10500 * 10^18`.

The **Yes** category will hold the value `2000 * 10^18 + 3000 * 10^18 + 4000 * 10^18 = 9000 * 10^18`  
The **No** category will hold the value `1500 * 10^18`
The **Abstain** and **Veto** categories will both hold 0.
The total voted value is `9000 * 10^18 + 1500 * 10^18 + 0 + 0 = 10500 * 10^18`

Supposing the total staked value in the system is `20000 EGLD` and the minimum quorum threshold percentage is `20%`, then the minimum quorum value is `20% * 20000 = 4000 EGLD`. 

The following list contains true sentences:
- the quorum value (`10500 EGLD`) is larger than the minimum quorum (`4000 EGLD`)
- **Yes** value (`9000 * 10^18`) is larger than the **No** value (`1500 * 10^18`)
- **Yes** value (`9000 * 10^18`) is larger than the pass threshold (`50%`) \* total voted value (`10500 * 10^18`) which is `5250 * 10^18` 
- the **Veto** did not reach `33%` of the total vote value because it was `0`

To sum it all, **the proposal passed**.
