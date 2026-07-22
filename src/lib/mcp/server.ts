import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

// Use admin client for MCP to bypass RLS as it's an "agent" interface
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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
      {
        name: "get_receivables",
        description: "Get list of customer receivables (piutang)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_cash_balance") {
      const { data, error } = await supabaseAdmin.from("cash_balance").select("amount").eq("id", 1).single();
      if (error) throw error;
      return {
        content: [{ type: "text", text: `Current cash balance: Rp ${data.amount.toLocaleString('id-ID')}` }],
      };
    }

    if (name === "get_stock_levels") {
      let query = supabaseAdmin.from("stock_levels").select("qty, products(name), warehouses(name)");
      if (args?.product_name) {
        // Since we can't easily join and filter in one go with ilike on a nested field in a simple way without more complexity,
        // we'll just fetch and filter for this example.
        const { data: allStock, error } = await query;
        if (error) throw error;
        const filtered = allStock.filter((s: any) => s.products.name.toLowerCase().includes(String(args.product_name).toLowerCase()));
        const stockList = filtered.map((s: any) => `${s.products.name} at ${s.warehouses.name}: ${s.qty}`).join("\n");
        return {
          content: [{ type: "text", text: stockList || "No stock found for this product." }],
        };
      }
      const { data, error } = await query;
      if (error) throw error;
      const stockList = data.map((s: any) => `${s.products.name} at ${s.warehouses.name}: ${s.qty}`).join("\n");
      return {
        content: [{ type: "text", text: stockList || "No stock found." }],
      };
    }

    if (name === "get_receivables") {
      const { data, error } = await supabaseAdmin.from("customer_balances").select("receivable, customers(name)").gt("receivable", 0);
      if (error) throw error;
      const list = data.map((c: any) => `${c.customers.name}: Rp ${c.receivable.toLocaleString('id-ID')}`).join("\n");
      return {
        content: [{ type: "text", text: list || "No receivables." }],
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

export async function runMcpServerStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export const mcpServer = server;

