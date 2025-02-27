---
id: indexer
title: Elasticindexer service
---

[comment]: # (mx-abstract)

## Overview

:::tip
This feature will work starting from `rc/v1.6.0` version of the node
:::

A MultiversX observer node can send messages over `WebSocket` to an elastic indexer service, which will process and index the data in an Elasticsearch database.

The GitHub repository for the `elasticindexer` service can be found [here](https://github.com/multiversx/mx-chain-es-indexer-go/tree/rc/v1.6.0).

[comment]: # (mx-context-auto)

## Architectural Overview

The observer node in the network will be connected to `elasticindexer` service.

:::important
Set up one observer for each shard in order to handle all the data in the chain.
:::

![img](/technology/indexer.png)

In the figure above:
- The observer nodes will send WebSocket messages to the `elasticindexer` service.
- The `elasticindexer` service will receive and process the WebSocket messages and index data in an Elasticsearch cluster.

[comment]: # (mx-context-auto)

## Set up observer and elasticindexer

[comment]: # (mx-context-auto)

### Observer Client

On the observer side, there is a WebSocket host that will send messages to the elasticindexer service.

In the observer node's configuration directory, `external.toml` config file can be configured
to enable host driver config. The config file can be found
[here](https://github.com/multiversx/mx-chain-go/blob/rc/v1.6.0/cmd/node/config/external.toml).

The corresponding config section for enabling the driver:

```toml
[[HostDriversConfig]]
    # This flag shall only be used for observer nodes
    Enabled = true
    # This flag will start the WebSocket connector as server or client (can be "client" or "server")
    Mode = "client"
    # URL for the WebSocket client/server connection
    # This value represents the IP address and port number that the WebSocket client or server will use to establish a connection.
    URL = "127.0.0.1:22111"
    # After a message will be sent it will wait for an ack message if this flag is enabled
    WithAcknowledge = true
    # The duration in seconds to wait for an acknowledgment message, after this time passes an error will be returned
    AcknowledgeTimeoutInSec = 60
    # Possible values: json, gogo protobuf. Should be compatible with mx-chain-es-indexer-go config
    MarshallerType = "json"
    # The number of seconds when the client will try again to send the data
    RetryDurationInSec = 5
    # Sets if, in case of data payload processing error, we should block or not the advancement to the next processing event. Set this to true if you wish the node to stop processing blocks if the client/server encounters errors while processing requests.
    BlockingAckOnError = true
    # Set to true to drop messages if there is no active WebSocket connection to send to.
    DropMessagesIfNoConnection = false
```

[comment]: # (mx-context-auto)

### Elasticindexer service

In the `elasticindexer` configuration directory (`cmd/elasticindexer/config`), there is the `prefs.toml`
file that can be used to configure the service.

The `config.web-socket` section has to be aligned with the one from observer node:

```toml
[config]
    disabled-indices = []
    [config.web-socket]
        # URL for the WebSocket client/server connection
        # This value represents the IP address and port number that the WebSocket client or server will use to establish a connection.
        url = "localhost:22111"
        # This flag describes the mode to start the WebSocket connector. Can be "client" or "server"
        mode = "server"
        # Possible values: json, gogo protobuf. Should be compatible with mx-chain-node outport driver config
        data-marshaller-type = "json"
        # Retry duration (receive/send ack signal) in seconds
        retry-duration-in-seconds = 5
        # Signals if in case of data payload processing error, we should send the ack signal or not
        blocking-ack-on-error = true
        # After a message will be sent it will wait for an ack message if this flag is enabled
        with-acknowledge = true
        # The duration in seconds to wait for an acknowledgment message, after this time passes an error will be returned
        acknowledge-timeout-in-seconds = 50
```

The corresponding config section for the Elasticsearch section:

```toml
[config.elastic-cluster]
        use-kibana = false
        url = "http://localhost:9200"
        username = ""
        password = ""
        bulk-request-max-size-in-bytes = 4194304 # 4MB
```

For more details on `elasticindexer` service setup, please follow the **Install** and **Launching**
sections from [README](https://github.com/multiversx/mx-chain-es-indexer-go) in the repository.
