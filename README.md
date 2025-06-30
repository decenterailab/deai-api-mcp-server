# DeAI API MCP Server

A Model Context Protocol (MCP) server that provides tools to interact with the DeAI API for token analysis, holder tracking, and wallet portfolio analytics on Ethereum.

## Features

The MCP server exposes the following tools for analytics (Currently supports ETH):

- **`get_token_info`** - Get detailed token information including name, symbol, decimals, logo, and token tax
- **`get_top_holders`** - Analyze the holders of any token with their balances and percentages  
- **`get_token_holder_balance_changes`** - Track balance changes for token holders over the last 7 days
- **`get_portfolio`** - Get comprehensive portfolio data for any wallet including total value, changes, and token holdings

## Quick Start

### Prerequisites

- **Node.js 18+** 
- **DeAI API key** - Get one at [https://t.me/DeCenterAIDev](https://t.me/DeCenterAIDev)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/decenterailab/deai-api-mcp-server.git
   cd deai-api-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set your API key:**
   ```bash
   export API_KEY="your_api_key_here"
   ```

4. **Test the server:**
   ```bash
   npm test
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

- **`API_KEY`** (required) - Your API key

### Claude Desktop Integration

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "deai-api": {
      "command": "node",
      "args": ["/your_path/deai-api-mcp-server/src/server.js"],
      "env": {
        "API_KEY": "your_api_key"
      }
    }
  }
}
```

## Basic Usage Examples

### Token Analysis
```
Get token information for 0x5FC111f3Fa4C6b32eAf65659CFEbdeed57234069
```

### Holder Analysis  
```
Show me the top holders of token 0x5FC111f3Fa4C6b32eAf65659CFEbdeed57234069
```

### Balance Tracking
```
Get balance changes for token holders of 0x5FC111f3Fa4C6b32eAf65659CFEbdeed57234069 over the last 7 days
```

### Portfolio Analysis
```
Get portfolio data for wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

## 🛠️ Development

### Project Structure

```
deai-api-mcp-server/
├── src/
│   └── server.js          # Main MCP server implementation
├── package.json           # Dependencies and scripts
├── example.env           # Environment template
└── README.md             # This file
```

## Security

- API keys are passed via env variables
- No sensitive data is logged or stored
- Network requests use built-in fetch with timeout protection
- Input validation using Zod schemas

## API Reference

### Supported Endpoints

- **Token Info**: `/api/token/token-info/{contractAddress}`
- **Top Holders**: `/api/token/top-holders/{contractAddress}`
- **Balance Changes**: `/api/token/token-holder-balance-changes/{contractAddress}`
- **Portfolio**: `/api/token/portfolio/{walletAddress}`

### Supported Networks

- **Ethereum Mainnet** (primary)

### Rate Limits

Rate limits depend on your API key tier:
- **Standard**: 2 requests/second, 10,000 credits
- **Pro**: 5 requests/second, 50,000 credits  
- **Enterprise**: custom credits

## Troubleshooting

### Common Issues

**1. "API_KEY environment variable is required"**
```bash
export API_KEY="your_api_key"
```

**2. "Network error: Unable to reach DeAI API"**
- Check your internet connection
- Verify the API endpoint is accessible
- Ensure API key is valid

**3. "API Error (401): Unauthorized"**
- Verify your API key is correct
- Check if your API key has expired
- Ensure sufficient credits remain

**4. Claude Desktop not finding the server**
- Use absolute paths in configuration
- Ensure the working directory is set correctly
- Restart Claude Desktop after config changes
