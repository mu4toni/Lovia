import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface TelegramUser {
  id: string;
  telegram_id: number | null;
  name: string;
  timezone_offset?: number | null;
  notifications_enabled?: boolean;
}

interface CoupleRecord {
  id: string;
  space_type?: 'relationship' | 'friendship';
  user1_id: string;
  user2_id?: string | null;
  status: string;
  start_date?: string | null;
}

interface ReminderRecord {
  id: string;
  couple_id: string;
  title: string;
  for_user_id?: string | null;
  created_by_id?: string | null;
  status: string;
  due_date?: string | null;
  due_time?: string | null;
}

interface MemorableDateRecord {
  id: string;
  couple_id: string;
  title: string;
  date: string;
  is_annual: boolean;
}

/**
 * Отправка сообщения пользователю через Telegram Bot API
 */
async function sendTelegramMessage(
  chatId: number,
  text: string,
  appUrl: string,
  botToken?: string
): Promise<{ ok: boolean; description?: string }> {
  if (!botToken) {
    console.warn(`[cron/notifications] TELEGRAM_BOT_TOKEN missing. Simulating send to ${chatId}: ${text}`);
    return { ok: true, description: 'Simulated (no bot token)' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Открыть Lovia',
                web_app: { url: appUrl },
              },
            ],
          ],
        },
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.warn(`[cron/notifications] Telegram API error for chat_id ${chatId}:`, data.description);
    }
    return data;
  } catch (err: any) {
    console.error(`[cron/notifications] Network error sending to chat_id ${chatId}:`, err.message);
    return { ok: false, description: err.message };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Проверка авторизации CRON_SECRET
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const authHeader = req.headers.authorization;
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const querySecret = typeof req.query.secret === 'string' ? req.query.secret : null;
    const providedSecret = querySecret || bearerSecret;

    if (providedSecret !== expectedSecret) {
      return res.status(401).json({ success: false, error: 'Unauthorized: invalid CRON_SECRET' });
    }
  }

  // 2. Инициализация прямого подключения к Supabase (без прокси)
  let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    supabaseUrl = 'https://uwbdtisxjzmnzkodiexo.supabase.co';
  }
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'Supabase credentials not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const host = req.headers.host || '';
  const appUrl = process.env.APP_URL || (host ? `https://${host}` : 'https://lovia.app');

  const stats = {
    connectedCouples: 0,
    remindersChecked: 0,
    remindersSent: 0,
    anniversariesChecked: 0,
    anniversariesSent: 0,
    memorableDatesSent: 0,
    errors: [] as string[],
  };

  try {
    // 3. Загрузка активных подключённых пар
    const { data: couples, error: couplesError } = await supabase
      .from('couples')
      .select('*')
      .eq('status', 'connected');

    if (couplesError) {
      throw new Error('Failed to query couples: ' + couplesError.message);
    }

    if (!couples || couples.length === 0) {
      return res.status(200).json({
        ok: true,
        success: true,
        checked: 0,
        sent: 0,
        message: 'No active connected couples found',
        stats,
      });
    }

    stats.connectedCouples = couples.length;
    const coupleIds = couples.map((c: CoupleRecord) => c.id);

    // 4. Загрузка пользователей с telegram_id и включенными уведомлениями
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .not('telegram_id', 'is', null)
      .neq('notifications_enabled', false);

    if (usersError) {
      throw new Error('Failed to query users: ' + usersError.message);
    }

    const usersMap = new Map<string, TelegramUser>();
    for (const u of (users || []) as TelegramUser[]) {
      usersMap.set(u.id, u);
    }

    // 5. Загрузка активных напоминаний с датой
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .in('couple_id', coupleIds)
      .neq('status', 'completed')
      .not('due_date', 'is', null);

    if (remindersError) {
      throw new Error('Failed to query reminders: ' + remindersError.message);
    }

    // 6. Загрузка ежегодных памятных дат
    const { data: memorableDates, error: datesError } = await supabase
      .from('memorable_dates')
      .select('*')
      .in('couple_id', coupleIds)
      .eq('is_annual', true);

    if (datesError) {
      throw new Error('Failed to query memorable_dates: ' + datesError.message);
    }

    // 7. Загрузка уже отправленных логов уведомлений для дедупликации
    const { data: existingLogs } = await supabase
      .from('notification_logs')
      .select('id');

    const sentLogIds = new Set<string>((existingLogs || []).map((l: any) => l.id));

    const newLogsToInsert: Array<{
      id: string;
      user_id: string;
      couple_id: string;
      notification_type: string;
      sent_at: string;
      payload?: any;
    }> = [];

    // ========================================================
    // А) ПРОВЕРКА НАПОМИНАНИЙ ЗА 1 ЧАС (reminder_1h)
    // ========================================================
    const nowMs = Date.now();

    for (const reminder of (reminders || []) as ReminderRecord[]) {
      stats.remindersChecked++;
      if (!reminder.due_date) continue;

      // Извлечение даты и времени
      let dateStr = reminder.due_date;
      if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      }

      let timeStr = reminder.due_time?.trim();
      if (!timeStr && reminder.due_date.includes('T')) {
        const timePart = reminder.due_date.split('T')[1];
        if (timePart && timePart.length >= 5) {
          timeStr = timePart.substring(0, 5);
        }
      }

      // Напоминание за 1 час проверяется ТОЛЬКО если указано точное время
      if (!timeStr || !timeStr.includes(':')) continue;

      const [hourStr, minStr] = timeStr.split(':');
      const eventHour = parseInt(hourStr, 10);
      const eventMinute = parseInt(minStr, 10);
      if (isNaN(eventHour) || isNaN(eventMinute)) continue;

      const [yStr, mStr, dStr] = dateStr.split('-');
      const eventYear = parseInt(yStr, 10);
      const eventMonth = parseInt(mStr, 10);
      const eventDay = parseInt(dStr, 10);
      if (isNaN(eventYear) || isNaN(eventMonth) || isNaN(eventDay)) continue;

      const couple = couples.find((c: CoupleRecord) => c.id === reminder.couple_id);
      if (!couple) continue;

      // Определение целевых пользователей для напоминания
      const targetUserIds: string[] = [];
      const forUser = reminder.for_user_id;

      if (!forUser || forUser === 'all' || forUser === 'both' || forUser === 'common') {
        if (couple.user1_id) targetUserIds.push(couple.user1_id);
        if (couple.user2_id) targetUserIds.push(couple.user2_id);
      } else if (forUser === 'user-self') {
        if (reminder.created_by_id) targetUserIds.push(reminder.created_by_id);
      } else if (forUser === 'user-partner') {
        if (couple.user1_id && reminder.created_by_id === couple.user1_id && couple.user2_id) {
          targetUserIds.push(couple.user2_id);
        } else if (couple.user1_id) {
          targetUserIds.push(couple.user1_id);
        }
      } else {
        targetUserIds.push(forUser);
      }

      for (const userId of targetUserIds) {
        const user = usersMap.get(userId);
        if (!user || !user.telegram_id || user.notifications_enabled === false) continue;

        // Расчёт времени события с учётом timezone_offset пользователя (в минутах, например 180 для UTC+3)
        const userOffsetMin = typeof user.timezone_offset === 'number' ? user.timezone_offset : 0;
        // eventUtcMs = время события в UTC
        const eventUtcMs = Date.UTC(eventYear, eventMonth - 1, eventDay, eventHour, eventMinute, 0) - userOffsetMin * 60 * 1000;
        const diffMinutes = (eventUtcMs - nowMs) / (60 * 1000);

        // Если до наступления события осталось от 0 до 65 минут (окно за 1 час)
        if (diffMinutes > 0 && diffMinutes <= 65) {
          const logId = `rem1h_${reminder.id}_${user.id}_${dateStr}_${timeStr}`;

          if (sentLogIds.has(logId)) {
            continue; // Уже отправлено строго 1 раз
          }

          const messageText = `⏰ Через час: «<b>${reminder.title}</b>» (${timeStr})`;
          const sendResult = await sendTelegramMessage(user.telegram_id, messageText, appUrl, botToken);

          if (sendResult.ok) {
            sentLogIds.add(logId);
            stats.remindersSent++;
            newLogsToInsert.push({
              id: logId,
              user_id: user.id,
              couple_id: couple.id,
              notification_type: 'reminder_1h',
              sent_at: new Date().toISOString(),
              payload: { reminder_id: reminder.id, title: reminder.title, due_date: dateStr, due_time: timeStr },
            });
          } else {
            stats.errors.push(`Reminder error (${user.id}): ${sendResult.description}`);
          }
        }
      }
    }

    // ========================================================
    // Б) ПРОВЕРКА ГОДОВЩИН И ЕЖЕГОДНЫХ ПАМЯТНЫХ ДАТ
    // ========================================================
    for (const couple of (couples as CoupleRecord[])) {
      stats.anniversariesChecked++;
      const coupleUsers: TelegramUser[] = [];
      if (couple.user1_id && usersMap.has(couple.user1_id)) {
        coupleUsers.push(usersMap.get(couple.user1_id)!);
      }
      if (couple.user2_id && usersMap.has(couple.user2_id)) {
        coupleUsers.push(usersMap.get(couple.user2_id)!);
      }

      for (const user of coupleUsers) {
        if (!user.telegram_id || user.notifications_enabled === false) continue;

        // Вычисление текущего местного времени и даты пользователя
        const userOffsetMin = typeof user.timezone_offset === 'number' ? user.timezone_offset : 0;
        const userLocalNow = new Date(nowMs + userOffsetMin * 60 * 1000);

        const localHour = userLocalNow.getUTCHours();
        const localYear = userLocalNow.getUTCFullYear();
        const localMonth = userLocalNow.getUTCMonth(); // 0-based
        const localDay = userLocalNow.getUTCDate();

        // Отправка утренних/дневных поздравлений ТОЛЬКО в дневное окно (09:00 - 21:00)
        if (localHour < 9 || localHour >= 21) {
          continue;
        }

        const userTodayMidnightUtc = Date.UTC(localYear, localMonth, localDay);
        const isFriendship = couple.space_type === 'friendship';

        // ----------------------------------------------------
        // Б.1. Годовщина отношений / дружбы (couple.start_date)
        // ----------------------------------------------------
        if (couple.start_date) {
          const [sYStr, sMStr, sDStr] = couple.start_date.split('-');
          const startYear = parseInt(sYStr, 10);
          const startMonth = parseInt(sMStr, 10);
          const startDay = parseInt(sDStr, 10);

          if (!isNaN(startYear) && !isNaN(startMonth) && !isNaN(startDay)) {
            // Проверяем годовщину в текущем календарном году
            let targetYear = localYear;
            let annivDateUtc = Date.UTC(targetYear, startMonth - 1, startDay);
            let daysUntil = Math.round((annivDateUtc - userTodayMidnightUtc) / (24 * 60 * 60 * 1000));
            let yearsTogether = targetYear - startYear;

            // Если годовщина этого года уже прошла, проверяем годовщину следующего года (например, за 7 дней в конце декабря)
            if (daysUntil < 0) {
              targetYear = localYear + 1;
              annivDateUtc = Date.UTC(targetYear, startMonth - 1, startDay);
              daysUntil = Math.round((annivDateUtc - userTodayMidnightUtc) / (24 * 60 * 60 * 1000));
              yearsTogether = targetYear - startYear;
            }

            // Начиная строго с 1-й годовщины (не 0-й день создания пары)
            if (yearsTogether >= 1) {
              // 1) За 7 дней (за неделю)
              if (daysUntil === 7) {
                const logId = `anniv_7d_${couple.id}_${user.id}_${targetYear}`;
                if (!sentLogIds.has(logId)) {
                  const text = isFriendship
                    ? `✨ Через неделю у вас ${yearsTogether}-я годовщина дружбы!`
                    : `💐 Через неделю у вас ${yearsTogether}-я годовщина отношений! Самое время подготовить сюрприз.`;

                  const res = await sendTelegramMessage(user.telegram_id, text, appUrl, botToken);
                  if (res.ok) {
                    sentLogIds.add(logId);
                    stats.anniversariesSent++;
                    newLogsToInsert.push({
                      id: logId,
                      user_id: user.id,
                      couple_id: couple.id,
                      notification_type: 'anniversary_7d',
                      sent_at: new Date().toISOString(),
                      payload: { target_year: targetYear, years_together: yearsTogether },
                    });
                  } else {
                    stats.errors.push(`Anniv 7d error (${user.id}): ${res.description}`);
                  }
                }
              }

              // 2) За 1 день (завтра)
              if (daysUntil === 1) {
                const logId = `anniv_1d_${couple.id}_${user.id}_${targetYear}`;
                if (!sentLogIds.has(logId)) {
                  const text = isFriendship
                    ? `⏳ Уже завтра — ${yearsTogether}-я годовщина дружбы!`
                    : `⏳ Уже завтра — ${yearsTogether}-я годовщина отношений!`;

                  const res = await sendTelegramMessage(user.telegram_id, text, appUrl, botToken);
                  if (res.ok) {
                    sentLogIds.add(logId);
                    stats.anniversariesSent++;
                    newLogsToInsert.push({
                      id: logId,
                      user_id: user.id,
                      couple_id: couple.id,
                      notification_type: 'anniversary_1d',
                      sent_at: new Date().toISOString(),
                      payload: { target_year: targetYear, years_together: yearsTogether },
                    });
                  } else {
                    stats.errors.push(`Anniv 1d error (${user.id}): ${res.description}`);
                  }
                }
              }

              // 3) В сам день годовщины
              if (daysUntil === 0) {
                const logId = `anniv_0d_${couple.id}_${user.id}_${targetYear}`;
                if (!sentLogIds.has(logId)) {
                  const text = `🎉 Поздравляем с ${yearsTogether}-й годовщиной! Загляните в Lovia — вас ждёт праздничный салют!`;

                  const res = await sendTelegramMessage(user.telegram_id, text, appUrl, botToken);
                  if (res.ok) {
                    sentLogIds.add(logId);
                    stats.anniversariesSent++;
                    newLogsToInsert.push({
                      id: logId,
                      user_id: user.id,
                      couple_id: couple.id,
                      notification_type: 'anniversary_0d',
                      sent_at: new Date().toISOString(),
                      payload: { target_year: targetYear, years_together: yearsTogether },
                    });
                  } else {
                    stats.errors.push(`Anniv 0d error (${user.id}): ${res.description}`);
                  }
                }
              }
            }
          }
        }

        // ----------------------------------------------------
        // Б.2. Ежегодные памятные даты (memorable_dates)
        // ----------------------------------------------------
        const coupleDates = (memorableDates || []).filter(
          (m: MemorableDateRecord) => m.couple_id === couple.id
        ) as MemorableDateRecord[];

        for (const mDate of coupleDates) {
          const [mYStr, mMStr, mDStr] = mDate.date.split('-');
          const mMonth = parseInt(mMStr, 10);
          const mDay = parseInt(mDStr, 10);
          if (isNaN(mMonth) || isNaN(mDay)) continue;

          let targetYear = localYear;
          let eventDateUtc = Date.UTC(targetYear, mMonth - 1, mDay);
          let daysUntil = Math.round((eventDateUtc - userTodayMidnightUtc) / (24 * 60 * 60 * 1000));

          if (daysUntil < 0) {
            targetYear = localYear + 1;
            eventDateUtc = Date.UTC(targetYear, mMonth - 1, mDay);
            daysUntil = Math.round((eventDateUtc - userTodayMidnightUtc) / (24 * 60 * 60 * 1000));
          }

          // 1) За 7 дней
          if (daysUntil === 7) {
            const logId = `memdate_7d_${mDate.id}_${user.id}_${targetYear}`;
            if (!sentLogIds.has(logId)) {
              const text = `💐 Через неделю памятная дата: «<b>${mDate.title}</b>»!`;
              const res = await sendTelegramMessage(user.telegram_id, text, appUrl, botToken);
              if (res.ok) {
                sentLogIds.add(logId);
                stats.memorableDatesSent++;
                newLogsToInsert.push({
                  id: logId,
                  user_id: user.id,
                  couple_id: couple.id,
                  notification_type: 'memdate_7d',
                  sent_at: new Date().toISOString(),
                  payload: { date_id: mDate.id, title: mDate.title, target_year: targetYear },
                });
              } else {
                stats.errors.push(`Memdate 7d error (${user.id}): ${res.description}`);
              }
            }
          }

          // 2) За 1 день
          if (daysUntil === 1) {
            const logId = `memdate_1d_${mDate.id}_${user.id}_${targetYear}`;
            if (!sentLogIds.has(logId)) {
              const text = `⏳ Уже завтра памятная дата: «<b>${mDate.title}</b>»!`;
              const res = await sendTelegramMessage(user.telegram_id, text, appUrl, botToken);
              if (res.ok) {
                sentLogIds.add(logId);
                stats.memorableDatesSent++;
                newLogsToInsert.push({
                  id: logId,
                  user_id: user.id,
                  couple_id: couple.id,
                  notification_type: 'memdate_1d',
                  sent_at: new Date().toISOString(),
                  payload: { date_id: mDate.id, title: mDate.title, target_year: targetYear },
                });
              } else {
                stats.errors.push(`Memdate 1d error (${user.id}): ${res.description}`);
              }
            }
          }

          // 3) В день памятной даты
          if (daysUntil === 0) {
            const logId = `memdate_0d_${mDate.id}_${user.id}_${targetYear}`;
            if (!sentLogIds.has(logId)) {
              const text = `🎉 Сегодня памятная дата: «<b>${mDate.title}</b>»!`;
              const res = await sendTelegramMessage(user.telegram_id, text, appUrl, botToken);
              if (res.ok) {
                sentLogIds.add(logId);
                stats.memorableDatesSent++;
                newLogsToInsert.push({
                  id: logId,
                  user_id: user.id,
                  couple_id: couple.id,
                  notification_type: 'memdate_0d',
                  sent_at: new Date().toISOString(),
                  payload: { date_id: mDate.id, title: mDate.title, target_year: targetYear },
                });
              } else {
                stats.errors.push(`Memdate 0d error (${user.id}): ${res.description}`);
              }
            }
          }
        }
      }
    }

    // 8. Сохранение новых записей логов в public.notification_logs
    if (newLogsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('notification_logs')
        .insert(newLogsToInsert);

      if (insertError) {
        console.error('[cron/notifications] Failed to insert notification logs:', insertError);
        stats.errors.push('Insert logs error: ' + insertError.message);
      }
    }

    return res.status(200).json({
      ok: true,
      success: true,
      checked: stats.remindersChecked + stats.anniversariesChecked,
      sent: stats.remindersSent + stats.anniversariesSent + stats.memorableDatesSent,
      stats,
    });
  } catch (err: any) {
    console.error('[cron/notifications] Critical execution error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal notification processing error',
      stats,
    });
  }
}
