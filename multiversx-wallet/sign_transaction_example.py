#!/usr/bin/env python3

import json
import sys
from pathlib import Path
from multiversx_sdk.wallet.user_keys import UserSecretKey
from multiversx_sdk.core.transaction import Transaction
from multiversx_sdk.core.address import Address
from multiversx_sdk.core.transaction_computer import TransactionComputer

def load_wallet(wallet_file):
    """
    Load a wallet from a JSON file.
    
    Args:
        wallet_file (str): Path to the wallet JSON file.
        
    Returns:
        tuple: (private_key, address)
    """
    with open(wallet_file, 'r') as f:
        wallet_data = json.load(f)
    
    if 'private_key' not in wallet_data:
        raise ValueError("Wallet file does not contain a private key")
    
    return wallet_data['private_key'], wallet_data.get('address')

def create_and_sign_transaction(private_key_hex, sender_address, receiver_address, amount, nonce=0, gas_limit=50000, chain_id="D"):
    """
    Create and sign a transaction.
    
    Args:
        private_key_hex (str): The private key in hex format.
        sender_address (str): The sender's address in bech32 format.
        receiver_address (str): The receiver's address in bech32 format.
        amount (str): The amount to send (in smallest denomination).
        nonce (int): The sender's account nonce.
        gas_limit (int): The gas limit for the transaction.
        chain_id (str): The chain ID.
        
    Returns:
        Transaction: The signed transaction.
    """
    # Create a secret key from the hex string
    secret_key = UserSecretKey.new_from_string(private_key_hex)
    
    # Convert string addresses to Address objects
    sender = Address.new_from_bech32(sender_address)
    receiver = Address.new_from_bech32(receiver_address)
    
    # Create a transaction
    transaction = Transaction(
        nonce=nonce,
        value=amount,
        sender=sender,
        receiver=receiver,
        gas_limit=gas_limit,
        chain_id=chain_id,
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
    
    return transaction

def main():
    if len(sys.argv) < 4:
        print("Usage: python sign_transaction_example.py <wallet_file.json> <receiver_address> <amount>")
        return
    
    wallet_file = sys.argv[1]
    receiver_address = sys.argv[2]
    amount = sys.argv[3]
    
    try:
        # Load the wallet
        private_key, sender_address = load_wallet(wallet_file)
        
        # Create and sign the transaction
        transaction = create_and_sign_transaction(
            private_key_hex=private_key,
            sender_address=sender_address,
            receiver_address=receiver_address,
            amount=amount
        )
        
        # Print the transaction details
        print("\nSigned Transaction:")
        print(f"Sender: {transaction.sender.to_bech32()}")
        print(f"Receiver: {transaction.receiver.to_bech32()}")
        print(f"Amount: {transaction.value}")
        print(f"Nonce: {transaction.nonce}")
        print(f"Signature: {transaction.signature}")
        
        # Save the transaction to a file
        output_dir = Path("transactions")
        output_dir.mkdir(exist_ok=True)
        
        # Create a dictionary manually instead of using to_dictionary()
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
        
        output_path = output_dir / "signed_transaction.json"
        with open(output_path, "w") as f:
            json.dump(tx_dict, f, indent=4)
        
        print(f"\nTransaction saved to {output_path}")
        print("\nNote: This is just an example. The transaction has not been broadcast to the network.")
        print("To broadcast the transaction, you would need to use a network provider.")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 