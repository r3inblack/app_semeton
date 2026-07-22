import { createFileRoute } from "@tanstack/react-router";
import { mcpServer } from "@/lib/mcp/server";
import { createHash } from "crypto";

function hashKey(k: string) {
  return createHash("sha256").update(k).digest("hex");
}

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("x-api-key") || 
                            request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          
          if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing API Key" }), { 
              status: 401, headers: { "Content-Type": "application/json" } 
            });
          }

          // Use the internal admin client logic to verify the key
          const { createClient } = await import("@supabase/supabase-js");
          const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
          
          const { data: k } = await sb
            .from("api_keys")
            .select("id, permissions, is_active")
            .eq("key_hash", hashKey(authHeader))
            .maybeSingle();

          if (!k || !k.is_active || !(k.permissions as string[]).includes("mcp")) {
            return new Response(JSON.stringify({ error: "Invalid or unauthorized API Key" }), { 
              status: 403, headers: { "Content-Type": "application/json" } 
            });
          }

          const body = await request.json();
          // handleRequest is the standard way to process JSON-RPC in MCP SDK
          const result = await (mcpServer as any).handleRequest(body);
          
          // Log the usage
          await sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);
          await sb.from("api_request_logs").insert({
            api_key_id: k.id,
            endpoint: "mcp",
            method: "POST",
            status: 200,
            ip: request.headers.get("x-forwarded-for") || null,
          });

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
