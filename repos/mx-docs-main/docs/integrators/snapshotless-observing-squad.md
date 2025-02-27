---
id: snapshotless-observing-squad
title: Snapshotless Observing Squad
---

[comment]: # (mx-abstract)

This page describes the Snapshotless Observing Squad, a type of Observing Squad optimized for real-time requests such as accounts data fetching and vm-query operations.
More details related to exposed endpoints are available [here](/sdk-and-tools/proxy#snapshotless-observers-support).

[comment]: # (mx-context-auto)

## Overview

Whenever a node is executing the trie snapshotting process, the accounts data fetching & vm-query operations can be greatly affected.
This is caused by the fact that the snapshotting operation has a high CPU and disk I/O utilization.
The nodes started with the flag `--operation-mode snapshotless-observer` will not create trie snapshots on every epoch and will also prune the trie storage in order to save space. 

[comment]: # (mx-context-auto)

## Setup

[comment]: # (mx-context-auto)

### Creating a Snapshotless Observing Squad from scratch

If you choose to install a snapshotless Observing Squad from scratch, you should follow the instruction from the [observing squad section](/integrators/observing-squad) and remember to add in the `variables.cfg` file the operation mode in the node's extra flags definition:
```
NODE_EXTRA_FLAGS="-log-save -operation-mode snapshotless-observer"
```
After that, you can resume the normal Observing Squad installation steps.

Then, based on the needs there are multiple options concerning the proxy:
* if only a snapshotless squad is needed, nothing else should be done
* if both regular and snapshotless squads are needed:
  * with two different proxies: one started with regular observers and one started with snapshotless observers, nothing else should be done
  * with only one proxy (being served by all 8 observers), `IsSnapshotless = true` should be added to each observer started with this flag, in the proxy config (found at `$CUSTOM_HOME/elrond-proxy/config/config.toml`), as follows. Please note that this step is optional, although it would help the proxy to forward the requests in an efficient manner.
```toml
[[Observers]]
    ShardId = 0
    Address = "http://127.0.0.1:8080"
    IsSnapshotless = true
```

[comment]: # (mx-context-auto)

### Converting a normal Observing Squad to a Snapshotless Observing Squad

If you already have an Observing Squad, and you want to transform it into a Snapshotless Observing Squad, the easiest way is to manually edit the service file `/etc/systemd/system/elrond-node-x.service` (with `sudo`) and append the `-operation-mode snapshotless-observer` flag at the end of the `ExecStart=` line.
In the end, the file should look like:
```
[Unit]
  Description=MultiversX Node-0
  After=network-online.target

  [Service]
  User=jls
  WorkingDirectory=/home/ubuntu/elrond-nodes/node-0
  ExecStart=/home/ubuntu/elrond-nodes/node-0/node -use-log-view -log-logger-name -log-correlation -log-level *:DEBUG -rest-api-interface :8080 -log-save -profile-mode -operation-mode snapshotless-observer
  StandardOutput=journal
  StandardError=journal
  Restart=always
  RestartSec=3
  LimitNOFILE=4096

  [Install]
  WantedBy=multi-user.target
```

Save the file, and force a reload units with the command
```bash
sudo systemctl daemon-reload
```

After units reload, you can restart the nodes.

:::caution
Even if the nodes are synced, after changing the operation mode, they will start to re-sync their state in 
"snapshotless" format. The nodes should be temporarily started with the extra node flag `--force-start-from-network` that will force the node to start from network. 
Let the node sync completely and then remove this extra flag and restart the node. 
Failure to do so will make the node error with a message like `consensusComponentsFactory create failed: epoch nodes configuration does not exist epoch=0`.
:::

[comment]: # (mx-context-auto)

## One click deploy in AWS
AWS instances for Snapshotless Observing Squads can be easily deployed via our Amazon Machine Image available in the [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-pbwpmtdtwmkgs).

[comment]: # (mx-context-auto)

## One click deploy in Google Cloud
Google Cloud instances for Snapshotless Observing Squads can be easily deployed via our virtual machine image available in the [Google Cloud Marketplace](https://console.cloud.google.com/marketplace/product/multiversx-gcp-markeplace/multiversx-snapshotless-observing-squad).

[comment]: # (mx-context-auto)

## One click deploy in Tencent Cloud
Tencent Cloud nodes for Snapshotless Observing Squads can be easily deployed from the [Tencent Cloud Market](https://www.tencentcloud.com/market/product/P20240326183001630223531).

[comment]: # (mx-context-auto)

## One click deploy in Digital Ocean
Digital Ocean droplets for Snapshotless Observing Squads can be easily deployed via our droplets available in the [Digital Ocean Marketplace](https://marketplace.digitalocean.com/apps/multiversx-observing-squad).
