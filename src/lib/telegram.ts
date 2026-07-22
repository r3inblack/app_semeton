import { supabase } from "@/integrations/supabase/client";

export async function sendTelegramNotification(message: string) {
  try {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("telegram_enabled, telegram_bot_token, telegram_chat_id")
      .eq("id", 1)
      .maybeSingle();
    if (!settings?.telegram_enabled || !settings.telegram_bot_token) return;

    const { data: recipients } = await supabase
      .from("telegram_recipients" as any)
      .select("chat_id, notify_enabled");

    const chatIds = new Set<string>();
    for (const r of ((recipients ?? []) as any[])) {
      if (r.notify_enabled && r.chat_id) chatIds.add(String(r.chat_id).trim());
    }
    // Backward compat: legacy single chat_id on app_settings
    if (settings.telegram_chat_id) chatIds.add(String(settings.telegram_chat_id).trim());

    if (chatIds.size === 0) return;

    await Promise.all(
      Array.from(chatIds).map((chat_id) =>
        fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id, text: message, parse_mode: "HTML" }),
        }),
      ),
    );
  } catch (e) {
    console.warn("Telegram notif gagal", e);
  }
}
