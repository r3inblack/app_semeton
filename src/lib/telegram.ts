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

/**
 * Notifikasi transaksi (setoran pelanggan, bayar supplier, pengeluaran, dsb).
 * Dikirim ke satu grup Telegram — bot token & chat_id grup diatur di Pengaturan.
 */
export async function sendTransactionNotification(message: string) {
  try {
    const s = await loadSettings();
    if (!s?.telegram_enabled) return;
    const token = (s as any).telegram_group_bot_token || s.telegram_bot_token;
    const chatId = (s as any).telegram_group_chat_id;
    if (!token || !chatId) return;
    await tgSend(String(token), String(chatId).trim(), message);
  } catch (e) {
    console.warn("Telegram notif transaksi gagal", e);
  }
}

/**
 * Notifikasi pengajuan barang masuk / penentuan harga.
 * Dikirim ke daftar Owner (telegram_recipients) yang notify_enabled aktif.
 */
export async function sendPricingNotification(message: string) {
  try {
    const s = await loadSettings();
    if (!s?.telegram_enabled || !s.telegram_bot_token) return;

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
      Array.from(chatIds).map((id) => tgSend(String(s.telegram_bot_token), id, message)),
    );
  } catch (e) {
    console.warn("Telegram notif pengajuan gagal", e);
  }
}

/** @deprecated pakai sendTransactionNotification atau sendPricingNotification */
export const sendTelegramNotification = sendTransactionNotification;
