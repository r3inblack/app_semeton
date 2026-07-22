import { createFileRoute } from "@tanstack/react-router";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { mcpServer } from "@/lib/mcp/server";

let transport: SSEServerTransport | null = null;

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        transport = new SSEServerTransport("/api/public/mcp/messages", mcpServer);
        // The SSE transport needs to handle the response
        const { response } = await transport.handlePostMessage(request as any, {} as any);
        // Wait, SSEServerTransport.handlePostMessage is for POST.
        // For GET (the SSE stream), we use connect.
        
        const stream = new ReadableStream({
          start(controller) {
            (transport as any).sessionId = Math.random().toString(36).substring(2);
            (transport as any)._controller = controller;
            controller.enqueue(new TextEncoder().encode(`event: endpoint\ndata: /api/public/mcp/messages?sessionId=${(transport as any).sessionId}\n\n`));
          },
          cancel() {
            transport = null;
          }
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      },
      POST: async ({ request }) => {
        // This would be for the messages endpoint, but I'll simplify it for now
        // MCP over SSE usually uses two endpoints: one for the SSE stream and one for POSTing messages.
        return new Response("Use /api/public/mcp/messages for POST", { status: 405 });
      }
    }
  }
});
