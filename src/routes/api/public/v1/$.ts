import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function hashKey(k: string) {
  return createHash("sha256").update(k).digest("hex");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

async function authKey(req: Request, needed: string) {
  const raw =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!raw) return { error: json({ error: "missing api key" }, 401) };
  const sb = admin();
  const { data: k } = await sb
    .from("api_keys")
    .select("id, permissions, is_active, created_by")
    .eq("key_hash", hashKey(raw))
    .maybeSingle();
  if (!k || !k.is_active) return { error: json({ error: "invalid api key" }, 401) };
  const perms = (k.permissions ?? []) as string[];
  if (!perms.includes("*") && !perms.includes(needed))
    return { error: json({ error: `missing permission: ${needed}` }, 403) };
  await sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);
  return { sb, key: k };
}

async function logCall(
  sb: ReturnType<typeof admin>,
  keyId: string | null,
  req: Request,
  endpoint: string,
  status: number,
  reqBody: unknown,
  resBody: unknown,
) {
  await sb.from("api_request_logs").insert({
    api_key_id: keyId,
    endpoint,
    method: req.method,
    status,
    ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
    request: reqBody ?? null,
    response: resBody ?? null,
  });
}

async function resolveMaster(sb: ReturnType<typeof admin>): Promise<string | null> {
  const { data } = await sb.from("profiles").select("id").eq("is_master", true).limit(1).maybeSingle();
  return (data?.id as string) ?? null;
}

// Lookup by id OR name (case-insensitive) OR phone (for customers/suppliers/employees)
async function lookupEntity(
  sb: ReturnType<typeof admin>,
  table: "customers" | "suppliers" | "employees" | "products" | "warehouses",
  ref: string,
) {
  if (!ref) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
  if (isUuid) {
    const { data } = await sb.from(table).select("*").eq("id", ref).maybeSingle();
    if (data) return data;
  }
  const { data } = await sb.from(table).select("*").ilike("name", ref).limit(1).maybeSingle();
  if (data) return data;
  if (table === "customers" || table === "suppliers" || table === "employees") {
    const { data: byPhone } = await sb.from(table).select("*").eq("phone", ref).limit(1).maybeSingle();
    if (byPhone) return byPhone;
  }
  return null;
}

