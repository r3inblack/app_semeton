import { createServerFn } from "@tanstack/react-start";

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
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

/** Cek pelanggan berdasarkan kode (Nomor ID). */
export const portalLookupCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { code: string })
  .handler(async ({ data }) => {
    const code = String(data.code || "").trim().toUpperCase();
    if (!code) return { ok: false as const, reason: "code_required" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("id, code, name")
      .eq("code", code)
      .maybeSingle();
    if (!cust) return { ok: false as const, reason: "not_found" };
    const { data: bal } = await supabaseAdmin
      .from("customer_balances")
      .select("receivable")
      .eq("customer_id", cust.id)
      .maybeSingle();
    return {
      ok: true as const,
      customer: { id: cust.id, code: cust.code, name: cust.name },
      receivable: Number((bal as any)?.receivable ?? 0),
    };
  });

/** Daftar rekening penerima yang aktif (publik, read-only). */
export const portalListBankAccounts = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("bank_accounts")
      .select("id, bank_name, account_number, account_holder")
      .eq("active", true)
      .order("bank_name", { ascending: true });
    return data ?? [];
  },
);

/** Ringkasan pelanggan: sisa hutang + 5 setoran approved + status pending terakhir. */
export const portalGetSummary = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { code: string })
  .handler(async ({ data }) => {
    const code = String(data.code || "").trim().toUpperCase();
    if (!code) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("id, code, name")
      .eq("code", code)
      .maybeSingle();
    if (!cust) return null;
    const [{ data: bal }, { data: history }, { data: pending }] = await Promise.all([
      supabaseAdmin.from("customer_balances").select("receivable").eq("customer_id", cust.id).maybeSingle(),
      supabaseAdmin
        .from("customer_payments")
        .select("amount, note, occurred_at")
        .eq("customer_id", cust.id)
        .order("occurred_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("pending_customer_payments")
        .select("id, amount, status, created_at, reject_reason")
        .eq("customer_id", cust.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    return {
      customer: cust,
      receivable: Number((bal as any)?.receivable ?? 0),
      history: history ?? [],
      pending: pending ?? [],
    };
  });

type SubmitInput = {
  code: string;
  amount: number;
  bank_account_id?: string | null;
  proof_path?: string | null;
  note?: string | null;
  submitter_name?: string | null;
};

/** Ajukan setoran mandiri dari portal + kirim notifikasi Telegram ke owner (can_price). */
export const portalSubmitPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SubmitInput)
  .handler(async ({ data }) => {
    const code = String(data.code || "").trim().toUpperCase();
    const amount = Number(data.amount);
    if (!code) return { ok: false as const, reason: "code_required" };
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false as const, reason: "invalid_amount" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("id, code, name")
      .eq("code", code)
      .maybeSingle();
    if (!cust) return { ok: false as const, reason: "not_found" };

    let bank: any = null;
    if (data.bank_account_id) {
      const { data: b } = await supabaseAdmin
        .from("bank_accounts")
        .select("id, bank_name, account_number, account_holder")
        .eq("id", data.bank_account_id)
        .maybeSingle();
      bank = b;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("pending_customer_payments")
      .insert({
        customer_id: cust.id,
        amount,
        bank_account_id: bank?.id ?? null,
        proof_path: data.proof_path ?? null,
        note: data.note ?? null,
        submitter_name: data.submitter_name ?? null,
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, reason: error.message };

    // Kirim notifikasi ke owner yang berhak (telegram_recipients.can_price)
    try {
      const { data: s } = await supabaseAdmin
        .from("app_settings")
        .select("telegram_enabled, telegram_bot_token")
        .eq("id", 1)
        .maybeSingle();
      if (s?.telegram_enabled && s.telegram_bot_token) {
        const { data: recips } = await supabaseAdmin
          .from("telegram_recipients")
          .select("chat_id, can_price, notify_enabled");
        const ids = new Set<string>();
        for (const r of (recips ?? []) as any[]) {
          if (r.can_price && r.chat_id) ids.add(String(r.chat_id).trim());
        }
        if (ids.size > 0) {
          const rek = bank
            ? `Rek Penerima : ${bank.account_holder}\nBank : ${bank.bank_name} (${bank.account_number})`
            : "Rek Penerima : -";
          const nama = data.submitter_name
            ? `${cust.name} (dikirim: ${data.submitter_name})`
            : cust.name;
          const noteLine = data.note ? `\nCatatan : ${data.note}` : "";
          const text =
            `📥 <b>SETORAN MASUK</b>\n` +
            `NO ID : ${cust.code}\n` +
            `NAMA : ${nama}\n` +
            `Nominal : ${fmtIDR(amount)}\n` +
            `${rek}${noteLine}\n\n` +
            `Balas <b>ok</b> untuk menyetujui atau <b>tolak</b> untuk menolak.\n` +
            `#SETORAN:${inserted!.id}`;
          await Promise.all(
            [...ids].map((id) => tgSend(String(s.telegram_bot_token), id, text)),
          );
        }
      }
    } catch (e) {
      console.warn("portal notify failed", e);
    }

    return { ok: true as const, id: inserted!.id };
  });

/** Upload bukti transfer via server (service-role) supaya bucket tidak perlu policy anon. */
export const portalUploadProof = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      d as {
        code: string;
        filename: string;
        content_type?: string | null;
        data_base64: string;
      },
  )
  .handler(async ({ data }) => {
    const code = String(data.code || "").trim().toUpperCase();
    if (!code) return { ok: false as const, reason: "code_required" };
    const b64 = String(data.data_base64 || "");
    if (!b64) return { ok: false as const, reason: "empty_file" };
    // Size guard ~8MB
    if (b64.length > 8 * 1024 * 1024 * 1.4)
      return { ok: false as const, reason: "file_too_large" };

    const ct = String(data.content_type || "").toLowerCase();
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (ct && !allowed.includes(ct))
      return { ok: false as const, reason: "invalid_type" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("id, code")
      .eq("code", code)
      .maybeSingle();
    if (!cust) return { ok: false as const, reason: "not_found" };

    const ext = (data.filename?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const key = `${cust.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Buffer.from(b64, "base64");
    const { error } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(key, bytes, {
        contentType: ct || "application/octet-stream",
        upsert: false,
      });
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, path: key };
  });
