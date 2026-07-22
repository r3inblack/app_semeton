import { createFileRoute } from "@tanstack/react-router";
import { mcpServer } from "@/lib/mcp/server";
import { JSONRPCResponse } from "@modelcontextprotocol/sdk/types.js";

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = request.headers.get("x-api-key");
          if (!apiKey || apiKey !== process.env.MCP_SECRET_KEY) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { 
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          const body = await request.json();
          // Manually handle the JSON-RPC request using the server's internal handlers
          // This is a simplified integration for edge functions where stdio/sse transports are harder to setup
          const result = await (mcpServer as any).handleRequest(body);
          
          return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ 
            jsonrpc: "2.0",
            error: { code: -32603, message: error.message },
            id: null 
          }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }
  }
});
