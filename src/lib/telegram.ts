import { sendTelegram } from "./telegram.functions";

/**
 * Notifikasi transaksi (grup Telegram). Sisa saldo kas otomatis ditambahkan.
 * Legacy: bila `vars` tidak diberikan, `keyOrMessage` dianggap teks siap-kirim.
 */
export async function sendTransactionNotification(
  keyOrMessage: string,
  vars?: Record<string, any>,
  fallback?: string,
) {
  try {
    await sendTelegram({
      data: {
        mode: "transaction",
        key: vars === undefined ? "__raw__" : keyOrMessage,
        vars: vars,
        fallback: vars === undefined ? keyOrMessage : (fallback ?? ""),
      },
    });
  } catch (e) {
    console.warn("Telegram notif transaksi gagal", e);
  }
}

/**
 * Notifikasi pengajuan harga (owner penerima notifikasi).
 */
export async function sendPricingNotification(
  keyOrMessage: string,
  vars?: Record<string, any>,
  fallback?: string,
) {
  try {
    await sendTelegram({
      data: {
        mode: "pricing",
        key: vars === undefined ? "__raw__" : keyOrMessage,
        vars: vars,
        fallback: vars === undefined ? keyOrMessage : (fallback ?? ""),
      },
    });
  } catch (e) {
    console.warn("Telegram notif pengajuan gagal", e);
  }
}

// Template cache invalidation is now server-side; no-op kept for compatibility.
export function invalidateTelegramTemplateCache() {}

/** @deprecated */
export const sendTelegramNotification = sendTransactionNotification;
