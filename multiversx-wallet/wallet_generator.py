#!/usr/bin/env python3

import os
import json
from pathlib import Path
from multiversx_sdk.wallet.mnemonic import Mnemonic
from multiversx_sdk.wallet.user_keys import UserSecretKey
from multiversx_sdk.wallet.user_wallet import UserWallet
from multiversx_sdk.core.address import Address

def generate_wallet():
    """
    Generate a new MultiversX wallet and return the mnemonic, private key, and address.
    """
    # Generate a new mnemonic phrase
    mnemonic = Mnemonic.generate()
    mnemonic_text = mnemonic.get_text()
    
    # Derive the secret key from the mnemonic
    secret_key = mnemonic.derive_key(address_index=0)
    
    # Generate the public key from the secret key
    public_key = secret_key.generate_public_key()
    
    # Generate the address from the public key
    address = public_key.to_address()
    
    # Get the private key in hex format
    private_key_hex = secret_key.hex()
    
    return {
        "mnemonic": mnemonic_text,
        "private_key": private_key_hex,
        "address": address.bech32()
    }

def save_wallet_to_file(wallet_data, filename="wallet.json"):
    """
    Save the wallet data to a JSON file.
    """
    output_dir = Path("wallet_data")
    output_dir.mkdir(exist_ok=True)
    
    output_path = output_dir / filename
    
    with open(output_path, "w") as f:
        json.dump(wallet_data, f, indent=4)
    
    print(f"Wallet saved to {output_path}")
    return output_path

def main():
    print("Generating a new MultiversX wallet...")
    wallet_data = generate_wallet()
    
    print("\nWallet Information:")
    print(f"Address: {wallet_data['address']}")
    print(f"Private Key: {wallet_data['private_key']}")
    print(f"Mnemonic Phrase: {wallet_data['mnemonic']}")
    
    save_path = save_wallet_to_file(wallet_data)
    
    print("\nIMPORTANT: Keep your private key and mnemonic phrase secure!")
    print("Anyone with access to these can control your wallet and funds.")

if __name__ == "__main__":
    main() 