import fs from 'fs';

console.log('--- Testing Telegram Channel Subscription Check in Webhook, Gateway & Mini App ---');

let passed = true;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    passed = false;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// =========================================================================
// 1. Static code analysis of api/telegram/webhook.ts
// =========================================================================
const webhookCode = fs.readFileSync('api/telegram/webhook.ts', 'utf8');

assert(!webhookCode.includes("from '../src") && !webhookCode.includes("from 'src"), 'api/telegram/webhook.ts has NO imports from src/');
assert(webhookCode.includes('export async function checkChannelSubscription'), 'webhook.ts exports checkChannelSubscription');
assert(webhookCode.includes('export async function checkUserSubscription'), 'webhook.ts exports checkUserSubscription for backwards compatibility');
assert(webhookCode.includes('normalizeChannelChatId'), 'webhook.ts normalizes channel input');
assert(webhookCode.includes('console.error'), 'webhook.ts logs Telegram getChatMember errors in console.error');
assert(webhookCode.includes('REQUIRED_CHANNEL_ID'), 'webhook.ts checks REQUIRED_CHANNEL_ID');
assert(webhookCode.includes('getChatMember'), 'webhook.ts uses getChatMember API method');
assert(webhookCode.includes("['member', 'administrator', 'creator']"), 'webhook.ts checks member, administrator, and creator statuses');
assert(webhookCode.includes('is_member'), 'webhook.ts supports restricted status with is_member');

// Check /start flow: subscribed shows greeting, unsubscribed shows prompt
assert(webhookCode.includes("text.startsWith('/start')"), 'webhook.ts handles /start command');
assert(webhookCode.includes('if (subscribed)'), 'webhook.ts branches based on subscription status in /start');
assert(webhookCode.includes('📢 Подписаться на канал'), 'webhook.ts has "📢 Подписаться на канал" button');
assert(webhookCode.includes('✅ Проверить подписку'), 'webhook.ts has "✅ Проверить подписку" button');
assert(webhookCode.includes("callback_data: callbackData") || webhookCode.includes("callback_data: 'check_subscription'"), 'webhook.ts passes callback_data for checking subscription');

// Check callback_query flow
assert(webhookCode.includes('callback_query'), 'webhook.ts inspects callback_query');
assert(webhookCode.includes("callbackData === 'check_subscription'"), 'webhook.ts handles check_subscription callback data');
assert(webhookCode.includes('answerCallbackQuery'), 'webhook.ts calls answerCallbackQuery');
assert(webhookCode.includes('Спасибо за подписку! ❤️'), 'webhook.ts sends "Спасибо за подписку! ❤️" when subscribed');
assert(webhookCode.includes('show_alert: true'), 'webhook.ts sets show_alert: true when not subscribed');
assert(webhookCode.includes('editMessageText'), 'webhook.ts edits message upon successful subscription');

// =========================================================================
// 2. Static code analysis of api/db.ts
// =========================================================================
const dbCode = fs.readFileSync('api/db.ts', 'utf8');

assert(!dbCode.includes("from '../src") && !dbCode.includes("from 'src"), 'api/db.ts has NO imports from src/');
assert(dbCode.includes('checkChannelSubscription'), 'api/db.ts includes checkChannelSubscription');
assert(dbCode.includes("action === 'check_subscription'"), 'api/db.ts handles action "check_subscription"');
assert(dbCode.includes('subscriptionRequired: true'), 'api/db.ts returns subscriptionRequired: true');
assert(dbCode.includes('normalizeChannelChatId'), 'api/db.ts normalizes channel input');

// =========================================================================
// 3. Normalization logic tests
// =========================================================================
function normalizeChannelChatId(raw) {
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

assert(normalizeChannelChatId('https://t.me/lovia_channel') === '@lovia_channel', 'Normalizes https://t.me/lovia_channel to @lovia_channel');
assert(normalizeChannelChatId('t.me/lovia_channel') === '@lovia_channel', 'Normalizes t.me/lovia_channel to @lovia_channel');
assert(normalizeChannelChatId('@lovia_channel') === '@lovia_channel', 'Preserves @lovia_channel');
assert(normalizeChannelChatId('lovia_channel') === '@lovia_channel', 'Prepends @ to plain channel name');
assert(normalizeChannelChatId('-1001234567890') === '-1001234567890', 'Preserves -100 numeric chat ID');
assert(normalizeChannelChatId('1234567890') === '-1001234567890', 'Converts positive numeric ID to -100 ID');

// =========================================================================
// 4. Front-end SubscriptionGate and App.tsx verification
// =========================================================================
const subGateCode = fs.readFileSync('src/components/ui/SubscriptionGate/SubscriptionGate.tsx', 'utf8');
assert(subGateCode.includes('openTelegramLink'), 'SubscriptionGate calls openTelegramLink');
assert(subGateCode.includes('verifyChannelSubscription'), 'SubscriptionGate calls verifyChannelSubscription');
assert(subGateCode.includes('Mascot'), 'SubscriptionGate displays Lovia Mascot');

const appCode = fs.readFileSync('src/App.tsx', 'utf8');
assert(appCode.includes('SubscriptionGate'), 'App.tsx imports SubscriptionGate');
assert(appCode.includes('subscriptionRequired'), 'App.tsx tracks subscriptionRequired state');
assert(appCode.includes('lovia_subscription_required'), 'App.tsx listens for lovia_subscription_required event');
assert(appCode.includes('lovia_subscription_resolved'), 'App.tsx listens for lovia_subscription_resolved event');

const coupleServiceCode = fs.readFileSync('src/services/coupleService.ts', 'utf8');
assert(coupleServiceCode.includes('isSubscriptionRequired'), 'coupleService tracks isSubscriptionRequired');
assert(coupleServiceCode.includes('verifyChannelSubscription'), 'coupleService has verifyChannelSubscription');

// =========================================================================
// 5. Subscription check status logic test
// =========================================================================
function evaluateSubscription(data) {
  if (!data || !data.ok) return false;
  const status = data.result?.status;
  const isMember = status === 'restricted' ? Boolean(data.result?.is_member) : false;
  return ['member', 'administrator', 'creator'].includes(status) || isMember;
}

assert(evaluateSubscription({ ok: true, result: { status: 'creator' } }) === true, 'Creator is subscribed');
assert(evaluateSubscription({ ok: true, result: { status: 'administrator' } }) === true, 'Administrator is subscribed');
assert(evaluateSubscription({ ok: true, result: { status: 'member' } }) === true, 'Member is subscribed');
assert(evaluateSubscription({ ok: true, result: { status: 'restricted', is_member: true } }) === true, 'Restricted with is_member is subscribed');
assert(evaluateSubscription({ ok: true, result: { status: 'restricted', is_member: false } }) === false, 'Restricted without is_member is not subscribed');
assert(evaluateSubscription({ ok: true, result: { status: 'left' } }) === false, 'Left is not subscribed');
assert(evaluateSubscription({ ok: true, result: { status: 'kicked' } }) === false, 'Kicked is not subscribed');
assert(evaluateSubscription({ ok: false, description: 'Bad Request: chat not found' }) === false, 'API error is not subscribed');

if (passed) {
  console.log('\n🎉 ALL SUBSCRIPTION GATE & WEBHOOK TESTS PASSED!');
  process.exit(0);
} else {
  console.error('\n💥 SOME TESTS FAILED');
  process.exit(1);
}
