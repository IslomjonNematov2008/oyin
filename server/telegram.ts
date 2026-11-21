import { CustomerOrder, OrderStatus } from '../src/types/market.ts';
import { marketStore } from './marketStore.ts';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatUzs(amount: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(amount))} so'm`;
}

function formatDateTimeUz(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function buildOrderTelegramHtml(order: CustomerOrder): string {
  const itemsLines = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. <b>${escapeHtml(item.brand)} ${escapeHtml(item.model)}</b> (${escapeHtml(
          item.storage
        )} · ${escapeHtml(item.colorName)}) × ${item.quantity} — <code>${escapeHtml(
          formatUzs(item.lineTotalUzs)
        )}</code>`
    )
    .join('\n');

  const noteLine = order.note
    ? `\n📝 <b>Izoh:</b> ${escapeHtml(order.note)}`
    : '';

  const deliveryFeeText =
    order.deliveryFeeUzs > 0 ? formatUzs(order.deliveryFeeUzs) : 'Bepul';

  return [
    `🔥 <b>YANGI BUYURTMA — #${escapeHtml(order.orderNumber)}</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Mijoz:</b> ${escapeHtml(order.customerName)}`,
    `📞 <b>Telefon:</b> <code>${escapeHtml(order.phone)}</code>`,
    `📍 <b>Hudud:</b> ${escapeHtml(order.region)}`,
    `🏠 <b>Manzil:</b> ${escapeHtml(order.address)}`,
    `🚚 <b>Yetkazish:</b> ${escapeHtml(order.deliveryMethod)}`,
    `💳 <b>To'lov:</b> ${escapeHtml(order.paymentMethod)}${noteLine}`,
    ``,
    `📱 <b>Buyurtma tarkibi:</b>`,
    itemsLines,
    ``,
    `📦 <b>Yetkazish narxi:</b> ${escapeHtml(deliveryFeeText)}`,
    `💰 <b>JAMI SUMMA:</b> <b>${escapeHtml(formatUzs(order.totalUzs))}</b>`,
    `📌 <b>Holat:</b> ${escapeHtml(order.status)}`,
    `🕒 <b>Vaqt:</b> ${escapeHtml(formatDateTimeUz(order.createdAt))}`,
  ].join('\n');
}

async function callTelegramApi<T>(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>
): Promise<{ ok: boolean; result?: T; description?: string }> {
  const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = (await response.json()) as {
    ok: boolean;
    result?: T;
    description?: string;
  };
  return data;
}

