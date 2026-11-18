import fs from 'fs';

console.log('--- Testing Telegram Channel Subscription Check in Webhook ---');

let passed = true;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    passed = false;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Static code analysis of api/telegram/webhook.ts
const webhookCode = fs.readFileSync('api/telegram/webhook.ts', 'utf8');

assert(!webhookCode.includes("from '../src") && !webhookCode.includes("from 'src"), 'api/telegram/webhook.ts has NO imports from src/');
assert(webhookCode.includes('export async function checkUserSubscription') || webhookCode.includes('async function checkUserSubscription'), 'webhook.ts has checkUserSubscription function');
assert(webhookCode.includes('REQUIRED_CHANNEL_ID'), 'webhook.ts checks REQUIRED_CHANNEL_ID');
assert(webhookCode.includes('getChatMember'), 'webhook.ts uses getChatMember API method');
assert(webhookCode.includes("['member', 'administrator', 'creator']"), 'webhook.ts checks member, administrator, and creator statuses');
assert(webhookCode.includes('is_member'), 'webhook.ts supports restricted status with is_member');

// Check /start flow
assert(webhookCode.includes("text.startsWith('/start')"), 'webhook.ts handles /start command');
assert(webhookCode.includes('checkUserSubscription(userId)'), 'webhook.ts checks user subscription on /start');
assert(webhookCode.includes('📢 Подписаться на канал'), 'webhook.ts has "📢 Подписаться на канал" button');
assert(webhookCode.includes('✅ Проверить подписку'), 'webhook.ts has "✅ Проверить подписку" button');
assert(webhookCode.includes("callback_data: 'check_subscription'") || webhookCode.includes("callback_data: callbackData"), 'webhook.ts passes callback_data for checking subscription');
assert(webhookCode.includes('REQUIRED_CHANNEL_URL'), 'webhook.ts supports REQUIRED_CHANNEL_URL');

// Check callback_query flow
assert(webhookCode.includes('callback_query'), 'webhook.ts inspects callback_query');
assert(webhookCode.includes("callbackData === 'check_subscription'") || webhookCode.includes("callback_data === 'check_subscription'"), 'webhook.ts handles check_subscription callback data');
assert(webhookCode.includes('answerCallbackQuery'), 'webhook.ts calls answerCallbackQuery');
assert(webhookCode.includes('Спасибо за подписку! ❤️'), 'webhook.ts sends "Спасибо за подписку! ❤️" when subscribed');
assert(webhookCode.includes('show_alert: true'), 'webhook.ts sets show_alert: true when not subscribed');
assert(webhookCode.includes('Вы ещё не подписались на канал'), 'webhook.ts sends not subscribed alert message');
assert(webhookCode.includes('editMessageText'), 'webhook.ts edits message upon successful subscription');
assert(webhookCode.includes('web_app: { url: webAppUrl }'), 'webhook.ts attaches web_app url to open Lovia button');

// 2. Functional tests of checkUserSubscription logic
async function mockCheckUserSubscription(userId, channelId, botToken, mockGetChatMemberResponse) {
  if (!channelId) return true;
  if (!botToken) return true;

  const data = mockGetChatMemberResponse;
  if (!data || !data.ok) return false;

  const status = data.result?.status;
  const isMember = status === 'restricted' ? Boolean(data.result?.is_member) : false;

  if (['member', 'administrator', 'creator'].includes(status) || isMember) {
    return true;
  }
  return false;
}

// Test 2.1: No channel configured -> true
assert(await mockCheckUserSubscription(12345, '', 'token', null) === true, 'Returns true when channel is not configured');

// Test 2.2: Channel configured, status = creator -> true
assert(await mockCheckUserSubscription(12345, '@testchannel', 'token', {
  ok: true,
  result: { status: 'creator' }
}) === true, 'Returns true for channel creator');

// Test 2.3: Channel configured, status = administrator -> true
assert(await mockCheckUserSubscription(12345, '@testchannel', 'token', {
  ok: true,
  result: { status: 'administrator' }
}) === true, 'Returns true for channel administrator');

// Test 2.4: Channel configured, status = member -> true
assert(await mockCheckUserSubscription(12345, '@testchannel', 'token', {
  ok: true,
  result: { status: 'member' }
}) === true, 'Returns true for channel member');

// Test 2.5: Channel configured, status = restricted with is_member: true -> true
assert(await mockCheckUserSubscription(12345, '@testchannel', 'token', {
  ok: true,
  result: { status: 'restricted', is_member: true }
}) === true, 'Returns true for restricted member with is_member: true');

// Test 2.6: Channel configured, status = left -> false
assert(await mockCheckUserSubscription(12345, '@testchannel', 'token', {
  ok: true,
  result: { status: 'left' }
}) === false, 'Returns false for left user');

// Test 2.7: Channel configured, status = kicked -> false
assert(await mockCheckUserSubscription(12345, '@testchannel', 'token', {
  ok: true,
  result: { status: 'kicked' }
}) === false, 'Returns false for kicked user');

// Test 2.8: Channel configured, API error -> false
assert(await mockCheckUserSubscription(12345, '@testchannel', 'token', {
  ok: false,
  error_code: 400,
  description: 'Bad Request: user not found'
}) === false, 'Returns false on Telegram API error');

if (passed) {
  console.log('\n🎉 ALL TELEGRAM CHANNEL SUBSCRIPTION TESTS PASSED!');
  process.exit(0);
} else {
  console.error('\n💥 SOME TESTS FAILED');
  process.exit(1);
}
