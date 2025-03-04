# Quick Start Guide

Ready to dive into HiveX? Awesome! Whether you're here to tinker with the code, build something cool, or just explore what our AI-powered DeFi platform can do, we'll get you up and running in no time.

## Before We Start

You'll need a few things installed:
- **Node.js** (version 23 or newer)
- **pnpm** (our package manager of choice)
  ```bash
  npm install -g pnpm
  ```
- **Git** (for grabbing the code)
- **Some coding know-how** (mainly TypeScript/Node.js basics)

## Let's Get Started!

### 1. Grab the Code
First, let's clone the repo and hop into the right folder:
```bash
git clone https://github.com/nicoware-dev/hivex.git
cd hivex
```

### 2. Set Up Your Environment
Create a `.env` file in the root directory with your API keys and configuration:
```bash
cp .env.example .env
```
Then open `.env` in your favorite editor and add your details:
```
OPENAI_API_KEY=your_openai_key_here
MULTIVERSX_API_KEY=your_multiversx_api_key_here
EVM_PRIVATE_KEY=your_private_key_here
```

### 3. Install Dependencies
Let's get everything installed:
```bash
pnpm install
```

### 4. Build the Project
Now let's build the code:
```bash
cd eliza
pnpm build
```

### 5. Start the Server
Fire up the server:
```bash
pnpm start
```

### 6. Launch the Web Interface
In a new terminal window:
```bash
cd client
pnpm run dev
```

You'll find your shiny new web interface at `http://localhost:3000` (unless your computer says otherwise).

## What's Next?

### Explore the Code
Take a peek around the `eliza` directory – that's where all the magic happens. Check out our [System Overview](./system-overview.md) to understand the architecture, or dive into our [Multi-Agent System](./multi-agent-system.md) to see how it all works together.

### Check Out the Docs
Got questions? Our docs folder is packed with helpful info and tips.

### Join the Fun
Need a hand or want to chat? Jump into our [Discord](https://discord.gg/bTRhbRFbzc) – we're a friendly bunch!

That's it! You're all set to start your HiveX journey. Happy building! 🚀
