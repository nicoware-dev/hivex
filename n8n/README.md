# N8N Workflows for Eliza Agents

This directory contains N8N workflow configurations for all Eliza agents coordination using an n8n based coordinator agent. Each workflow is designed to be imported into N8N and connected to the Coordinator Agent.

## Available Workflows

- `coordinator-agent.json` - Main coordinator workflow
- `eliza-agent-tool.json` - Eliza agent tool workflow

## Usage

1. Import the desired workflow JSON file into your N8N instance
2. Configure the required credentials (OpenAI API key, etc.)
3. Update the HTTP Request node with your Eliza agent's API endpoint
4. Add the workflow as a tool in the coordinator workflow

## Configuration

Each workflow follows the same basic structure:

- HTTP Endpoint for receiving requests
- Message processing logic
- Response formatting
- Error handling

The only configuration needed is updating the API endpoint URL in the HTTP Request node to point to your specific agent's API endpoint. 

## MultiversX Integration

These workflows are designed to work with the HiveX platform for MultiversX blockchain. The coordinator agent will route requests to the appropriate specialized agents based on the user's query, allowing for seamless interaction with MultiversX DeFi operations.

## Extending the System

To add new agent tools:

1. Duplicate the `eliza-agent-tool.json` workflow
2. Update the HTTP Request node with the new agent's endpoint
3. Configure any agent-specific parameters
4. Add the new tool to the coordinator agent's tools list

For more information on the coordinator system, see the [COORDINATOR_SYSTEM.md](./COORDINATOR_SYSTEM.md) file. 
