#!/usr/bin/env python3

import sys
import json
from pathlib import Path
from multiversx_sdk.wallet.user_keys import UserSecretKey

def load_wallet_from_private_key(private_key_hex):
    """
    Load a MultiversX wallet from a private key.
    
    Args:
        private_key_hex (str): The private key in hex format.
        
    Returns:
        dict: A dictionary containing the wallet information.
    """
    try:
        # Create a secret key from the hex string
        secret_key = UserSecretKey.new_from_string(private_key_hex)
        
        # Generate the public key from the secret key
        public_key = secret_key.generate_public_key()
        
        # Generate the address from the public key
        address = public_key.to_address()
        
        return {
            "private_key": private_key_hex,
            "address": address.bech32()
        }
    except Exception as e:
        print(f"Error loading wallet: {str(e)}")
        return None

def load_wallet_from_file(file_path):
    """
    Load a MultiversX wallet from a JSON file.
    
    Args:
        file_path (str): Path to the JSON file containing the wallet information.
        
    Returns:
        dict: A dictionary containing the wallet information.
    """
    try:
        with open(file_path, 'r') as f:
            wallet_data = json.load(f)
        
        if 'private_key' not in wallet_data:
            print("Error: The wallet file does not contain a private key.")
            return None
        
        return load_wallet_from_private_key(wallet_data['private_key'])
    except Exception as e:
        print(f"Error loading wallet file: {str(e)}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python load_wallet.py <private_key_hex>")
        print("  python load_wallet.py --file <wallet_file.json>")
        return
    
    if sys.argv[1] == "--file":
        if len(sys.argv) < 3:
            print("Error: Please provide a wallet file path.")
            return
        
        file_path = sys.argv[2]
        wallet_data = load_wallet_from_file(file_path)
    else:
        private_key_hex = sys.argv[1]
        wallet_data = load_wallet_from_private_key(private_key_hex)
    
    if wallet_data:
        print("\nWallet Information:")
        print(f"Address: {wallet_data['address']}")
        print(f"Private Key: {wallet_data['private_key']}")

if __name__ == "__main__":
    main() 