import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { trackEvent } from '../_lib/analytics';

const FORCE_REPLY_PREFIX = '📅 Напишите напоминание на ';

/**
 * Интерактивный HTML-виджет календаря Lovia (вписывается в лимит 4 КБ zlib для Telegram sendWidget)
 */
const CALENDAR_WIDGET_HTML = `<style>
*{box-sizing:border-box}
body{margin:0;padding:10px 12px env(safe-area-inset-bottom);font-family:system-ui,sans-serif;color:var(--tg-theme-text-color)}
.h{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.m{font-weight:700;font-size:15px}
.nav{display:flex;gap:6px}
.nb{padding:4px 10px;border-radius:10px;border:1px solid var(--tg-theme-section-separator-color);background:var(--tg-theme-secondary-bg-color);color:var(--tg-theme-text-color);font-size:13px}
.g{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}
.w{font-size:11px;color:var(--tg-theme-hint-color);padding-bottom:2px}
.d{position:relative;padding:6px 0;border-radius:10px;border:none;background:transparent;color:var(--tg-theme-text-color);font-size:13px;font-weight:500}
.d.sel{background:var(--tg-theme-button-color);color:var(--tg-theme-button-text-color);font-weight:700}
.dot{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--tg-theme-accent-text-color)}
.d.sel .dot{background:var(--tg-theme-button-text-color)}
.box{margin-top:8px;padding-top:8px;border-top:1px dashed var(--tg-theme-section-separator-color)}
.dt{font-size:12px;color:var(--tg-theme-hint-color);margin-bottom:4px}
.it{font-size:13px;padding:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row{display:flex;gap:6px;margin-top:8px}
.btn{flex:1;padding:7px 8px;border-radius:10px;border:none;font-size:13px;font-weight:600;background:var(--tg-theme-button-color);color:var(--tg-theme-button-text-color)}
.btn2{background:var(--tg-theme-secondary-bg-color);color:var(--tg-theme-text-color)}
</style>
<div class="h"><div class="m" id="m"></div><div class="nav"><button class="nb" id="p">‹</button><button class="nb" id="n">›</button></div></div>
<div class="g" id="g"></div>
<div class="box"><div class="dt" id="dt"></div><div id="l"></div>
<div class="row"><button class="btn" id="add">+ Напоминание</button><button class="btn btn2" id="open">Lovia</button></div></div>
<script>
const W=window.TelegramWidget,$=id=>document.getElementById(id);
const MN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WD=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
let st={y:2026,m:10,sel:'',dots:[],items:[],msg:''};
function load(raw){try{if(raw)st={...st,...JSON.parse(raw)}}catch{}}
function draw(){
 $('m').textContent=MN[st.m]+' '+st.y;
 const f=new Date(st.y,st.m,1),s=(f.getDay()+6)%7,days=new Date(st.y,st.m+1,0).getDate();
 const cells=WD.map(x=>'<div class="w">'+x+'</div>');
 for(let i=0;i<s;i++)cells.push('<div></div>');
 for(let d=1;d<=days;d++){
  const k=st.y+'-'+String(st.m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const cls='d'+(st.sel===k?' sel':'');
  const dot=st.dots.includes(d)?'<span class="dot"></span>':'';
  cells.push('<button class="'+cls+'" data-d="'+k+'">'+d+dot+'</button>');
 }
 $('g').innerHTML=cells.join('');$('dt').textContent=st.msg||(st.sel?'Планы на '+st.sel:'Выберите дату');
 $('l').innerHTML=st.items.length?st.items.slice(0,4).map(t=>'<div class="it">• '+t+'</div>').join(''):'<div class="dt">Нет планов</div>';
}
function ask(q){
 if(!W)return;
 W.HapticFeedback.selectionChanged();
 $('dt').textContent='Обновляю...';
 W.request(q).then(r=>{if(r&&r.result)load(r.result);draw()}).catch(e=>{$('dt').textContent='Ошибка: '+e.code});
}
$('g').onclick=e=>{const b=e.target.closest('[data-d]');if(b)ask('d:'+b.dataset.d)};
$('p').onclick=()=>ask('m:-1:'+st.y+':'+st.m);$('n').onclick=()=>ask('m:1:'+st.y+':'+st.m);
$('add').onclick=()=>{if(st.sel)ask('add:'+st.sel)};$('open').onclick=()=>W&&W.openTelegramLink('https://t.me/LoviaStory_bot');
if(W){load(W.chatData);W.onEvent('chatDataChanged',()=>{load(W.chatData);draw()});W.ready()}
draw();
</script>`;

