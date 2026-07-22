import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";

function deriveSecret(botToken: string) {
  return createHash("sha256").update("tg-webhook:" + botToken).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

function getAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function tgSend(botToken: string, chatId: number | string, text: string, replyTo?: number) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_to_message_id: replyTo,
    }),
  }).catch(() => {});
}

function parseNum(s: string): number | null {
  const n = Number(String(s).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = getAdmin();

        let update: any = null;
        try {
          update = await request.json();
        } catch {}

        const message = update?.message ?? update?.edited_message;
        const fromId = message?.from?.id;
        const fromName = [message?.from?.first_name, message?.from?.last_name]
          .filter(Boolean).join(" ") || message?.from?.username || null;
        const chatId = message?.chat?.id;
        const messageId = message?.message_id;
        const text: string = message?.text ?? "";
        const replied: string = message?.reply_to_message?.text ?? "";

        const log = async (status: string, detail?: string) => {
          await admin.from("telegram_webhook_logs").insert({
            from_id: fromId ? String(fromId) : null,
            from_name: fromName,
            chat_id: chatId ? String(chatId) : null,
            text: text || null,
            reply_to_text: replied || null,
            status,
            detail: detail ?? null,
            raw: update ?? null,
          }).then(() => {}, () => {});
        };

        const { data: settings } = await admin
          .from("app_settings")
          .select("telegram_bot_token, telegram_enabled")
          .eq("id", 1)
          .maybeSingle();
        const botToken = settings?.telegram_bot_token as string | undefined;
        if (!settings?.telegram_enabled || !botToken) {
          await log("skipped", "telegram_disabled_or_no_token");
          return new Response("ok");
        }

        const expected = deriveSecret(botToken);
        const actual = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!safeEqual(actual, expected)) {
          await log("unauthorized", "secret_token_mismatch");
          return new Response("unauthorized", { status: 401 });
        }

        if (!message || !fromId || !chatId) {
          await log("ignored", "no_message_payload");
          return Response.json({ ok: true });
        }

        const { data: recip } = await admin
          .from("telegram_recipients")
          .select("can_price, label")
          .eq("chat_id", String(fromId))
          .maybeSingle();
        if (!recip?.can_price) {
          await tgSend(botToken, chatId, "❌ Anda tidak berwenang menentukan harga.", messageId);
          await log("denied", recip ? "no_can_price" : "not_registered");
          return Response.json({ ok: true });
        }

        const idMatch = (replied + "\n" + text).match(
          /#ID[:\s]*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
        );
        if (!idMatch) {
          await tgSend(
            botToken, chatId,
            "⚠️ ID pengajuan tidak ditemukan.\n\n" +
            "Cara benar:\n" +
            "1. Tekan lama pesan <b>Pengajuan Barang Masuk</b> lalu pilih <b>Balas / Reply</b>\n" +
            "2. Kirim harga: <code>&lt;harga_beli&gt; &lt;harga_jual&gt;</code>\n" +
            "   Contoh: <code>10000 12000</code>\n\n" +
            "Atau sertakan <code>#ID:&lt;uuid&gt;</code> pada pesan Anda.",
            messageId,
          );
          await log("no_id", replied ? "reply_without_id" : "standalone_no_id");
          return Response.json({ ok: true });
        }
        const pendingId = idMatch[1];

        const nums = text.match(/[\d.,]+/g) ?? [];
        if (nums.length < 2) {
          await tgSend(botToken, chatId, "Format: <harga_beli> <harga_jual> (contoh: 10000 12000)", messageId);
          await log("bad_format", `nums=${nums.length}`);
          return Response.json({ ok: true });
        }
        const buy = parseNum(nums[0]!);
        const sell = parseNum(nums[1]!);
        if (!buy || !sell) {
          await tgSend(botToken, chatId, "Harga tidak valid.", messageId);
          await log("bad_price", `buy=${nums[0]} sell=${nums[1]}`);
          return Response.json({ ok: true });
        }

        const { error } = await admin.rpc("approve_pending_stock_in_via_telegram", {
          p_id: pendingId,
          p_buy_price: buy,
          p_sell_price: sell,
        });
        if (error) {
          await tgSend(botToken, chatId, `❌ Gagal: ${error.message}`, messageId);
          await log("rpc_error", error.message);
          return Response.json({ ok: true });
        }

        const fmt = (n: number) => n.toLocaleString("id-ID");
        await tgSend(
          botToken, chatId,
          `✅ Disetujui.\nHarga beli: Rp ${fmt(buy)}\nHarga jual: Rp ${fmt(sell)}`,
          messageId,
        );
        await log("approved", `id=${pendingId} buy=${buy} sell=${sell}`);
        return Response.json({ ok: true });
      },
    },
  },
});
