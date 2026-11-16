import fs from 'fs';
import path from 'path';

console.log('--- Testing Unified Partner Notifications, Scraper & Cron ---');

let passed = true;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    passed = false;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Check Toast.css for safe area calc
const toastCss = fs.readFileSync('src/components/ui/Toast/Toast.css', 'utf8');
assert(
  toastCss.includes('top: calc(12px + var(--tg-total-top-inset, env(safe-area-inset-top, 0px)));'),
  'Toast.css has proper top inset with --tg-total-top-inset'
);

// 2. Check api/scrape-product.ts is self-contained (NO src/ imports)
const scraperApi = fs.readFileSync('api/scrape-product.ts', 'utf8');
assert(!scraperApi.includes("from '../src"), 'api/scrape-product.ts has NO imports from ../src');
assert(!scraperApi.includes("from 'src"), 'api/scrape-product.ts has NO imports from src');
assert(scraperApi.includes("import net from 'net';"), 'api/scrape-product.ts imports built-in net');
assert(scraperApi.includes("import dns from 'dns/promises';"), 'api/scrape-product.ts imports built-in dns/promises');
assert(scraperApi.includes("export default async function handler"), 'api/scrape-product.ts has handler');

// 3. Check api/notify/event.ts
const eventApi = fs.readFileSync('api/notify/event.ts', 'utf8');
assert(!eventApi.includes("from '../src") && !eventApi.includes("from 'src"), 'api/notify/event.ts has NO src imports');
assert(eventApi.includes("export default async function handler"), 'api/notify/event.ts has default export handler');
assert(eventApi.includes("VITE_SUPABASE_URL"), 'api/notify/event.ts reads VITE_SUPABASE_URL');
assert(eventApi.includes("SUPABASE_SERVICE_ROLE_KEY"), 'api/notify/event.ts reads SUPABASE_SERVICE_ROLE_KEY');
assert(eventApi.includes("TELEGRAM_BOT_TOKEN"), 'api/notify/event.ts reads TELEGRAM_BOT_TOKEN');
assert(eventApi.includes("couple_connected"), 'api/notify/event.ts handles couple_connected');
assert(eventApi.includes("couple_dissolved"), 'api/notify/event.ts handles couple_dissolved');
assert(eventApi.includes("reminder_created"), 'api/notify/event.ts handles reminder_created');
assert(eventApi.includes("reminder_completed"), 'api/notify/event.ts handles reminder_completed');
assert(eventApi.includes("wishlist_added"), 'api/notify/event.ts handles wishlist_added');
assert(eventApi.includes("memorable_date_added"), 'api/notify/event.ts handles memorable_date_added');
assert(eventApi.includes("date_memory_added"), 'api/notify/event.ts handles date_memory_added');
assert(eventApi.includes("start_date_updated"), 'api/notify/event.ts handles start_date_updated');
assert(eventApi.includes("attachButton = false"), 'api/notify/event.ts disables web_app button for couple_dissolved');
assert(eventApi.includes("isCriticalEvent"), 'api/notify/event.ts bypasses notifications_enabled for critical events');

// 4. Check api/cron/notifications.ts
const cronApi = fs.readFileSync('api/cron/notifications.ts', 'utf8');
assert(!cronApi.includes("from '../src") && !cronApi.includes("from 'src"), 'api/cron/notifications.ts has NO src imports');
assert(cronApi.includes("CRON_SECRET"), 'api/cron/notifications.ts verifies CRON_SECRET');
assert(cronApi.includes("VITE_SUPABASE_URL"), 'api/cron/notifications.ts reads VITE_SUPABASE_URL');
assert(cronApi.includes("SUPABASE_SERVICE_ROLE_KEY"), 'api/cron/notifications.ts reads SUPABASE_SERVICE_ROLE_KEY');
assert(cronApi.includes("ok: true"), 'api/cron/notifications.ts reports ok: true');
assert(cronApi.includes("checked:"), 'api/cron/notifications.ts reports checked count');
assert(cronApi.includes("sent:"), 'api/cron/notifications.ts reports sent count');

// 5. Check src/services/api.ts & coupleService.ts for telegram_id saving
const apiService = fs.readFileSync('src/services/api.ts', 'utf8');
assert(apiService.includes("telegram_id: telegramId"), 'src/services/api.ts saves telegram_id in public.users');
const coupleServiceCode = fs.readFileSync('src/services/coupleService.ts', 'utf8');
assert(coupleServiceCode.includes("ensureUserInSupabase"), 'coupleService guarantees ensureUserInSupabase');

// 6. Check src/services/notificationService.ts
const notifService = fs.readFileSync('src/services/notificationService.ts', 'utf8');
assert(notifService.includes("export async function sendPartnerNotification"), 'notificationService exports sendPartnerNotification');
assert(notifService.includes("fetch('/api/notify/event'"), 'notificationService calls /api/notify/event');

// 7. Check services calling sendPartnerNotification
assert(coupleServiceCode.includes("sendPartnerNotification('couple_connected')"), 'coupleService triggers couple_connected');
assert(coupleServiceCode.includes("sendPartnerNotification('couple_dissolved'"), 'coupleService triggers couple_dissolved');

const requestsService = fs.readFileSync('src/services/requestsService.ts', 'utf8');
assert(requestsService.includes("sendPartnerNotification('reminder_created'"), 'requestsService triggers reminder_created');
assert(requestsService.includes("sendPartnerNotification('reminder_completed'"), 'requestsService triggers reminder_completed');

const wishlistService = fs.readFileSync('src/services/wishlistService.ts', 'utf8');
assert(wishlistService.includes("sendPartnerNotification('wishlist_added'"), 'wishlistService triggers wishlist_added');
const toggleReservationMatch = wishlistService.match(/async toggleReservation[\s\S]*?(?=async|$)/);
assert(
  toggleReservationMatch && !toggleReservationMatch[0].includes('sendPartnerNotification'),
  'wishlistService toggleReservation does NOT trigger notification (keeps secret)'
);

const relationshipService = fs.readFileSync('src/services/relationshipService.ts', 'utf8');
assert(relationshipService.includes("sendPartnerNotification('memorable_date_added'"), 'relationshipService triggers memorable_date_added');
assert(relationshipService.includes("sendPartnerNotification('start_date_updated'"), 'relationshipService triggers start_date_updated');

const dateMemoryService = fs.readFileSync('src/services/dateMemoryService.ts', 'utf8');
assert(dateMemoryService.includes("sendPartnerNotification('date_memory_added'"), 'dateMemoryService triggers date_memory_added');

if (!passed) {
  process.exit(1);
}
console.log('\n🎉 ALL STATIC INTEGRATION & ARCHITECTURE CHECKS PASSED!');