interface CalendarChatData {
  y: number;
  m: number;
  sel: string;
  dots: number[];
  items: string[];
  msg?: string;
}

interface UserCoupleContext {
  actorId: string;
  user: {
    id: string;
    name?: string | null;
    telegram_id?: number | null;
    couple_id?: string | null;
    timezone_offset?: number | null;
    notifications_enabled?: boolean | null;
  } | null;
  couple: {
    id: string;
    space_type?: string | null;
    user1_id: string;
    user2_id?: string | null;
    status: string;
  } | null;
}

/**
 * Инициализация Supabase-клиента с SERVICE_ROLE (как в api/db.ts)
 */
function getSupabaseAdmin(): SupabaseClient | null {
  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    supabaseUrl = 'https://uwbdtisxjzmnzkodiexo.supabase.co';
  }

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Единый вызов Telegram Bot API
 */
async function callTelegramApi(
  botToken: string,
  method: string,
  payload: Record<string, unknown>
): Promise<any> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: any = await res.json().catch(() => null);
    if (!json || json.ok !== true) {
      console.warn(`[telegram/webhook] ${method} failed:`, json?.description || res.status);
    }
    return json;
  } catch (err) {
    console.warn(`[telegram/webhook] ${method} network error:`, err);
    return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeWidgetItemText(raw: string, maxLen = 32): string {
  const clean = raw.replace(/\s+/g, ' ').replace(/[<>]/g, '').trim();
  const truncated = clean.length > maxLen ? `${clean.slice(0, maxLen - 1).trimEnd()}…` : clean;
  return truncated.replace(/&/g, '&amp;');
}

function formatDateParts(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getLocalTodayParts(timezoneOffsetMin = 0): { y: number; m: number; d: number; dateStr: string } {
  const shifted = new Date(Date.now() + timezoneOffsetMin * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return { y, m, d, dateStr: formatDateParts(y, m, d) };
}

function parseIsoDate(dateStr: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const month1 = Number(match[2]);
  const d = Number(match[3]);
  if (month1 < 1 || month1 > 12 || d < 1 || d > 31) return null;
  const check = new Date(Date.UTC(y, month1 - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== month1 - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m: month1 - 1, d };
}

/**
 * Поиск пользователя tg_${tgUserId} и его активной пары
 */
async function findUserAndActiveCouple(
  supabase: SupabaseClient,
  tgUserId: number | string
): Promise<UserCoupleContext> {
  const actorId = `tg_${tgUserId}`;

  let { data: user } = await supabase
    .from('users')
    .select('id, name, telegram_id, couple_id, timezone_offset, notifications_enabled')
    .eq('id', actorId)
    .maybeSingle();

  if (!user && /^\d+$/.test(String(tgUserId))) {
    const { data: userByTgId } = await supabase
      .from('users')
      .select('id, name, telegram_id, couple_id, timezone_offset, notifications_enabled')
      .eq('telegram_id', Number(tgUserId))
      .maybeSingle();
    user = userByTgId;
  }

  const effectiveActorId = user?.id || actorId;
  let couple: UserCoupleContext['couple'] = null;

  if (user?.couple_id) {
    const { data: coupleById } = await supabase
      .from('couples')
      .select('id, space_type, user1_id, user2_id, status')
      .eq('id', user.couple_id)
      .neq('status', 'dissolved')
      .maybeSingle();
    if (coupleById) {
      couple = coupleById;
    }
  }

  if (!couple) {
    const { data: coupleByMember } = await supabase
      .from('couples')
      .select('id, space_type, user1_id, user2_id, status')
      .or(`user1_id.eq.${effectiveActorId},user2_id.eq.${effectiveActorId}`)
      .neq('status', 'dissolved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (coupleByMember) {
      couple = coupleByMember;
    }
  }

  return { actorId: effectiveActorId, user: user || null, couple };
}

/**
 * Сборка компактного chat_data (гарантированно <= 1024 байт UTF-8) для виджета календаря
 */
async function buildCalendarChatData(
  supabase: SupabaseClient,
  tgUserId: number | string,
  year: number,
  monthIndex: number,
  selectedDate?: string
): Promise<{ chatData: CalendarChatData; context: UserCoupleContext }> {
  const context = await findUserAndActiveCouple(supabase, tgUserId);
  const normalizedMonth = new Date(Date.UTC(year, monthIndex, 1));
  const y = normalizedMonth.getUTCFullYear();
  const m = normalizedMonth.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  const firstDayStr = formatDateParts(y, m, 1);
  const lastDayStr = formatDateParts(y, m, daysInMonth);

  let sel = firstDayStr;
  if (selectedDate) {
    const parsedSel = parseIsoDate(selectedDate);
    if (parsedSel && parsedSel.y === y && parsedSel.m === m) {
      sel = formatDateParts(parsedSel.y, parsedSel.m, parsedSel.d);
    }
  }

  if (!context.couple) {
    return {
      context,
      chatData: {
        y,
        m,
        sel,
        dots: [],
        items: [],
        msg: 'Пара не подключена',
      },
    };
  }

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('title, due_date, due_time, status')
    .eq('couple_id', context.couple.id)
    .gte('due_date', firstDayStr)
    .lte('due_date', lastDayStr)
    .order('due_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[telegram/webhook] buildCalendarChatData query error:', error.message);
  }

  const dotSet = new Set<number>();
  const dayItems: string[] = [];

  for (const row of reminders || []) {
    const rowDate = typeof row.due_date === 'string' ? row.due_date.slice(0, 10) : '';
    const parsed = parseIsoDate(rowDate);
    if (!parsed || parsed.y !== y || parsed.m !== m) continue;

    dotSet.add(parsed.d);

    if (rowDate === sel && dayItems.length < 4) {
      const timePrefix =
        typeof row.due_time === 'string' && /^\d{1,2}:\d{2}/.test(row.due_time.trim())
          ? `${row.due_time.trim().slice(0, 5)} `
          : '';
      const rawLine = `${timePrefix}${row.title || ''}`.trim();
      if (rawLine) {
        dayItems.push(sanitizeWidgetItemText(rawLine, 32));
      }
    }
  }

  const dots = Array.from(dotSet).sort((a, b) => a - b);
  const chatData: CalendarChatData = { y, m, sel, dots, items: dayItems };

  // Гарантируем лимит chat_data <= 1024 байт UTF-8
  let maxLen = 32;
  while (Buffer.byteLength(JSON.stringify(chatData), 'utf8') > 1024 && maxLen > 10) {
    maxLen -= 4;
    chatData.items = chatData.items.map((item) =>
      item.length > maxLen ? `${item.slice(0, maxLen - 1).trimEnd()}…` : item
    );
  }
  while (Buffer.byteLength(JSON.stringify(chatData), 'utf8') > 1024 && chatData.items.length > 0) {
    chatData.items.pop();
  }

  return { chatData, context };
}

/**
 * Извлечение времени (HH:MM) и заголовка из текста пользователя
 * Примеры: "Ужин в 20:00" -> { title: "Ужин", dueTime: "20:00" }
 *          "20:00 Ужин" -> { title: "Ужин", dueTime: "20:00" }
 */
function parseReminderInput(rawText: string): { title: string; dueTime: string | null } {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  const timeRegex = /(?:(?:^|\s)(?:в|к|на|at)\s+)?(\d{1,2}):(\d{2})(?=$|[\s.,!?)-])/i;
  const match = timeRegex.exec(normalized);

  if (!match) {
    return { title: normalized, dueTime: null };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { title: normalized, dueTime: null };
  }

  const dueTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const before = normalized.slice(0, match.index).trim();
  const after = normalized.slice(match.index + match[0].length).replace(/^[\s.,:-]+/, '').trim();
  const title = [before, after].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  return { title, dueTime };
}

/**
 * Отправка виджета календаря в чат
 */
async function sendCalendarWidget(
  botToken: string,
  supabase: SupabaseClient | null,
  chatId: number | string,
  tgUserId: number | string
): Promise<void> {
  if (!supabase) {
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: 'Сервис временно недоступен. Попробуйте чуть позже.',
    });
    return;
  }

  const context = await findUserAndActiveCouple(supabase, tgUserId);
  if (!context.couple) {
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: 'Сначала создайте или подключите пару в Lovia',
    });
    return;
  }

  const tzOffset = typeof context.user?.timezone_offset === 'number' ? context.user.timezone_offset : 0;
  const today = getLocalTodayParts(tzOffset);
  const { chatData } = await buildCalendarChatData(supabase, tgUserId, today.y, today.m, today.dateStr);

  await callTelegramApi(botToken, 'sendWidget', {
    chat_id: chatId,
    html: CALENDAR_WIDGET_HTML,
    chat_data: JSON.stringify(chatData),
    allow_queries: true,
    caption: '📅 Календарь напоминаний Lovia',
  });
}

