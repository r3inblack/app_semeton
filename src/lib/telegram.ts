import { supabase } from "@/integrations/supabase/client";

export async function sendTelegramNotification(message: string) {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("telegram_enabled, telegram_bot_token, telegram_chat_id")
      .eq("id", 1)
      .maybeSingle();
    if (!data?.telegram_enabled || !data.telegram_bot_token || !data.telegram_chat_id) return;
    await fetch(`https://api.telegram.org/bot${data.telegram_bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: data.telegram_chat_id,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.warn("Telegram notif gagal", e);
  }
}
