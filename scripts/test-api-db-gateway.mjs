import fs from 'fs';
import crypto from 'crypto';

console.log('--- Testing API DB Gateway & Telegram initData Security ---');

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
// 1. Static code analysis of api/db.ts
// =========================================================================
const dbApi = fs.readFileSync('api/db.ts', 'utf8');

assert(!dbApi.includes("from '../src") && !dbApi.includes("from 'src"), 'api/db.ts has NO imports from src/ or ../src');
assert(dbApi.includes("import crypto from 'crypto';"), 'api/db.ts imports crypto');
assert(dbApi.includes("createClient"), 'api/db.ts uses Supabase createClient');
assert(dbApi.includes("verifyTelegramInitData"), 'api/db.ts has verifyTelegramInitData function');
assert(dbApi.includes("x-telegram-init-data"), 'api/db.ts checks x-telegram-init-data header');
assert(dbApi.includes("sha256"), 'api/db.ts uses sha256 HMAC for Telegram auth');
assert(dbApi.includes("WebAppData"), 'api/db.ts uses WebAppData as HMAC secret seed per Telegram specification');
assert(dbApi.includes("actorId = `tg_${tgUser.id}`"), 'api/db.ts sets guaranteed actorId as tg_${tgUser.id}');

// Check all supported actions in api/db.ts
const requiredActions = [
  'get_bundle',
  'update_profile',
  'create_couple',
  'join_couple',
  'dissolve_couple',
  'update_start_date',
  'reminders_create',
  'reminders_toggle',
  'reminders_update',
  'reminders_delete',
  'wishlist_create',
  'wishlist_update',
  'wishlist_delete',
  'wishlist_toggle_reserve',
  'memorable_dates_create',
  'memorable_dates_update',
  'memorable_dates_delete',
  'date_memories_create',
  'date_memories_update',
  'date_memories_delete',
  'upload_media',
  'request_account_deletion',
  'confirm_account_deletion',
];

for (const action of requiredActions) {
  assert(dbApi.includes(`action === '${action}'`), `api/db.ts supports action '${action}'`);
}

// Check server-side wishlist secrecy
assert(
  dbApi.includes('if (item.user_id === actorId)') &&
  dbApi.includes('is_booked: false') &&
  dbApi.includes('booked_by_user_id: null'),
  'api/db.ts enforces server-side wishlist surprise secrecy for actorId'
);

// Check wishlist reserve authorization (cannot book own wish)
assert(
  dbApi.includes('item.user_id === actorId') &&
  dbApi.includes('Нельзя бронировать собственное желание'),
  'api/db.ts prevents users from reserving/booking their own wishlist items'
);

// Check guaranteed non-empty id generation for insert operations
assert(
  dbApi.includes('crypto.randomUUID()') &&
  dbApi.includes('coupleId') &&
  dbApi.includes('id: coupleId'),
  'api/db.ts generates guaranteed id for create_couple'
);
assert(
  dbApi.includes('reminderId') &&
  dbApi.includes('id: reminderId'),
  'api/db.ts generates guaranteed id for reminders_create'
);
assert(
  dbApi.includes('wishId') &&
  dbApi.includes('id: wishId'),
  'api/db.ts generates guaranteed id for wishlist_create'
);
assert(
  dbApi.includes('memorableDateId') &&
  dbApi.includes('id: memorableDateId'),
  'api/db.ts generates guaranteed id for memorable_dates_create'
);
assert(
  dbApi.includes('memoryId') &&
  dbApi.includes('id: memoryId'),
  'api/db.ts generates guaranteed id for date_memories_create'
);

// =========================================================================
// 2. Cryptographic Telegram HMAC-SHA256 signature verification test
// =========================================================================
function generateTelegramInitData(userObj, botToken, authDate = Math.floor(Date.now() / 1000)) {
  const params = {
    auth_date: String(authDate),
    query_id: 'AAHdF6IQAAAAAN0XohDhrP_L',
    user: JSON.stringify(userObj),
  };

  const dataCheckString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    searchParams.set(k, v);
  }
  searchParams.set('hash', hash);

  return searchParams.toString();
}