/**
 * Извлечение чистого username/chat_id канала
 * Поддерживает форматы: @channel, channel, -1001234567890, https://t.me/channel, t.me/channel
 */
function normalizeChannelChatId(raw: string): string {
  let clean = raw.trim();
  if (!clean) return '';
  clean = clean.replace(/^(?:https?:\/\/)?t\.me\//i, '');
  clean = clean.replace(/^\/+|\/+$/g, '');
  if (clean.startsWith('@') || clean.startsWith('-')) {
    return clean;
  }
  if (/^\d+$/.test(clean)) {
    return `-100${clean}`;
  }
  return `@${clean}`;
}

/**
 * Получение ссылки на канал для подписки
 */
function getChannelUrl(): string {
  if (process.env.REQUIRED_CHANNEL_URL) {
    return process.env.REQUIRED_CHANNEL_URL.trim();
  }
  const channelId = process.env.REQUIRED_CHANNEL_ID?.trim() || '';
  if (!channelId) return 'https://t.me';
  if (channelId.startsWith('http://') || channelId.startsWith('https://')) {
    return channelId;
  }
  let clean = channelId.replace(/^(?:https?:\/\/)?t\.me\//i, '').replace(/^@/, '');
  if (!clean.startsWith('-') && clean.length > 0) {
    return `https://t.me/${clean}`;
  }
  return 'https://t.me';
}

/**
 * Проверка членства пользователя в обязательном Telegram-канале.
 * Если REQUIRED_CHANNEL_ID не задан — возвращает { subscribed: true }.
 */
export async function checkChannelSubscription(
  telegramUserId: number | string
): Promise<{ subscribed: boolean; error?: string }> {
  const channelRaw = process.env.REQUIRED_CHANNEL_ID?.trim();
  if (!channelRaw) {
    return { subscribed: true };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[checkChannelSubscription] TELEGRAM_BOT_TOKEN not configured');
    return { subscribed: true };
  }

  const chatId = normalizeChannelChatId(channelRaw);
  if (!chatId) {
    return { subscribed: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${telegramUserId}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data: any = await response.json();

    if (!data || !data.ok) {
      const errMsg = data?.description || 'Telegram API error';
      console.error(
        `[checkChannelSubscription] Telegram getChatMember error for user ${telegramUserId} in chat ${chatId}:`,
        errMsg
      );
      return { subscribed: false, error: errMsg };
    }

    const status = data.result?.status;
    const isMember = status === 'restricted' ? Boolean(data.result?.is_member) : false;

    if (['member', 'administrator', 'creator'].includes(status) || isMember) {
      return { subscribed: true };
    }

    return { subscribed: false };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    const errMsg = isTimeout
      ? 'Превышено время ожидания ответа от Telegram (таймаут 5 сек)'
      : err?.message || 'Network error';
    console.error('[checkChannelSubscription] Network or runtime exception:', errMsg);
    return { subscribed: false, error: errMsg };
  }
}

/**
 * Обратная совместимость для сигнатуры checkUserSubscription(userId: number)
 */
export async function checkUserSubscription(userId: number): Promise<boolean> {
  const result = await checkChannelSubscription(userId);
  return result.subscribed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health-check / ping
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, status: 'Telegram webhook endpoint active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const host = req.headers.host || '';
    const baseUrl = process.env.APP_URL || (host ? `https://${host}` : 'https://lovia.app');

    // =========================================================================
    // 1. Обработка интерактивных запросов от HTML-виджета (update.widget_query)
    // =========================================================================
    const widgetQuery = update?.widget_query;
    if (widgetQuery && botToken) {
      const widgetQueryId: string = widgetQuery.id;
      const queryData: string = typeof widgetQuery.data === 'string' ? widgetQuery.data.trim() : '';
      const fromUserId = widgetQuery.from?.id;
      const chatId = widgetQuery.message?.chat?.id;
      const messageId = widgetQuery.message?.message_id;
      const supabase = getSupabaseAdmin();

      if (!supabase || !fromUserId) {
        await callTelegramApi(botToken, 'answerWidgetQuery', {
          widget_query_id: widgetQueryId,
        });
        return res.status(200).json({ ok: true });
      }

      // 1a. Клик по дню: d:YYYY-MM-DD
      if (queryData.startsWith('d:')) {
        const dateStr = queryData.slice(2).trim();
        const parsed = parseIsoDate(dateStr);
        if (parsed) {
          const { chatData } = await buildCalendarChatData(
            supabase,
            fromUserId,
            parsed.y,
            parsed.m,
            dateStr
          );
          const serialized = JSON.stringify(chatData);

          if (chatId && messageId) {
            await callTelegramApi(botToken, 'editMessageWidgetData', {
              chat_id: chatId,
              message_id: messageId,
              chat_data: serialized,
            });
          }

          await callTelegramApi(botToken, 'answerWidgetQuery', {
            widget_query_id: widgetQueryId,
            data: serialized,
          });
          return res.status(200).json({ ok: true });
        }
      }

      // 1b. Смена месяца: m:-1:Y:M или m:1:Y:M
      const monthMatch = /^m:(-?1):(\d{4}):(\d{1,2})$/.exec(queryData);
      if (monthMatch) {
        const delta = Number(monthMatch[1]);
        const reqYear = Number(monthMatch[2]);
        const reqMonth = Number(monthMatch[3]);
        const shifted = new Date(Date.UTC(reqYear, reqMonth + delta, 1));
        const nextY = shifted.getUTCFullYear();
        const nextM = shifted.getUTCMonth();
        const firstDay = formatDateParts(nextY, nextM, 1);

        const { chatData } = await buildCalendarChatData(
          supabase,
          fromUserId,
          nextY,
          nextM,
          firstDay
        );
        const serialized = JSON.stringify(chatData);

        if (chatId && messageId) {
          await callTelegramApi(botToken, 'editMessageWidgetData', {
            chat_id: chatId,
            message_id: messageId,
            chat_data: serialized,
          });
        }

        await callTelegramApi(botToken, 'answerWidgetQuery', {
          widget_query_id: widgetQueryId,
          data: serialized,
        });
        return res.status(200).json({ ok: true });
      }

      // 1c. Кнопка «+ Напоминание»: add:YYYY-MM-DD
      if (queryData.startsWith('add:')) {
        const dateStr = queryData.slice(4).trim();
        const parsed = parseIsoDate(dateStr);

        await callTelegramApi(botToken, 'answerWidgetQuery', {
          widget_query_id: widgetQueryId,
        });

        if (parsed && chatId) {
          const { couple } = await findUserAndActiveCouple(supabase, fromUserId);
          if (!couple) {
            await callTelegramApi(botToken, 'sendMessage', {
              chat_id: chatId,
              text: 'Сначала создайте или подключите пару в Lovia',
            });
          } else {
            await callTelegramApi(botToken, 'sendMessage', {
              chat_id: chatId,
              text:
                `${FORCE_REPLY_PREFIX}${dateStr} (можно со временем, например: Ужин в 20:00).\n` +
                `ID виджета: ${messageId ?? ''}`,
              reply_markup: {
                force_reply: true,
                selective: true,
              },
            });
          }
        }
        return res.status(200).json({ ok: true });
      }

      await callTelegramApi(botToken, 'answerWidgetQuery', {
        widget_query_id: widgetQueryId,
      });
      return res.status(200).json({ ok: true });
    }

    // =========================================================================
    // 2. Обработка callback_query (проверка подписки и кнопка "📅 Календарь")
    // =========================================================================
    const callbackQuery = update?.callback_query;
    if (callbackQuery) {
      const callbackData: string = callbackQuery.data || '';

      if (callbackData === 'open_calendar') {
        const cbUserId = callbackQuery.from?.id;
        const cbChatId = callbackQuery.message?.chat?.id;
        if (botToken) {
          await callTelegramApi(botToken, 'answerCallbackQuery', {
            callback_query_id: callbackQuery.id,
          });
          if (cbChatId && cbUserId) {
            const supabase = getSupabaseAdmin();
            await sendCalendarWidget(botToken, supabase, cbChatId, cbUserId);
            await trackEvent(`tg_${cbUserId}`, 'bot_calendar_opened', { source: 'inline_button' });
          }
        }
        return res.status(200).json({ ok: true });
      }

      if (callbackData === 'check_subscription' || callbackData.startsWith('check_subscription:')) {
        const userId = callbackQuery.from?.id;
        const chatId = callbackQuery.message?.chat?.id;
        const messageId = callbackQuery.message?.message_id;

        if (botToken && userId) {
          const { subscribed } = await checkChannelSubscription(userId);

          if (subscribed) {
            await callTelegramApi(botToken, 'answerCallbackQuery', {
              callback_query_id: callbackQuery.id,
              text: 'Спасибо за подписку! ❤️',
            });

            const startParam = callbackData.startsWith('check_subscription:')
              ? callbackData.slice('check_subscription:'.length)
              : '';
            const webAppUrl = startParam
              ? `${baseUrl}?startapp=${encodeURIComponent(startParam)}`
              : baseUrl;

            const firstName = callbackQuery.from?.first_name || '';
            const greeting = firstName ? `Привет, ${escapeHtml(firstName)}! ` : 'Привет! ';

            const welcomeText =
              `✨ <b>${greeting}Добро пожаловать в Lovia!</b>\n\n` +
              `Уютное пространство для двоих: совместные напоминания, список желаний, годовщины, памятные даты и фото-альбом свиданий.\n\n` +
              `Бот будет бережно напоминать вам о важных планах за 1 час, а также поздравлять с годовщинами.\n\n` +
              `Нажмите кнопку ниже, чтобы открыть Lovia ❤️`;

            const openMarkup = {
              inline_keyboard: [
                [
                  {
                    text: '✨ Открыть Lovia',
                    web_app: { url: webAppUrl },
                  },
                ],
                [
                  {
                    text: '📅 Календарь',
                    callback_data: 'open_calendar',
                  },
                ],
              ],
            };

            let edited = false;
            if (chatId && messageId) {
              const editJson = await callTelegramApi(botToken, 'editMessageText', {
                chat_id: chatId,
                message_id: messageId,
                text: welcomeText,
                parse_mode: 'HTML',
                reply_markup: openMarkup,
              });
              edited = editJson?.ok === true;
            }

            if (!edited && chatId) {
              await callTelegramApi(botToken, 'sendMessage', {
                chat_id: chatId,
                text: welcomeText,
                parse_mode: 'HTML',
                reply_markup: openMarkup,
              });
            }

            await trackEvent(`tg_${userId}`, 'bot_sub_verified', {
              has_invite_param: Boolean(startParam),
            });
          } else {
            await callTelegramApi(botToken, 'answerCallbackQuery', {
              callback_query_id: callbackQuery.id,
              text: 'Вы ещё не подписались на канал. Подпишитесь и нажмите «Проверить подписку» ещё раз!',
              show_alert: true,
            });
          }
        }

        return res.status(200).json({ ok: true });
      }
    }

    // =========================================================================
    // 3. Обработка текстовых сообщений (ForceReply, /calendar, /start)
    // =========================================================================
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text: string = message?.text || '';
    const fromUser = message?.from;

    // 3a. Ответ пользователя на ForceReply для создания напоминания из виджета
    const replyToText: string = message?.reply_to_message?.text || '';
    if (chatId && fromUser?.id && replyToText.startsWith(FORCE_REPLY_PREFIX)) {
      if (!botToken) {
        return res.status(200).json({ ok: true });
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text: 'Сервис временно недоступен. Попробуйте чуть позже.',
        });
        return res.status(200).json({ ok: true });
      }

      const dateMatch = /на\s+(\d{4}-\d{2}-\d{2})/.exec(replyToText);
      const widgetIdMatch = /ID виджета:\s*(\d+)/.exec(replyToText);
      const dateStr = dateMatch?.[1] || '';
      const parsedDate = parseIsoDate(dateStr);
      const widgetMessageId = widgetIdMatch ? Number(widgetIdMatch[1]) : null;

      if (!parsedDate) {
        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text: 'Не удалось распознать дату напоминания. Откройте /calendar и попробуйте снова.',
        });
        return res.status(200).json({ ok: true });
      }

      const { title, dueTime } = parseReminderInput(text);
      if (!title) {
        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text:
            `${FORCE_REPLY_PREFIX}${dateStr} (укажите текст напоминания, например: Ужин в 20:00).\n` +
            `ID виджета: ${widgetMessageId ?? ''}`,
          reply_markup: { force_reply: true, selective: true },
        });
        return res.status(200).json({ ok: true });
      }

      const { actorId, user, couple } = await findUserAndActiveCouple(supabase, fromUser.id);
      if (!couple) {
        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text: 'Сначала создайте или подключите пару в Lovia',
        });
        return res.status(200).json({ ok: true });
      }

      const forUserId =
        couple.user1_id === actorId ? couple.user2_id || actorId : couple.user1_id;
      const reminderId = `rem-${crypto.randomUUID()}`;

      const { error: insertError } = await supabase.from('reminders').insert({
        id: reminderId,
        couple_id: couple.id,
        title,
        due_date: dateStr,
        due_time: dueTime,
        for_user_id: forUserId,
        created_by_id: actorId,
        status: 'pending',
        priority: 'medium',
      });

      if (insertError) {
        console.error('[telegram/webhook] Failed to insert reminder:', insertError.message);
        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text: 'Не удалось сохранить напоминание. Попробуйте ещё раз чуть позже.',
        });
        return res.status(200).json({ ok: true });
      }

      // Уведомляем партнёра в Telegram (если подключён и включены уведомления)
      const partnerId = couple.user1_id === actorId ? couple.user2_id : couple.user1_id;
      if (partnerId && partnerId !== actorId) {
        const { data: partner } = await supabase
          .from('users')
          .select('id, telegram_id, notifications_enabled')
          .eq('id', partnerId)
          .maybeSingle();

        if (partner?.telegram_id && partner.notifications_enabled !== false) {
          const isFriendship = couple.space_type === 'friendship';
          const senderName =
            user?.name?.trim() ||
            fromUser.first_name?.trim() ||
            (isFriendship ? 'Ваш друг' : 'Ваш партнёр');
          const timeSuffix = dueTime ? ` в ${dueTime}` : '';

          await callTelegramApi(botToken, 'sendMessage', {
            chat_id: partner.telegram_id,
            text:
              `🔔 <b>Новое напоминание в Lovia</b>\n\n` +
              `${escapeHtml(senderName)} добавил(а): <b>${escapeHtml(title)}</b>\n` +
              `📅 ${dateStr}${timeSuffix}`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '✨ Открыть Lovia',
                    web_app: { url: baseUrl },
                  },
                ],
              ],
            },
          });
        }
      }

      // Обновляем исходный HTML-виджет календаря свежим chat_data
      if (widgetMessageId) {
        const { chatData } = await buildCalendarChatData(
          supabase,
          fromUser.id,
          parsedDate.y,
          parsedDate.m,
          dateStr
        );
        await callTelegramApi(botToken, 'editMessageWidgetData', {
          chat_id: chatId,
          message_id: widgetMessageId,
          chat_data: JSON.stringify(chatData),
        });
      }

      await callTelegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text: `✅ Напоминание добавлено на ${dateStr}!`,
      });

      return res.status(200).json({ ok: true });
    }

    // 3b. Команда /calendar
    if (chatId && /^\/calendar(?:@\w+)?(?:\s|$)/i.test(text.trim())) {
      if (!botToken || !fromUser?.id) {
        return res.status(200).json({ ok: true });
      }
      const supabase = getSupabaseAdmin();
      await sendCalendarWidget(botToken, supabase, chatId, fromUser.id);
      await trackEvent(`tg_${fromUser.id}`, 'bot_calendar_opened', { source: 'command' });
      return res.status(200).json({ ok: true });
    }

    // 3c. Команда /start
    if (chatId && text.startsWith('/start')) {
      const startParam = text.replace(/^\/start(?:@\w+)?/i, '').trim();
      const webAppUrl = startParam
        ? `${baseUrl}?startapp=${encodeURIComponent(startParam)}`
        : baseUrl;

      const firstName = fromUser?.first_name || '';
      const greeting = firstName ? `Привет, ${escapeHtml(firstName)}! ` : 'Привет! ';

      if (!botToken) {
        console.warn('[telegram/webhook] TELEGRAM_BOT_TOKEN not configured. Skipped sending message.');
        return res.status(200).json({ ok: true });
      }

      // Проверка обязательной подписки на канал
      const userId = fromUser?.id;
      const { subscribed } = userId ? await checkChannelSubscription(userId) : { subscribed: true };

      if (subscribed) {
        const replyText =
          `✨ <b>${greeting}Добро пожаловать в Lovia!</b>\n\n` +
          `Уютное пространство для двоих: совместные напоминания, список желаний, годовщины, памятные даты и фото-альбом свиданий.\n\n` +
          `Бот будет бережно напоминать вам о важных планах за 1 час, а также поздравлять с годовщинами.\n\n` +
          `Нажмите кнопку ниже, чтобы открыть Lovia ❤️`;

        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text: replyText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✨ Открыть Lovia',
                  web_app: { url: webAppUrl },
                },
              ],
              [
                {
                  text: '📅 Календарь',
                  callback_data: 'open_calendar',
                },
              ],
            ],
          },
        });
      } else {
        const promptText =
          `✨ <b>${greeting}Добро пожаловать в Lovia!</b>\n\n` +
          `Чтобы открыть Lovia, подпишитесь на наш канал — там публикуются обновления, идеи и новости приложения 👇`;

        const channelUrl = getChannelUrl();
        const callbackData =
          startParam && startParam.length <= 40
            ? `check_subscription:${startParam}`
            : 'check_subscription';

        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text: promptText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📢 Подписаться на канал',
                  url: channelUrl,
                },
              ],
              [
                {
                  text: '✅ Проверить подписку',
                  callback_data: callbackData,
                },
              ],
            ],
          },
        });
      }

      if (userId) {
        await trackEvent(`tg_${userId}`, 'bot_start', {
          has_invite_param: Boolean(startParam),
          is_subscribed: subscribed,
        });
      }
    }

    // Всегда возвращаем 200 OK в Telegram, чтобы вебхук не застревал в повторах
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[telegram/webhook] Webhook processing error:', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
}