export const Route = createFileRoute("/api/public/v1/$")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          },
        }),

      GET: async ({ request, params }) => {
        const path = (params as any)._splat as string;
        // Public root: return manifest w/o auth (helps n8n discovery)
        if (!path || path === "" || path === "ping") {
          return json({ ok: true, name: "Semeton API v1", ts: new Date().toISOString() });
        }
        const auth = await authKey(request, "read");
        if ("error" in auth) return auth.error;
        const { sb } = auth;
        try {
          if (path === "customers") {
            const { data } = await sb.from("customers").select("id, name, phone, address, plafond").order("name");
            return json({ data });
          }
          if (path === "suppliers") {
            const { data } = await sb.from("suppliers").select("id, name, phone, address").order("name");
            return json({ data });
          }
          if (path === "products") {
            const { data } = await sb.from("products").select("id, name, sku, unit, buy_price, sell_price").order("name");
            return json({ data });
          }
          if (path === "warehouses") {
            const { data } = await sb.from("warehouses").select("id, name, address").order("name");
            return json({ data });
          }
          if (path === "employees") {
            const { data } = await sb.from("employees").select("id, name, phone, category, warehouse_id").order("name");
            return json({ data });
          }
          if (path === "balances") {
            const [cash, cust, sup, sal] = await Promise.all([
              sb.from("cash_balance").select("amount").eq("id", 1).maybeSingle(),
              sb.from("customer_balances").select("customer_id, receivable"),
              sb.from("supplier_balances").select("supplier_id, payable"),
              sb.from("employee_salary_balances").select("employee_id, balance"),
            ]);
            return json({
              cash: cash.data?.amount ?? 0,
              customers: cust.data ?? [],
              suppliers: sup.data ?? [],
              employees: sal.data ?? [],
            });
          }
          if (path === "logs") {
            const { data } = await sb
              .from("api_request_logs")
              .select("id, endpoint, method, status, created_at")
              .order("created_at", { ascending: false })
              .limit(50);
            return json({ data });
          }
          return json({ error: "unknown endpoint" }, 404);
        } catch (e: any) {
          return json({ error: e.message }, 500);
        }
      },

      POST: async ({ request, params }) => {
        const path = (params as any)._splat as string;
        const permMap: Record<string, string> = {
          "customer-payment": "customer_payment",
          "supplier-payment": "supplier_payment",
          expense: "expense",
          sale: "sale",
          "stock-in": "stock_in",
          "salary-payment": "salary_payment",
          "salary-advance": "salary_advance",
        };
        const needed = permMap[path];
        if (!needed) return json({ error: "unknown endpoint" }, 404);
        const auth = await authKey(request, needed);
        if ("error" in auth) return auth.error;
        const { sb, key } = auth;

        let body: any = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid json body" }, 400);
        }

        const actor = key.created_by || (await resolveMaster(sb));
        if (!actor) {
          await logCall(sb, key.id, request, path, 500, body, { error: "no actor" });
          return json({ error: "no actor user found" }, 500);
        }

        try {
          let result: any = null;

          if (path === "customer-payment") {
            const cust = await lookupEntity(sb, "customers", String(body.customer || body.customer_id || ""));
            if (!cust) throw new Error("customer tidak ditemukan (kirim customer=uuid/nama/hp)");
            const amt = Number(body.amount);
            if (!(amt > 0)) throw new Error("amount harus > 0");
            const { data, error } = await sb.rpc("api_record_customer_payment", {
              _actor: actor,
              _customer: cust.id,
              _amount: amt,
              _note: body.note ?? null,
            });
            if (error) throw error;
            result = { id: data, customer: cust.name };
          } else if (path === "supplier-payment") {
            const sup = await lookupEntity(sb, "suppliers", String(body.supplier || body.supplier_id || ""));
            if (!sup) throw new Error("supplier tidak ditemukan");
            const amt = Number(body.amount);
            if (!(amt > 0)) throw new Error("amount harus > 0");
            const { data, error } = await sb.rpc("api_record_supplier_payment", {
              _actor: actor,
              _supplier: sup.id,
              _amount: amt,
              _note: body.note ?? null,
            });
            if (error) throw error;
            result = { id: data, supplier: sup.name };
          } else if (path === "expense") {
            const amt = Number(body.amount);
            if (!(amt > 0)) throw new Error("amount harus > 0");
            if (!body.category) throw new Error("category wajib");
            const { data, error } = await sb.rpc("api_record_expense", {
              _actor: actor,
              _category: String(body.category),
              _amount: amt,
              _note: body.note ?? null,
            });
            if (error) throw error;
            result = { id: data };
          } else if (path === "salary-payment" || path === "salary-advance") {
            const emp = await lookupEntity(sb, "employees", String(body.employee || body.employee_id || ""));
            if (!emp) throw new Error("employee tidak ditemukan");
            const amt = Number(body.amount);
            if (!(amt > 0)) throw new Error("amount harus > 0");
            const rpc = path === "salary-payment" ? "api_record_salary_payment" : "api_record_salary_advance";
            const { data, error } = await sb.rpc(rpc, {
              _actor: actor,
              _employee: emp.id,
              _amount: amt,
              _note: body.note ?? null,
            });
            if (error) throw error;
            result = { id: data, employee: emp.name };
          } else if (path === "stock-in") {
            const sup = await lookupEntity(sb, "suppliers", String(body.supplier || body.supplier_id || ""));
            const wh = await lookupEntity(sb, "warehouses", String(body.warehouse || body.warehouse_id || ""));
            const prod = await lookupEntity(sb, "products", String(body.product || body.product_id || ""));
            if (!sup) throw new Error("supplier tidak ditemukan");
            if (!wh) throw new Error("warehouse tidak ditemukan");
            if (!prod) throw new Error("product tidak ditemukan");
            const qty = Number(body.qty);
            const unit_price = Number(body.unit_price ?? prod.buy_price);
            if (!(qty > 0) || !(unit_price > 0)) throw new Error("qty & unit_price harus > 0");
            const { data, error } = await sb.rpc("api_record_stock_in", {
              _actor: actor,
              _supplier: sup.id,
              _warehouse: wh.id,
              _product: prod.id,
              _qty: qty,
              _unit_price: unit_price,
              _note: body.note ?? null,
            });
            if (error) throw error;
            result = { id: data, product: prod.name, warehouse: wh.name };
          } else if (path === "sale") {
            const cust = await lookupEntity(sb, "customers", String(body.customer || body.customer_id || ""));
            const wh = await lookupEntity(sb, "warehouses", String(body.warehouse || body.warehouse_id || ""));
            const prod = await lookupEntity(sb, "products", String(body.product || body.product_id || ""));
            if (!cust || !wh || !prod) throw new Error("customer/warehouse/product tidak ditemukan");
            const qty = Number(body.qty);
            const unit_price = Number(body.unit_price ?? prod.sell_price);
            if (!(qty > 0) || !(unit_price > 0)) throw new Error("qty & unit_price harus > 0");
            const { data, error } = await sb.rpc("api_record_sale", {
              _actor: actor,
              _customer: cust.id,
              _warehouse: wh.id,
              _product: prod.id,
              _qty: qty,
              _unit_price: unit_price,
              _note: body.note ?? null,
            });
            if (error) throw error;
            result = { id: data, customer: cust.name, product: prod.name };
          }

          const res = { ok: true, ...result };
          await logCall(sb, key.id, request, path, 200, body, res);
          return json(res);
        } catch (e: any) {
          const res = { ok: false, error: e.message };
          await logCall(sb, key.id, request, path, 400, body, res);
          return json(res, 400);
        }
      },
    },
  },
});
