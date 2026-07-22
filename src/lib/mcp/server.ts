import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { supabase } from "@/integrations/supabase/client";

const server = new Server(
  {
    name: "semeton-app-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_cash_balance",
        description: "Get the current cash balance of the application",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_stock_levels",
        description: "Get stock levels for products",
        inputSchema: {
          type: "object",
          properties: {
            product_name: { type: "string", description: "Optional product name to filter" },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_cash_balance") {
      const { data, error } = await supabase.from("cash_balance").select("amount").eq("id", 1).single();
      if (error) throw error;
      return {
        content: [{ type: "text", text: `Current cash balance: Rp ${data.amount.toLocaleString('id-ID')}` }],
      };
    }

    if (name === "get_stock_levels") {
      let query = supabase.from("stock_levels").select("qty, products(name), warehouses(name)");
      if (args?.product_name) {
        // This is a simplified lookup for the example
        query = query.ilike("products.name", `%${args.product_name}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      const stockList = data.map((s: any) => `${s.products.name} at ${s.warehouses.name}: ${s.qty}`).join("\n");
      return {
        content: [{ type: "text", text: stockList || "No stock found." }],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

export async function runMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Semeton MCP Server running on stdio");
}
