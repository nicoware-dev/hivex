# MultiversX Wallet Generator

This tool allows you to generate a MultiversX wallet for your AI agent and fetch the private key.

## Features

- Generate a new MultiversX wallet
- Get the mnemonic phrase, private key, and wallet address
- Save wallet information to a JSON file
- Load an existing wallet from a private key
- Sign transactions with your wallet

## Prerequisites

- Python 3.8 or higher
- Virtual environment (recommended)

## Installation

1. Create and activate a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install the required packages:

```bash
pip install multiversx-sdk
```

## Usage

### Generate a New Wallet

Run the wallet generator script:

```bash
python wallet_generator.py
```

This will:
1. Generate a new MultiversX wallet
2. Display the wallet address, private key, and mnemonic phrase
3. Save the wallet information to a JSON file in the `wallet_data` directory

### Load an Existing Wallet

You can load a wallet from a private key or from a wallet file:

```bash
# Load from a private key
python load_wallet.py <private_key_hex>

# Load from a wallet file
python load_wallet.py --file <wallet_file.json>
```

### Sign a Transaction

You can use the example script to sign a transaction:

```bash
python sign_transaction_example.py <wallet_file.json> <receiver_address> <amount>
```

This will:
1. Load the wallet from the specified file
2. Create a transaction to the specified receiver with the specified amount
3. Sign the transaction with the wallet's private key
4. Save the signed transaction to a JSON file in the `transactions` directory

## Output

### Wallet Generator Output

The wallet generator script creates a JSON file with the following information:

```json
{
    "mnemonic": "your 24-word mnemonic phrase",
    "private_key": "your private key in hex format",
    "address": "your wallet address in bech32 format (erd1...)"
}
```

### Transaction Signing Output

The transaction signing script creates a JSON file with the signed transaction details.

## Security Considerations

- **IMPORTANT**: Keep your private key and mnemonic phrase secure!
- Anyone with access to your private key or mnemonic phrase can control your wallet and funds.
- For production use, consider implementing additional security measures.

## Using the Wallet in Your AI Agent

To use this wallet in your AI agent:

1. Generate a wallet using this tool
2. Store the private key securely
3. Use the MultiversX SDK to sign transactions with the private key

Example code for signing a transaction:

```python
from multiversx_sdk.wallet.user_keys import UserSecretKey
from multiversx_sdk.core.transaction import Transaction
from multiversx_sdk.core.address import Address
from multiversx_sdk.core.transaction_computer import TransactionComputer

# Load your private key
private_key_hex = "your_private_key_from_wallet_json"
secret_key = UserSecretKey.new_from_string(private_key_hex)

# Convert string addresses to Address objects
sender = Address.new_from_bech32("erd1...")
receiver = Address.new_from_bech32("erd1...")

# Create a transaction
transaction = Transaction(
    nonce=0,
    value="1000000000000000000",  # 1 EGLD in smallest denomination
    sender=sender,
    receiver=receiver,
    gas_limit=50000,
    chain_id="D",
    data=b"",
    version=1
)

# Create a transaction computer
transaction_computer = TransactionComputer()

# Compute bytes for signing
transaction_bytes = transaction_computer.compute_bytes_for_signing(transaction)

# Sign the transaction
signature = secret_key.sign(transaction_bytes)
transaction.signature = signature.hex()
```

## Signing Transactions

To sign a transaction, you need to:

1. Create a `TransactionComputer` instance
2. Use it to compute the bytes for signing
3. Sign the bytes with your private key

```python
from multiversx_sdk.core.transaction_computer import TransactionComputer
from multiversx_sdk.core.address import Address

# Convert string addresses to Address objects
sender = Address.new_from_bech32("erd1...")
receiver = Address.new_from_bech32("erd1...")

# Create a transaction
transaction = Transaction(
    nonce=0,
    value="1000000000000000000",  # 1 EGLD in smallest denomination
    sender=sender,
    receiver=receiver,
    gas_limit=50000,
    chain_id="D",
    data=b"",
    version=1
)

# Create a transaction computer
transaction_computer = TransactionComputer()

# Compute bytes for signing
transaction_bytes = transaction_computer.compute_bytes_for_signing(transaction)

# Sign the transaction
signature = secret_key.sign(transaction_bytes)
transaction.signature = signature.hex()
```

## Serializing Transactions to JSON

When saving a transaction to a file or sending it to the network, you need to serialize it to JSON. Here's how to do it:

```python
# Create a dictionary manually
tx_dict = {
    "nonce": transaction.nonce,
    "value": str(transaction.value),
    "receiver": transaction.receiver.to_bech32(),
    "sender": transaction.sender.to_bech32(),
    "gasPrice": transaction.gas_price,
    "gasLimit": transaction.gas_limit,
    "data": transaction.data.decode() if transaction.data else "",
    "chainID": transaction.chain_id,
    "version": transaction.version,
    "signature": transaction.signature
}

# Save to a file
import json
with open("transaction.json", "w") as f:
    json.dump(tx_dict, f, indent=4)
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 