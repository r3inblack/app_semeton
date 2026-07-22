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

        const { data: settings } = await admin
          .from("app_settings")
          .select("telegram_bot_token, telegram_enabled")
          .eq("id", 1)
          .maybeSingle();
        const botToken = settings?.telegram_bot_token as string | undefined;
        if (!settings?.telegram_enabled || !botToken) {
          return new Response("ok");
        }

        const expected = deriveSecret(botToken);
        const actual = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!safeEqual(actual, expected)) {
          return new Response("unauthorized", { status: 401 });
        }

        let update: any;
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true });
        }
        const message = update?.message ?? update?.edited_message;
        const fromId = message?.from?.id;
        const chatId = message?.chat?.id;
        const messageId = message?.message_id;
        const text: string = message?.text ?? "";
        const replied: string = message?.reply_to_message?.text ?? "";
        if (!message || !fromId || !chatId) return Response.json({ ok: true });

        // Verify sender authority
        const { data: recip } = await admin
          .from("telegram_recipients")
          .select("can_price")
          .eq("chat_id", String(fromId))
          .maybeSingle();
        if (!recip?.can_price) {
          await tgSend(botToken, chatId, "❌ Anda tidak berwenang menentukan harga.", messageId);
          return Response.json({ ok: true });
        }

        // Extract pending id from reply-target or current text: `#ID:<uuid>`
        const idMatch = (replied + "\n" + text).match(
          /#ID[:\s]*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
        );
        if (!idMatch) {
          await tgSend(
            botToken, chatId,
            "Balas pesan pengajuan dengan format: <b>&lt;harga_beli&gt; &lt;harga_jual&gt;</b>\nContoh: <code>10000 12000</code>",
            messageId,
          );
          return Response.json({ ok: true });
        }
        const pendingId = idMatch[1];

        const nums = text.match(/[\d.,]+/g) ?? [];
        if (nums.length < 2) {
          await tgSend(botToken, chatId, "Format: <harga_beli> <harga_jual> (contoh: 10000 12000)", messageId);
          return Response.json({ ok: true });
        }
        const buy = parseNum(nums[0]!);
        const sell = parseNum(nums[1]!);
        if (!buy || !sell) {
          await tgSend(botToken, chatId, "Harga tidak valid.", messageId);
          return Response.json({ ok: true });
        }

        const { error } = await admin.rpc("approve_pending_stock_in_via_telegram", {
          p_id: pendingId,
          p_buy_price: buy,
          p_sell_price: sell,
        });
        if (error) {
          await tgSend(botToken, chatId, `❌ Gagal: ${error.message}`, messageId);
          return Response.json({ ok: true });
        }

        const fmt = (n: number) => n.toLocaleString("id-ID");
        await tgSend(
          botToken, chatId,
          `✅ Disetujui.\nHarga beli: Rp ${fmt(buy)}\nHarga jual: Rp ${fmt(sell)}`,
          messageId,
        );
        return Response.json({ ok: true });
      },
    },
  },
});
