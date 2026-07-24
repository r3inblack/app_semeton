import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Payload = {
  mode: "transaction" | "pricing";
  key: string;
  vars?: Record<string, any>;
  fallback?: string;
};

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function render(template: string, vars: Record<string, any>) {
  const derived: Record<string, any> = { ...vars };
  if (derived.note_line === undefined) {
    derived.note_line = derived.note ? `Catatan: ${derived.note}` : "";
  }
  let out = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = derived[k];
    return v === undefined || v === null ? "" : String(v);
  });
  return out.replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n").replace(/^\s+|\s+$/g, "");
}

async function tgSend(botToken: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.warn("tg send failed", e);
  }
}

export const sendTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d as Payload)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: s } = await supabaseAdmin
      .from("app_settings")
      .select(
        "telegram_enabled, telegram_bot_token, telegram_chat_id, telegram_group_bot_token, telegram_group_chat_id",
      )
      .eq("id", 1)
      .maybeSingle();
    if (!s?.telegram_enabled) return { ok: false, reason: "disabled" };

    // Resolve acting user (username + role) for audit trail
    let actor = "-";
    let actorRole = "";
    try {
      const uid = (context as any)?.userId;
      if (uid) {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("username, role")
          .eq("id", uid)
          .maybeSingle();
        if (prof) {
          actor = (prof as any).username || "-";
          actorRole = (prof as any).role || "";
        }
      }
    } catch {}
    const vars = { ...(data.vars ?? {}), actor, actor_role: actorRole };
    const tplText = (tpl: string) => render(tpl, vars);

    let text = data.fallback ?? "";
    const { data: tplRow } = await supabaseAdmin
      .from("telegram_templates" as any)
      .select("template, enabled")
      .eq("key", data.key)
      .maybeSingle();
    const tplRaw = (tplRow as any)?.template ?? "";
    if (tplRow) {
      if (!(tplRow as any).enabled) return { ok: false, reason: "tpl_off" };
      text = tplText(tplRaw);
    } else if (text) {
      text = render(text, vars);
    }
    if (!text) return { ok: false, reason: "empty" };

    // Append actor line if template didn't reference {{actor}}
    if (!/\{\{\s*actor\s*\}\}/.test(tplRaw)) {
      text = `${text}\n\n👤 <b>Oleh:</b> ${actor}${actorRole ? ` (${actorRole})` : ""}`;
    }

    if (data.mode === "transaction") {
      const token = (s as any).telegram_group_bot_token || s.telegram_bot_token;
      const chatId = (s as any).telegram_group_chat_id;
      if (!token || !chatId) return { ok: false, reason: "no_group" };
      const { data: bal } = await supabaseAdmin
        .from("cash_balance")
        .select("amount")
        .eq("id", 1)
        .maybeSingle();
      const suffix =
        bal != null
          ? `\n\n💵 <b>Sisa Saldo Kas:</b> ${fmtIDR(Number((bal as any).amount ?? 0))}`
          : "";
      await tgSend(String(token), String(chatId).trim(), `${text}${suffix}`);
      return { ok: true };
    }

    // pricing → owners
    const token = s.telegram_bot_token;
    if (!token) return { ok: false, reason: "no_bot" };
    const { data: recips } = await supabaseAdmin
      .from("telegram_recipients" as any)
      .select("chat_id, notify_enabled");
    const ids = new Set<string>();
    for (const r of (recips ?? []) as any[]) {
      if (r.notify_enabled && r.chat_id) ids.add(String(r.chat_id).trim());
    }
    if (s.telegram_chat_id) ids.add(String(s.telegram_chat_id).trim());
    if (ids.size === 0) return { ok: false, reason: "no_recipients" };
    await Promise.all([...ids].map((id) => tgSend(String(token), id, text)));
    return { ok: true };
  });
