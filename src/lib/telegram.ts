import { supabase } from "@/integrations/supabase/client";

async function loadSettings() {
  const { data } = await supabase
    .from("app_settings")
    .select(
      "telegram_enabled, telegram_bot_token, telegram_chat_id, telegram_group_bot_token, telegram_group_chat_id",
    )
    .eq("id", 1)
    .maybeSingle();
  return data ?? null;
}

async function tgSend(botToken: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.warn("Telegram send failed", e);
  }
}

async function getCashBalance(): Promise<number | null> {
  try {
    const { data } = await supabase.from("cash_balance").select("amount").eq("id", 1).maybeSingle();
    return data ? Number((data as any).amount ?? 0) : null;
  } catch {
    return null;
  }
}

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// ---------------- Templates ----------------

type TemplateRow = { key: string; template: string; enabled: boolean };
let templateCache: Map<string, TemplateRow> | null = null;
let templateCacheAt = 0;
const TEMPLATE_TTL_MS = 30_000;

async function loadTemplates(force = false): Promise<Map<string, TemplateRow>> {
  const now = Date.now();
  if (!force && templateCache && now - templateCacheAt < TEMPLATE_TTL_MS) return templateCache;
  try {
    const { data } = await supabase
      .from("telegram_templates" as any)
      .select("key, template, enabled");
    const map = new Map<string, TemplateRow>();
    for (const r of (data ?? []) as any[]) map.set(r.key, r);
    templateCache = map;
    templateCacheAt = now;
    return map;
  } catch {
    return templateCache ?? new Map();
  }
}

export function invalidateTelegramTemplateCache() {
  templateCache = null;
  templateCacheAt = 0;
}

function renderTemplate(template: string, vars: Record<string, any>): string {
  // Derive note_line automatically when the note variable is provided.
  const derived: Record<string, any> = { ...vars };
  if (derived.note_line === undefined) {
    derived.note_line = derived.note ? `Catatan: ${derived.note}` : "";
  }
  let out = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = derived[k];
    return v === undefined || v === null ? "" : String(v);
  });
  // Collapse blank lines left by empty variables.
  out = out.replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n").replace(/^\s+|\s+$/g, "");
  return out;
}

async function buildMessage(
  key: string,
  vars: Record<string, any>,
  fallback: string,
): Promise<{ text: string; enabled: boolean }> {
  const tpl = (await loadTemplates()).get(key);
  if (!tpl) return { text: fallback, enabled: true };
  if (!tpl.enabled) return { text: "", enabled: false };
  return { text: renderTemplate(tpl.template, vars), enabled: true };
}

// ---------------- Public API ----------------

/**
 * Notifikasi transaksi (setoran, bayar supplier, pengeluaran, dsb).
 * Dikirim ke grup Telegram. Selalu menambahkan Sisa Saldo Kas di akhir.
 *
 * Baru: template dapat dikustomisasi via tabel `telegram_templates`.
 * Legacy: bila `vars`/`fallback` tidak diberikan, `keyOrMessage` dianggap
 * sebagai teks pesan siap-kirim (kompatibilitas mundur).
 */
export async function sendTransactionNotification(
  keyOrMessage: string,
  vars?: Record<string, any>,
  fallback?: string,
) {
  try {
    const s = await loadSettings();
    if (!s?.telegram_enabled) return;
    const token = (s as any).telegram_group_bot_token || s.telegram_bot_token;
    const chatId = (s as any).telegram_group_chat_id;
    if (!token || !chatId) return;

    let text: string;
    if (vars === undefined) {
      // Legacy path – already a fully formatted message.
      text = keyOrMessage;
    } else {
      const built = await buildMessage(keyOrMessage, vars, fallback ?? "");
      if (!built.enabled || !built.text) return;
      text = built.text;
    }

    const bal = await getCashBalance();
    const suffix = bal !== null ? `\n\n💵 <b>Sisa Saldo Kas:</b> ${fmtIDR(bal)}` : "";
    await tgSend(String(token), String(chatId).trim(), `${text}${suffix}`);
  } catch (e) {
    console.warn("Telegram notif transaksi gagal", e);
  }
}

/**
 * Notifikasi pengajuan barang masuk / penentuan harga.
 * Dikirim ke daftar Owner (telegram_recipients) yang notify_enabled aktif.
 */
export async function sendPricingNotification(
  keyOrMessage: string,
  vars?: Record<string, any>,
  fallback?: string,
) {
  try {
    const s = await loadSettings();
    if (!s?.telegram_enabled || !s.telegram_bot_token) return;

    let text: string;
    if (vars === undefined) {
      text = keyOrMessage;
    } else {
      const built = await buildMessage(keyOrMessage, vars, fallback ?? "");
      if (!built.enabled || !built.text) return;
      text = built.text;
    }

    const { data: recipients } = await supabase
      .from("telegram_recipients" as any)
      .select("chat_id, notify_enabled");

    const chatIds = new Set<string>();
    for (const r of ((recipients ?? []) as any[])) {
      if (r.notify_enabled && r.chat_id) chatIds.add(String(r.chat_id).trim());
    }
    if (s.telegram_chat_id) chatIds.add(String(s.telegram_chat_id).trim());
    if (chatIds.size === 0) return;

    await Promise.all(
      Array.from(chatIds).map((id) => tgSend(String(s.telegram_bot_token), id, text)),
    );
  } catch (e) {
    console.warn("Telegram notif pengajuan gagal", e);
  }
}

/** @deprecated pakai sendTransactionNotification atau sendPricingNotification */
export const sendTelegramNotification = sendTransactionNotification;
