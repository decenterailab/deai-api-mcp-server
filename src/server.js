#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const API_BASE_URL = "https://api.decenterai.dev";

const EthereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format");

class DeAIApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = API_BASE_URL;
  }

  async makeRequest(endpoint, method = "GET") {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          "X-API-Key": this.apiKey,
          "User-Agent": "DeAI-MCP-Server/1.0.0",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `API Error (${response.status}): ${errorData.message || errorData.error || "Unknown error"}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new McpError(ErrorCode.InternalError, "Request timeout: API took too long to respond");
      }
      
      throw new McpError(ErrorCode.InternalError, `Request error: ${error.message}`);
    }
  }

  async getTokenInfo(contractAddress) {
    return this.makeRequest(`/api/token/token-info/${contractAddress}`);
  }

  async getTopHolders(contractAddress) {
    return this.makeRequest(`/api/token/top-holders/${contractAddress}`);
  }

  async getTokenHolderBalanceChanges(contractAddress) {
    return this.makeRequest(`/api/token/token-holder-balance-changes/${contractAddress}`);
  }

  async getPortfolio(walletAddress) {
    return this.makeRequest(`/api/token/portfolio/${walletAddress}`);
  }


}

const server = new Server(
  {
    name: "deai-api-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const TOOLS = [
  {
    name: "get_token_info",
    description: "Get detailed information about a specific token including name, symbol, decimals, logo, and fees",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: {
          type: "string",
          description: "Ethereum contract address (0x...)",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
      },
      required: ["contractAddress"],
    },
  },
  {
    name: "get_top_holders",
    description: "Get the holders of a specific token with their balances and percentages",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: {
          type: "string",
          description: "Ethereum contract address (0x...)",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
      },
      required: ["contractAddress"],
    },
  },
  {
    name: "get_token_holder_balance_changes",
    description: "Track balance changes for token holders over the last 7 days",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: {
          type: "string",
          description: "Ethereum contract address (0x...)",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
      },
      required: ["contractAddress"],
    },
  },
  {
    name: "get_portfolio",
    description: "Get comprehensive portfolio data for a wallet address including total value, changes, and token balances",
    inputSchema: {
      type: "object",
      properties: {
        walletAddress: {
          type: "string",
          description: "Ethereum wallet address (0x...)",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
      },
      required: ["walletAddress"],
    },
  },

];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "API_KEY environment variable is required. Set it with your DeAI API key."
    );
  }

  const client = new DeAIApiClient(apiKey);

  try {
    switch (name) {
      case "get_token_info": {
        const contractAddress = EthereumAddressSchema.parse(args.contractAddress);
        const result = await client.getTokenInfo(contractAddress);
        
        return {
          content: [
            {
              type: "text",
              text: `Token Information for ${contractAddress}:

**${result.name || "Unknown"} (${result.symbol || "Unknown"})**
• Address: ${result.address || contractAddress}
• Decimals: ${result.decimals || "Unknown"}
• Logo: ${result.logoUrl || "Not available"}
• Buy Fee: ${result.buyFee !== null && result.buyFee !== undefined ? result.buyFee + "%" : "Not available"}
• Sell Fee: ${result.sellFee !== null && result.sellFee !== undefined ? result.sellFee + "%" : "Not available"}`,
            },
          ],
        };
      }

      case "get_top_holders": {
        const contractAddress = EthereumAddressSchema.parse(args.contractAddress);
        const result = await client.getTopHolders(contractAddress);
        
        if (!result || !Array.isArray(result.holders)) {
          throw new McpError(ErrorCode.InternalError, "Invalid response format from API");
        }
        
        const holdersList = result.holders
          .slice(0, 10) 
          .map((holder, index) => 
            `${index + 1}. ${holder.address || "Unknown"}${holder.label ? ` (${holder.label})` : ""}\n   Balance: ${holder.balance || "N/A"} (${holder.percentage || "N/A"}%)`
          )
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Top Holders for ${result.tokenName || "Unknown"} (${result.tokenSymbol || "Unknown"}):

**Token Statistics:**
• Total Supply: ${result.totalSupply || "N/A"}
• Total Holders: ${result.holdersCount ? result.holdersCount.toLocaleString() : "N/A"}

**Top 10 Holders:**
${holdersList}`,
            },
          ],
        };
      }

      case "get_token_holder_balance_changes": {
        const contractAddress = EthereumAddressSchema.parse(args.contractAddress);
        const result = await client.getTokenHolderBalanceChanges(contractAddress);
        
  
        if (!result || !Array.isArray(result.tokenHolderBalanceChanges)) {
          throw new McpError(ErrorCode.InternalError, "Invalid response format from API");
        }
        
        const changesList = result.tokenHolderBalanceChanges
          .slice(0, 10)
          .map((change, index) => {
            const changeAmount = (change.change && change.change > 0) ? `+${change.change.toLocaleString()}` : (change.change || 0).toLocaleString();
            const changePercent = (change.change && change.balanceStart) ? ((change.change / change.balanceStart) * 100).toFixed(2) : "0.00";
            return `${index + 1}. ${change.address || "Unknown"}${change.label ? ` (${change.label})` : ""}
   Change: ${changeAmount} (${changePercent}%)
   Start: ${change.balanceStart ? change.balanceStart.toLocaleString() : "N/A"} → End: ${change.balanceEnd ? change.balanceEnd.toLocaleString() : "N/A"}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Token Holders Balance Changes (Last 7 Days):
**Token:** ${result.tokenAddress || "Unknown"}

**Top 10 Balance Changes:**
${changesList}`,
            },
          ],
        };
      }

      case "get_portfolio": {
        const walletAddress = EthereumAddressSchema.parse(args.walletAddress);
        const result = await client.getPortfolio(walletAddress);
        

        if (!result || !Array.isArray(result.tokenBalances)) {
          throw new McpError(ErrorCode.InternalError, "Invalid response format from API");
        }
        
        const totalValue = result.totalPortfolioValue?.toLocaleString() || "N/A";
        const totalChange = result.totalPortfolioValueChange?.toLocaleString() || "N/A";
        const totalChangePercent = result.totalPortfolioValueChangePercentage?.toFixed(2) || "N/A";
        
        const tokenList = result.tokenBalances
          .slice(0, 10) 
          .sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0))
          .map((token, index) => {
            const value = token.valueUSD ? `$${token.valueUSD.toLocaleString()}` : "N/A";
            const tokenName = token.token?.name || "Unknown";
            const tokenSymbol = token.token?.symbol || "Unknown";
            const amount = token.amount ? token.amount.toLocaleString() : "N/A";
            return `${index + 1}. ${tokenName} (${tokenSymbol})
   Amount: ${amount}
   Value: ${value}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Portfolio Summary for ${walletAddress}:

**Overall Portfolio:**
• Total Value: $${totalValue}
• 24h Change: $${totalChange} (${totalChangePercent}%)

**Top 10 Token Holdings:**
${tokenList}`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool "${name}" not found`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.errors.map(e => e.message).join(", ")}`);
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(ErrorCode.InternalError, `Unexpected error: ${error.message}`);
  }
});


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server failed to start:", error);
    process.exit(1);
  });
} 