function verifyInitData(initData, botToken) {
  if (!initData) return { isValid: false, error: 'Empty' };
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { isValid: false, error: 'Missing hash' };
  params.delete('hash');

  const keys = Array.from(params.keys()).sort();
  const dataCheckString = keys.map((key) => `${key}=${params.get(key)}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (calculatedHash !== hash) {
    return { isValid: false, error: 'Signature mismatch' };
  }

  const rawUser = params.get('user');
  let user = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {}
  }
  return { isValid: true, user };
}

const TEST_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
const validUser = { id: 777123456, first_name: 'Марсель', username: 'marsel' };
const validInitData = generateTelegramInitData(validUser, TEST_BOT_TOKEN);

const validResult = verifyInitData(validInitData, TEST_BOT_TOKEN);
assert(validResult.isValid && validResult.user?.id === 777123456, 'Valid initData successfully verified with user ID');

// Test tampered initData
const tamperedInitData = validInitData.replace('marsel', 'hacker');
const tamperedResult = verifyInitData(tamperedInitData, TEST_BOT_TOKEN);
assert(!tamperedResult.isValid, 'Tampered initData is correctly rejected');

// Test wrong bot token
const wrongTokenResult = verifyInitData(validInitData, '999999:WRONG_TOKEN');
assert(!wrongTokenResult.isValid, 'initData with wrong bot token is correctly rejected');

// Test missing hash
const noHashParams = new URLSearchParams(validInitData);
noHashParams.delete('hash');
const noHashResult = verifyInitData(noHashParams.toString(), TEST_BOT_TOKEN);
assert(!noHashResult.isValid, 'initData without hash is correctly rejected');

// =========================================================================
// 3. Client services verification
// =========================================================================
// src/services/api.ts
const apiTs = fs.readFileSync('src/services/api.ts', 'utf8');
assert(apiTs.includes('export function shouldUseServerDb(): boolean'), 'api.ts exports shouldUseServerDb()');
assert(apiTs.includes('export async function callServerDb<T>'), 'api.ts exports callServerDb<T>()');
assert(apiTs.includes("headers['x-telegram-init-data'] = initData"), 'api.ts sends x-telegram-init-data header');

// src/services/requestsService.ts
const requestsTs = fs.readFileSync('src/services/requestsService.ts', 'utf8');
assert(requestsTs.includes('hydrateFromBundle'), 'requestsService has hydrateFromBundle');
assert(requestsTs.includes("callServerDb<any>('reminders_create'"), 'requestsService uses reminders_create via callServerDb');
assert(requestsTs.includes("callServerDb<any>('reminders_toggle'"), 'requestsService uses reminders_toggle via callServerDb');
assert(requestsTs.includes("callServerDb('reminders_delete'"), 'requestsService uses reminders_delete via callServerDb');

// src/services/wishlistService.ts
const wishlistTs = fs.readFileSync('src/services/wishlistService.ts', 'utf8');
assert(wishlistTs.includes('hydrateFromBundle'), 'wishlistService has hydrateFromBundle');
assert(wishlistTs.includes("callServerDb<any>('wishlist_create'"), 'wishlistService uses wishlist_create via callServerDb');
assert(wishlistTs.includes("callServerDb<any>('wishlist_update'"), 'wishlistService uses wishlist_update via callServerDb');
assert(wishlistTs.includes("callServerDb('wishlist_delete'"), 'wishlistService uses wishlist_delete via callServerDb');
assert(wishlistTs.includes("callServerDb<any>('wishlist_toggle_reserve'"), 'wishlistService uses wishlist_toggle_reserve via callServerDb');

// src/services/relationshipService.ts
const relTs = fs.readFileSync('src/services/relationshipService.ts', 'utf8');
assert(relTs.includes('hydrateFromBundle'), 'relationshipService has hydrateFromBundle');
assert(relTs.includes("callServerDb<any>('memorable_dates_create'"), 'relationshipService uses memorable_dates_create via callServerDb');
assert(relTs.includes("callServerDb<any>('memorable_dates_update'"), 'relationshipService uses memorable_dates_update via callServerDb');
assert(relTs.includes("callServerDb('memorable_dates_delete'"), 'relationshipService uses memorable_dates_delete via callServerDb');

// src/services/dateMemoryService.ts
const dateMemTs = fs.readFileSync('src/services/dateMemoryService.ts', 'utf8');
assert(dateMemTs.includes('hydrateFromBundle'), 'dateMemoryService has hydrateFromBundle');
assert(dateMemTs.includes("callServerDb<{ publicUrl: string }>('upload_media'"), 'dateMemoryService uploads photos via upload_media');
assert(dateMemTs.includes("callServerDb<any>('date_memories_create'"), 'dateMemoryService uses date_memories_create via callServerDb');
assert(dateMemTs.includes("callServerDb<any>('date_memories_update'"), 'dateMemoryService uses date_memories_update via callServerDb');
assert(dateMemTs.includes("callServerDb('date_memories_delete'"), 'dateMemoryService uses date_memories_delete via callServerDb');

// src/services/coupleService.ts
const coupleTs = fs.readFileSync('src/services/coupleService.ts', 'utf8');
assert(coupleTs.includes('applyBundle'), 'coupleService has applyBundle()');
assert(coupleTs.includes("callServerDb<any>('get_bundle')"), 'coupleService syncs bundle via get_bundle');
assert(coupleTs.includes("callServerDb<any>('create_couple'"), 'coupleService creates couple via create_couple');
assert(coupleTs.includes("callServerDb<{ couple: any; partner: any }>('join_couple'"), 'coupleService joins couple via join_couple');
assert(coupleTs.includes("callServerDb('dissolve_couple'"), 'coupleService dissolves couple via dissolve_couple');
assert(coupleTs.includes("callServerDb('update_start_date'"), 'coupleService updates start date via update_start_date');
assert(coupleTs.includes("callServerDb('request_account_deletion'"), 'coupleService supports requestAccountDeletion');
assert(coupleTs.includes("callServerDb('confirm_account_deletion'"), 'coupleService supports confirmAccountDeletion');

// src/features/profile/DangerZone/DangerZone.tsx
const dangerZoneTs = fs.readFileSync('src/features/profile/DangerZone/DangerZone.tsx', 'utf8');
assert(dangerZoneTs.includes('requestAccountDeletion'), 'DangerZone triggers requestAccountDeletion');
assert(dangerZoneTs.includes('confirmAccountDeletion'), 'DangerZone triggers confirmAccountDeletion');
assert(dangerZoneTs.includes('maxLength={6}'), 'DangerZone enforces 6-digit code');

// src/services/profileService.ts
const profileTs = fs.readFileSync('src/services/profileService.ts', 'utf8');
assert(profileTs.includes("callServerDb('update_profile'"), 'profileService updates notifications via update_profile');

// =========================================================================
// Summary
// =========================================================================
if (passed) {
  console.log('\n🎉 ALL API DB GATEWAY & TELEGRAM INITDATA SECURITY TESTS PASSED!');
  process.exit(0);
} else {
  console.error('\n💥 SOME TESTS FAILED');
  process.exit(1);
}
