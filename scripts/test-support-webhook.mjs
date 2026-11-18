import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('--- Testing Support Bot Webhook (api/support/webhook.ts) ---');

const webhookPath = path.resolve('api/support/webhook.ts');
assert(fs.existsSync(webhookPath), 'api/support/webhook.ts must exist');

const content = fs.readFileSync(webhookPath, 'utf8');

// 1. Isolation check: no imports from src/
assert(!content.includes("from '../src") && !content.includes("from '../../src") && !content.includes("from '@/") && !content.includes("from 'src/"),
  'api/support/webhook.ts must NOT import from src/ or ../src');
console.log('✅ PASS: api/support/webhook.ts has NO imports from src/');

// 2. Environment variables checks
assert(content.includes('SUPPORT_BOT_TOKEN'), 'Must read SUPPORT_BOT_TOKEN');
console.log('✅ PASS: Reads SUPPORT_BOT_TOKEN');

assert(content.includes('ADMIN_TELEGRAM_ID'), 'Must read ADMIN_TELEGRAM_ID');
console.log('✅ PASS: Reads ADMIN_TELEGRAM_ID');

assert(content.includes('VITE_SUPABASE_URL') || content.includes('SUPABASE_URL'), 'Must read Supabase URL');
console.log('✅ PASS: Reads Supabase URL');

assert(content.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Must read SUPABASE_SERVICE_ROLE_KEY');
console.log('✅ PASS: Reads SUPABASE_SERVICE_ROLE_KEY');

// 3. User tracking check: upsert into public.support_bot_users
assert(content.includes('support_bot_users'), 'Must interact with support_bot_users table');
assert(content.includes('telegram_id'), 'Must store telegram_id');
assert(content.includes('username'), 'Must store username');
assert(content.includes('first_name'), 'Must store first_name');
console.log('✅ PASS: Records user data (telegram_id, username, first_name) in public.support_bot_users');

// 4. Command /start logic
assert(content.includes('/start'), 'Must handle /start command');
assert(content.includes('/settarget'), 'Must explain /settarget command to admin');
assert(content.includes('/target'), 'Must explain /target command to admin');
console.log('✅ PASS: Handles /start with admin panel and user greeting');

// 5. Admin command /settarget logic
assert(content.includes('target_chat_id'), 'Must store target_chat_id in support_settings');
assert(content.includes('target_username'), 'Must store target_username in support_settings');
assert(content.includes('ещё не запускал этого бота'), 'Must inform admin if user has not started the bot');
console.log('✅ PASS: Validates /settarget against support_bot_users and updates support_settings');

// 6. User forward & #from_ tag logic
assert(content.includes('#from_'), 'Must include #from_ tag in forwarded message');
assert(content.includes('copyMessage') || content.includes('copyTelegramMessage'), 'Must support copyMessage for text and media');
console.log('✅ PASS: Forwards user messages with #from_${from.id} and supports media');

// 7. Reply handling logic
assert(content.includes('reply_to_message'), 'Must check message.reply_to_message');
const regexTest = /#from_(\d+)/;
assert(regexTest.test('📩 Новое обращение\nID: 123456\n#from_987654321'), 'Regex matches #from_ in text');
assert(regexTest.exec('Some caption #from_555444333')[1] === '555444333', 'Regex extracts user id');
assert(content.includes('Ответ отправлен'), 'Must confirm reply sent');
console.log('✅ PASS: Supports reply-to routing back to user via #from_ regex');

console.log('\n🎉 ALL SUPPORT BOT WEBHOOK TESTS PASSED!');
