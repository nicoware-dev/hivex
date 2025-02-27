---
id: notifier
title: Events notifier
---

[comment]: # (mx-abstract)

## Overview

A MultiversX observer node can push block events to a notifier service, which will process
and forward the events to subscribers (via RabbitMQ or WebSocket Client). This way, one can subscribe to a RabbitMQ
queue (or WebSocket connection) and receive block events, whenever a block is committed to the chain, instead of 
polling an API frequently.

The GitHub repository for the notifier service can be found [here](https://github.com/multiversx/mx-chain-notifier-go).

[comment]: # (mx-context-auto)

## Architectural Overview

The observer node in the network will be connected to notifier service.
The observer will send block events to notifier. The notifier service will
receive and filter events, it will apply deduplication if enabled, and it will push the events
to RabbitMQ instance, or to WebSocket subscribers.

:::important
Set up at least one observer for each shard in order to handle all the events in the chain.
:::

![img](/technology/notifier-overview.png)

In the figure above:
- The observer nodes will push block events to Notifier instance, via WebSocket or HTTP requests. There are several endpoints/topics for this:
    - `block events` -> it will handle all events for each round
    - `revert events` -> if there is a reverted block, the event will be
      pushed on this route
    - `finalized events` -> when the block has been finalized, the events
      will be pushed on this route
- Notifier checks locker service (via Redis) and applies deduplication
- Notifier will push events to RabbitMQ if enabled, or via Websocket. If Websocket will be enabled an additional endpoint will be available:
    - `/hub/ws` (GET) - this route can be used to manage the websocket connection subscription

:::info
Please make the distinction between `observer node` -> `notifier` communication (which can be via HTTP or WebSocket) and
`notifier` -> `subscriber` (which can be via RabbitMQ or WebSocket).
:::

[comment]: # (mx-context-auto)

## Set up observer client

On the observer side, there is a WebSocket client that will push block events to notifier service.
There is also the HTTP Integration, which will be deprecated in the future.

In the observer node's configuration directory, the `external.toml` config file can be configured
to enable events notifier connector via WebSocket or via HTTP integrations. The config file can be found 
[here](https://github.com/multiversx/mx-chain-go/blob/master/cmd/node/config/external.toml).

:::tip
For setting up an observer client, make sure to also check the
[README](https://github.com/multiversx/mx-chain-notifier-go?tab=readme-ov-file#prerequisites)
instructions within the events notifier source code repository.
:::

[comment]: # (mx-context-auto)

### WebSocket Integration

The WebSocket integration is a generic one, and can be used for multiple outport driver integrations.
In case Elasticsearch integration is already being used with WebSocket connector, a separate config
section `HostDriversConfig` has to be set for event notifier.

The corresponding config section for enabling the WebSocket driver on observer node:

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

    # This flag defines the marshaller type. Currently supported: "json", "gogo protobuf"
    MarshallerType = "gogo protobuf"

    # The number of seconds when the client will try again to send the data
    RetryDurationInSec = 5

    # Sets if, in case of data payload processing error, we should block or not the advancement to the next processing event. Set this to true if you wish the node to stop processing blocks if the client/server encounters errors while processing requests.
    BlockingAckOnError = true

    # Set to true to drop messages if there is no active WebSocket connection to send to.
    DropMessagesIfNoConnection = false

    # Defines the payload version. Version will be changed when there are breaking
    # changes on payload data. The receiver/consumer will have to know how to handle different
    # versions. The version will be sent as metadata in the websocket message.
    Version = 1
```

In this case, observer node will act as client and events notifier service will act as a server.
`Mode` option should be set to `client`. It is important to have `WithAcknowledge` set to `true`
since observer node should continue only if there is an acknowledge that the event was processed
successfully. `MarshallerType` field has to be aligned with `DataMarshallerType` on events notifier
configuration file.

[comment]: # (mx-context-auto)

### HTTP Integration

For http integration, the supported config variables are as follows:

- `Enabled`: signals whether a driver should be attached when launching the node.
- `UseAuthorization`: signals whether to use authorization. For testing purposes it can be set to `false`.
- `ProxyUrl`: host and port on which the `eventNotifier` will push the parsed event data.
- `Username`: the username used for authorization, if enabled.
- `Password`: the password used for authorization, if enabled.

The corresponding config section for enabling the driver on observer node:

```toml
[EventNotifierConnector]
    # Enabled will turn on or off the event notifier connector
    Enabled = true

    # UseAuthorization signals the proxy to use authorization
    # Never run a production setup without authorization
    UseAuthorization = false

    # ProxyUrl is used to communicate with the subscriptions hub
    # The indexer instance will broadcast data using ProxyUrl
    ProxyUrl = "http://localhost:5000"

    # Username and Password need to be specified if UseAuthorization is set to true
    Username = ""

    # Password is used to authorize an observer to push event data
    Password = ""

    # RequestTimeoutSec defines the timeout in seconds for the http client
    RequestTimeoutSec = 60

    # MarshallerType is used to define the marshaller type to be used for inner
    # marshalled structures in block events data
    MarshallerType = "json"
```

:::info
HTTP Integration will be deprecated in the future.
:::

:::tip
Due to the possible high data volume, it's not recommended to use validators as nodes
to push events to Notifier Service.
Similar to Elasticsearch indexing, our implementation uses a concept of a queue and makes
sure that everything is being processed. Consensus and synchronization mechanisms can have
delays due to outport driver.
:::

[comment]: # (mx-context-auto)

## Set up notifier service

In the notifier configuration directory (`cmd/notifier/config`), there is the `config.toml`
file that can be used to configure the service.

:::tip
For setting up an events notifier service, make sure to also check the
[README](https://github.com/multiversx/mx-chain-notifier-go?tab=readme-ov-file#prerequisites)
instructions within the events notifier source code repository.
:::

There are some general configuration options, which should be fine with their default values:
```toml
[General]
    # CheckDuplicates signals if the events received from observers have been already pushed to clients
    # Requires a redis instance/cluster and should be used when multiple observers push from the same shard
    CheckDuplicates = true

    # ExternalMarshaller is used for handling incoming/outcoming api requests 
    [General.ExternalMarshaller]
        Type = "json"
    # InternalMarshaller is used for handling internal structs
    # This has to be mapped with the internal marshalling used for notifier outport driver
    [General.InternalMarshaller]
        Type = "json"

    # Address pubkey converter config options
    [General.AddressConverter]
        Type = "bech32"
        Prefix = "erd"
        Length = 32
```

:::info
Starting with release `v1.2.0`, `CheckDuplicates` field has been moved from `ConnectorApi` section to
the newly added `General` section. Please make sure to put `CheckDuplicates` field before other inner
struct fields in `General` section.
:::

There are 2 ways to connect observer node with events notifier service:
- via WebSocket integration
- via HTTP integration (which will be deprecated in the future)

[comment]: # (mx-context-auto)

### WebSocket Integration {#notifier-websocket-integration}

There is a separate config section `WebSocketConnector` that has to be aligned with
`HostDriversConfig` from observer node.

```toml
[WebSocketConnector]
    # Enabled will determine if websocket connector will be enabled or not
    Enabled = false

    # URL for the WebSocket client/server connection
    # This value represents the IP address and port number that the WebSocket client or server will use to establish a connection.
    URL = "localhost:22111"

    # This flag describes the mode to start the WebSocket connector. Can be "client" or "server"
    Mode = "server"

    # Possible values: json, gogo protobuf. Should be compatible with mx-chain-node outport driver config
    DataMarshallerType = "gogo protobuf"

    # Retry duration (receive/send ack signal) in seconds
    RetryDurationInSec = 5

    # Signals if in case of data payload processing error, we should send the ack signal or not
    BlockingAckOnError = false

    # Set to true to drop messages if there is no active WebSocket connection to send to.
    DropMessagesIfNoConnection = false

    # After a message will be sent it will wait for an ack message if this flag is enabled
    WithAcknowledge = true

    # The duration in seconds to wait for an acknowledgment message, after this time passes an error will be returned
    AcknowledgeTimeoutInSec = 60
```

[comment]: # (mx-context-auto)

### HTTP Integration {#websocket-http-integration}

The supported config variables are:
- `Host`: the address and/or port on which the http server listens on. Should be the same 
  port in the `ProxyUrl` described above, for observer node.
- `Username`: the username used to authorize an observer. Can be left empty for `UseAuthorization = false`.
- `Password`: the password used to authorize an observer. Can be left empty for `UseAuthorization = false`.
- `CheckDuplicates`: if true, it will check (based on a locker service using redis) if the event have been already pushed to clients

The `ConnectorApi` section has to be aligned with the one from observer node:
```toml
[ConnectorApi]
    # Enabled will determine if http connector will be enabled or not
    Enabled = true

    # The address on which the events notifier listens for subscriptions
    # It can be specified as "localhost:5000" or only as "5000"
    Host = "5000"

    # Username and Password needed to authorize the connector
    # BasicAuth is enabled only for the endpoints with "Auth" flag enabled
    # in api.toml config file 
    Username = ""
    Password = ""
```

:::info
Starting with release `v1.2.0`, an additional field `Enabled = true` has been added.
:::

[comment]: # (mx-context-auto)

### Deduplication

If `CheckDuplicates` is set to `true` in events notifier main config file,
the notifier service will try to connect to a **redis** instance.
In this context, redis will be used as a locker service mechanism for deduplication.
This is useful in scenarios when multiple observer nodes from same shard are used to send
events to the same notifier instance.

The `Redis` section includes the following parameters as described below:

```toml
[Redis]
    # The url used to connect to a pubsub server
    Url = "redis://localhost:6379/0"

    # The master name for failover client
    MasterName = "mymaster"

    # The sentinel url for failover client
    SentinelUrl = "localhost:26379"

    # The redis connection type. Options: | instance | sentinel |
    # instance - it will try to connect to a single redis instance
    # sentinel - it will try to connect to redis setup with master, slave and sentinel instances
    ConnectionType = "sentinel"

    # Time to live (in minutes) for redis lock entry
    TTL = 30
```

The `redis` service has to be configured separately.
For more details on notifier service redis setup, please follow the **Install** and **Launching**
sections from [README](https://github.com/multiversx/mx-chain-notifier-go) in the repository.
There is also an [example](https://github.com/multiversx/mx-chain-notifier-go/blob/main/docker-compose.yml)
on how to run a setup with redis locally (for development) with docker-compose.

[comment]: # (mx-context-auto)

## Subscribers

Currently there are 2 supported subscribing solutions:
* RabbitMQ
* WebSocket

The subscribing solution is selected based on a CLI parameter, please check
[README](https://github.com/multiversx/mx-chain-notifier-go) from
github repository for more info on the CLI parameters.

[comment]: # (mx-context-auto)

### RabbitMQ

In the notifier configuration directory (`cmd/notifier/config`), in `config.toml` there is
a separate section `RabbitMQ`, which can be used to set up rabbitMQ connection url and
exchanges. The exchanges will be created automatically (if they are not already created) on
notifier service start.

```toml
[RabbitMQ]
    # The url used to connect to a rabbitMQ server
    Url = "amqp://guest:guest@localhost:5672"

    # The exchange which holds all logs and events
    [RabbitMQ.EventsExchange]
        Name = "all_events"
        Type = "fanout"

    # The exchange which holds revert events
    [RabbitMQ.RevertEventsExchange]
        Name = "revert_events"
        Type = "fanout"

    ...
```

:::tip
It is recommended to use the setup with RabbitMQ, if it is very important to avoid losing any event.
:::

[comment]: # (mx-context-auto)

### WebSocket

If WebSocket subscribing solution is selected via CLI parameter, an additional HTTP
endpoint `/hub/ws/` will be available for sending subscriptions.

There are more notes
on how to send subscriptions and how to consume events
[here](https://github.com/multiversx/mx-chain-notifier-go?tab=readme-ov-file#websockets).

Please check also events section [below](#events) on how a WS event is constructed. 

:::info
Please make the distinction between `observer node` -> `notifier` communication which can be done via `WebSocket` and the
`WebSocket` subscribing solution which is a different setup from the one presented [above](#notifier-websocket-integration)
:::

[comment]: # (mx-context-auto)

## Events

There are multiple event types:
- `Push Block event`: when the block is committed, it contains logs and events
- `Revert Block event`: when the block is reverted
- `Finalized Block event`: when the block is finalized

In RabbitMQ there is a separate exchange for each event type.
In Websocket setup, there is a event type field in each message.

The WS event is defined as follows:

| Field      | Description                                                                    |
|------------|--------------------------------------------------------------------------------|
| Type       | The type field defines the event type, it can be one of the following: `all_events`, `revert_events`, `finalized_events`. `all_events` refers to all logs and events. |
| Data       | Serialized data corresponding to the event type. |

[comment]: # (mx-context-auto)

### Push Block Event

Each time a block is committed on the chain, an event will be triggered with basic information
on the block together with logs and events. The structure data fields are as following:

Push Block Event

| Field          | Description                                               |
|----------------|-----------------------------------------------------------|
| hash           | The hash field represents the hash of the committed block. |
| events         | The events field holds a list of events.                  |

Event structure 

| Field       | Description                                                                                                                                                                               |
|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| identifier  | This field represents the identifier of the event.                                                                                                                                        |
| address     | The address field holds the address in bech32 encoding. It can be the address of the smart contract that generated the event or the address of the receiver address of the transaction.   |
| topics      | The topics field holds a list with extra information. They don't have a specific order because the smart contract is free to log anything that could be helpful.                          |
| data        | The data field can contain information added by the smart contract that generated the event.                                                                                              |
| order       | The order field represents the index of the event indicating the execution order.                                                                                                         |

[comment]: # (mx-context-auto)

### Revert Block Event

When there is a revert for a particular block on the chain, a revert event will be triggered,
containing basic info on the block.

| Field      | Description                                                                    |
|------------|--------------------------------------------------------------------------------|
| hash       | The hash field represents the hash of the committed block.                      |
| nonce      | The nonce field represents the sequence number of the block.                   |
| round      | The round field represents the round when the block was proposed and executed. |
| epoch      | The epoch field represents the epoch when the block was proposed and executed. |

[comment]: # (mx-context-auto)

### Finalized Block Event

When a block is completely finalized, including intra-shard transactions, a finalized event will
be triggered containing the hash of the block.

| Field      | Description                                                                    |
|------------|--------------------------------------------------------------------------------|
| hash       | The hash field represents the hash of the committed block.                      |
