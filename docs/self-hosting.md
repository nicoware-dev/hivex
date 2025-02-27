# 🏠 Self-Hosting

HiveX is built to be fully self-hosted, giving you complete control over your data and operations. Follow this guide to set up and run your own instance of HiveX on your server or local machine. For a quick overview of what you'll be running, check out our [System Overview](./system-overview.md) or see our [Features](./features.md) list.

## Prerequisites

- **Server/Cloud Instance or Local Machine:** (e.g., AWS, DigitalOcean, or your own PC)
- **Node.js:** Version 23+ installed
- **Git:** To clone the repository
- **pnpm:** Install globally with `npm install -g pnpm`
- **Basic Knowledge:** Familiarity with TypeScript/Node.js is recommended
- **API Keys:** For MultiversX operations (e.g., EVM_PRIVATE_KEY, OPENAI_API_KEY, etc.)

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/PLACEHOLDER/hivex
cd hivex/eliza
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```
# API Keys
OPENAI_API_KEY=your_openai_api_key
MULTIVERSX_API_KEY=your_multiversx_api_key

# Blockchain Configuration
EVM_PRIVATE_KEY=your_private_key
MULTIVERSX_NETWORK=devnet  # or mainnet, testnet

# Optional Services
COINGECKO_API_KEY=your_coingecko_api_key
DEFILLAMA_API_KEY=your_defillama_api_key

# Web Interface
CLIENT_URL=http://localhost:3000
```

### 4. Build the Project
```bash
pnpm build
```

### 5. Start the Server
```bash
pnpm start
```

### 6. Set Up the Web Client (Optional)
In a new terminal:
```bash
cd ../client
pnpm install
pnpm run dev
```

Your web client will be available at a local URL (usually `http://localhost:3000`) or your server's address.

## Support & Maintenance

### Community Support
Need help? Join our [Discord](https://discord.gg/PLACEHOLDER) for real-time assistance and community discussions.

### Regular Updates
Keep your instance up to date:
- Regularly pull updates from the repository
- Check for new features and improvements
- Apply security updates when available

### Documentation
For troubleshooting and advanced configuration:
- Review our technical documentation
- Check the [plugin documentation](plugin.md)
- Explore our [development guides](./quick-start.md)

Enjoy full control over your HiveX instance and make the most of a self-hosted, AI-powered DeFi experience on MultiversX! 🚀