export async function dispatchOrderToTelegram(
  order: CustomerOrder,
  event: 'new_order' | 'manual_resend' = 'new_order'
): Promise<{
  status: 'sent' | 'failed' | 'unconfigured';
  messageId: number | null;
  error: string | null;
}> {
  const { botToken, channelId } = marketStore.getEffectiveTelegramCredentials();
  if (!botToken || !channelId) {
    const err = 'Telegram bot tokeni yoki kanal ID sozlanmagan.';
    marketStore.addTelegramLog({
      orderNumber: order.orderNumber,
      event,
      success: false,
      channelId: channelId || '—',
      messageId: null,
      detail: err,
    });
    return { status: 'unconfigured', messageId: null, error: err };
  }

  try {
    const html = buildOrderTelegramHtml(order);
    const res = await callTelegramApi<{ message_id: number }>(botToken, 'sendMessage', {
      chat_id: channelId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    if (res.ok && res.result?.message_id) {
      marketStore.addTelegramLog({
        orderNumber: order.orderNumber,
        event,
        success: true,
        channelId,
        messageId: res.result.message_id,
        detail: 'Buyurtma kanalga muvaffaqiyatli yuborildi.',
      });
      return {
        status: 'sent',
        messageId: res.result.message_id,
        error: null,
      };
    }

    const errMsg = res.description || 'Telegram API noma’lum xatolik qaytardi.';
    marketStore.addTelegramLog({
      orderNumber: order.orderNumber,
      event,
      success: false,
      channelId,
      messageId: null,
      detail: errMsg,
    });
    return { status: 'failed', messageId: null, error: errMsg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Tarmoq xatoligi';
    marketStore.addTelegramLog({
      orderNumber: order.orderNumber,
      event,
      success: false,
      channelId,
      messageId: null,
      detail: msg,
    });
    return { status: 'failed', messageId: null, error: msg };
  }
}

export async function dispatchStatusUpdateToTelegram(
  order: CustomerOrder,
  previousStatus: OrderStatus
): Promise<void> {
  const state = marketStore.getState();
  if (!state.autoSendStatusUpdates) return;

  const { botToken, channelId } = marketStore.getEffectiveTelegramCredentials();
  if (!botToken || !channelId) return;

  const html = [
    `🔄 <b>BUYURTMA HOLATI YANGILANDI — #${escapeHtml(order.orderNumber)}</b>`,
    `👤 Mijoz: ${escapeHtml(order.customerName)} (<code>${escapeHtml(order.phone)}</code>)`,
    `📌 Holat: <i>${escapeHtml(previousStatus)}</i> → <b>${escapeHtml(order.status)}</b>`,
    `💰 Summa: <code>${escapeHtml(formatUzs(order.totalUzs))}</code>`,
  ].join('\n');

  try {
    const payload: Record<string, unknown> = {
      chat_id: channelId,
      text: html,
      parse_mode: 'HTML',
    };
    if (order.telegramMessageId) {
      payload.reply_to_message_id = order.telegramMessageId;
    }

    const res = await callTelegramApi<{ message_id: number }>(botToken, 'sendMessage', payload);
    marketStore.addTelegramLog({
      orderNumber: order.orderNumber,
      event: 'status_update',
      success: Boolean(res.ok),
      channelId,
      messageId: res.result?.message_id ?? null,
      detail: res.ok
        ? `Holat yangilandi: ${order.status}`
        : res.description || 'Holat xabarini yuborib bo‘lmadi.',
    });
  } catch (err) {
    marketStore.addTelegramLog({
      orderNumber: order.orderNumber,
      event: 'status_update',
      success: false,
      channelId,
      messageId: null,
      detail: err instanceof Error ? err.message : 'Tarmoq xatoligi',
    });
  }
}

export async function testTelegramBotConnection(
  tokenOverride?: string,
  channelIdOverride?: string
): Promise<{
  ok: boolean;
  botUsername?: string;
  messageId?: number;
  error?: string;
}> {
  const creds = marketStore.getEffectiveTelegramCredentials();
  const botToken = (tokenOverride || creds.botToken).trim();
  const channelId = (channelIdOverride || creds.channelId).trim();

  if (!botToken) {
    return { ok: false, error: 'Bot tokeni kiritilmagan.' };
  }
  if (!channelId) {
    return { ok: false, error: 'Kanal ID kiritilmagan.' };
  }

  try {
    const me = await callTelegramApi<{ username: string; first_name: string }>(botToken, 'getMe');
    if (!me.ok || !me.result) {
      return {
        ok: false,
        error: me.description || 'Bot tokeni yaroqsiz (getMe xatosi).',
      };
    }

    const testText = [
      `✅ <b>OLOV MOBILE — Telegram ulanishi tasdiqlandi</b>`,
      `🤖 Bot: @${escapeHtml(me.result.username)}`,
      `📡 Kanal ID: <code>${escapeHtml(channelId)}</code>`,
      `🕒 Vaqt: ${escapeHtml(formatDateTimeUz(new Date().toISOString()))}`,
    ].join('\n');

    const sent = await callTelegramApi<{ message_id: number }>(botToken, 'sendMessage', {
      chat_id: channelId,
      text: testText,
      parse_mode: 'HTML',
    });

    if (!sent.ok || !sent.result) {
      const errMsg =
        sent.description || 'Kanalga xabar yuborib bo‘lmadi. Bot kanalga Admin qilinganini tekshiring.';
      marketStore.addTelegramLog({
        orderNumber: 'TEST',
        event: 'test_message',
        success: false,
        channelId,
        messageId: null,
        detail: errMsg,
      });
      return { ok: false, botUsername: me.result.username, error: errMsg };
    }

    marketStore.addTelegramLog({
      orderNumber: 'TEST',
      event: 'test_message',
      success: true,
      channelId,
      messageId: sent.result.message_id,
      detail: `@${me.result.username} orqali test xabari yuborildi.`,
    });

    return {
      ok: true,
      botUsername: me.result.username,
      messageId: sent.result.message_id,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Telegram serveriga ulanib bo‘lmadi.',
    };
  }
}
