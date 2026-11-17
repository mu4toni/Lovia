import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- TEST SUITE: Lovia Startup Speed & SWR Optimization ---');

// 1. Check mascot image sizes
console.log('\n[1/6] Verifying Mascot Image Sizes (< 200 KB)...');
const mascots = ['bear-love.png', 'bear-peek.png', 'bear-sleepy.png'];
for (const file of mascots) {
  const p = path.join('src', 'assets', 'mascots', file);
  assert.ok(fs.existsSync(p), `Mascot file missing: ${p}`);
  const stat = fs.statSync(p);
  const sizeKb = stat.size / 1024;
  console.log(`  ✓ ${file}: ${sizeKb.toFixed(1)} KB`);
  assert.ok(sizeKb <= 200, `Mascot ${file} is too large: ${sizeKb.toFixed(1)} KB > 200 KB`);
}

// 2. Check SWR cache module
console.log('\n[2/6] Verifying SWR Cache Implementation...');
const swrCacheSrc = fs.readFileSync('src/services/swrCache.ts', 'utf8');
assert.ok(swrCacheSrc.includes('lovia_swr_cache_'), 'swrCache must use prefix lovia_swr_cache_');
assert.ok(swrCacheSrc.includes('getSwrCache'), 'swrCache must export getSwrCache');
assert.ok(swrCacheSrc.includes('getSwrCacheSection'), 'swrCache must export getSwrCacheSection');
assert.ok(swrCacheSrc.includes('updateSwrCache'), 'swrCache must export updateSwrCache');
assert.ok(swrCacheSrc.includes('clearSwrCache'), 'swrCache must export clearSwrCache');
console.log('  ✓ swrCache.ts exports all required SWR functions');

// 3. Check services for SWR cache & background revalidation
console.log('\n[3/6] Verifying Services Integration (couple, requests, wishlist, relationship, dateMemory)...');
const coupleSrc = fs.readFileSync('src/services/coupleService.ts', 'utf8');
assert.ok(coupleSrc.includes('getSwrCacheSection'), 'coupleService must use getSwrCacheSection');
assert.ok(coupleSrc.includes('updateSwrCache'), 'coupleService must use updateSwrCache');
assert.ok(coupleSrc.includes('clearSwrCache'), 'coupleService must call clearSwrCache on dissolve');
assert.ok(coupleSrc.includes('preloadAllCoupleData'), 'coupleService must have preloadAllCoupleData for parallel loading');
assert.ok(coupleSrc.includes('Promise.all'), 'coupleService must eliminate waterfalls using Promise.all');
console.log('  ✓ coupleService has SWR instant restore + parallel preloadAllCoupleData');

const reqsSrc = fs.readFileSync('src/services/requestsService.ts', 'utf8');
assert.ok(reqsSrc.includes('hasCachedData'), 'requestsService must have hasCachedData');
assert.ok(reqsSrc.includes('updateSwrCache'), 'requestsService must updateSwrCache');
assert.ok(reqsSrc.includes('revalidateInBackground'), 'requestsService must revalidateInBackground');
console.log('  ✓ requestsService has SWR instant return + revalidateInBackground');

const wishSrc = fs.readFileSync('src/services/wishlistService.ts', 'utf8');
assert.ok(wishSrc.includes('hasCachedData'), 'wishlistService must have hasCachedData');
assert.ok(wishSrc.includes('updateSwrCache'), 'wishlistService must updateSwrCache');
assert.ok(wishSrc.includes('revalidateInBackground'), 'wishlistService must revalidateInBackground');
console.log('  ✓ wishlistService has SWR instant return + revalidateInBackground');

const relSrc = fs.readFileSync('src/services/relationshipService.ts', 'utf8');
assert.ok(relSrc.includes('hasCachedData'), 'relationshipService must have hasCachedData');
assert.ok(relSrc.includes('updateSwrCache'), 'relationshipService must updateSwrCache');
assert.ok(relSrc.includes('revalidateDatesInBackground'), 'relationshipService must revalidateDatesInBackground');
console.log('  ✓ relationshipService has SWR instant return + revalidateDatesInBackground');

const dateSrc = fs.readFileSync('src/services/dateMemoryService.ts', 'utf8');
assert.ok(dateSrc.includes('hasCachedData'), 'dateMemoryService must have hasCachedData');
assert.ok(dateSrc.includes('updateSwrCache'), 'dateMemoryService must updateSwrCache');
assert.ok(dateSrc.includes('revalidateMemoriesInBackground'), 'dateMemoryService must revalidateMemoriesInBackground');
console.log('  ✓ dateMemoryService has SWR instant return + revalidateMemoriesInBackground');

// 4. Check Polling intervals & visibility checks in hooks
console.log('\n[4/6] Verifying Polling Intervals and document.visibilityState in Hooks...');
const homeHookSrc = fs.readFileSync('src/hooks/useHomeData.ts', 'utf8');
assert.ok(homeHookSrc.includes('18000'), 'useHomeData should poll at 18000ms');
assert.ok(homeHookSrc.includes('document.visibilityState === \'visible\''), 'useHomeData must check visibilityState');
assert.ok(homeHookSrc.includes('requestsService.hasCachedData()'), 'useHomeData should check hasCachedData to prevent loading flicker');
console.log('  ✓ useHomeData polling is 18s with visibility check & smooth loading');

const wishHookSrc = fs.readFileSync('src/hooks/useWishlist.ts', 'utf8');
assert.ok(wishHookSrc.includes('18000'), 'useWishlist should poll at 18000ms');
assert.ok(wishHookSrc.includes('document.visibilityState === \'visible\''), 'useWishlist must check visibilityState');
console.log('  ✓ useWishlist polling is 18s with visibility check');

const relHookSrc = fs.readFileSync('src/hooks/useRelationship.ts', 'utf8');
assert.ok(relHookSrc.includes('18000'), 'useRelationship should poll at 18000ms');
assert.ok(relHookSrc.includes('document.visibilityState === \'visible\''), 'useRelationship must check visibilityState');
console.log('  ✓ useRelationship polling is 18s with visibility check');

const datesHookSrc = fs.readFileSync('src/hooks/useDateMemories.ts', 'utf8');
assert.ok(datesHookSrc.includes('18000'), 'useDateMemories should poll at 18000ms');
assert.ok(datesHookSrc.includes('document.visibilityState === \'visible\''), 'useDateMemories must check visibilityState');
console.log('  ✓ useDateMemories polling is 18s with visibility check');

const onboardSrc = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
assert.ok(onboardSrc.includes('document.visibilityState === \'visible\''), 'OnboardingPage must check visibilityState');
console.log('  ✓ OnboardingPage polling checks visibility');

// 5. Check Code Splitting in App.tsx
console.log('\n[5/6] Verifying Code Splitting in App.tsx...');
const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
assert.ok(appSrc.includes('lazy('), 'App.tsx must use React.lazy');
assert.ok(appSrc.includes('Suspense'), 'App.tsx must use Suspense');
assert.ok(appSrc.includes('PageSkeleton'), 'App.tsx must use PageSkeleton fallback');
assert.ok(appSrc.includes('import { HomePage }'), 'HomePage must remain statically imported for fast first paint');
assert.ok(appSrc.includes('import { OnboardingPage }'), 'OnboardingPage must remain statically imported');
console.log('  ✓ App.tsx has React.lazy code splitting with PageSkeleton fallback');

// 6. Check Client Image Compressor
console.log('\n[6/6] Verifying Client Image Compression...');
const compressorSrc = fs.readFileSync('src/utils/imageCompressor.ts', 'utf8');
assert.ok(compressorSrc.includes('compressImageFile'), 'imageCompressor must export compressImageFile');
assert.ok(compressorSrc.includes('canvas'), 'imageCompressor must use HTML5 canvas');

const modalSrc = fs.readFileSync('src/features/dates/CreateEditDateMemoryModal/CreateEditDateMemoryModal.tsx', 'utf8');
assert.ok(modalSrc.includes('compressImageFile'), 'CreateEditDateMemoryModal must use compressImageFile');
console.log('  ✓ CreateEditDateMemoryModal compresses photos before upload');

console.log('\n=========================================');
console.log('🎉 ALL 6/6 SPEED & SWR OPTIMIZATION CHECKS PASSED!');
console.log('=========================================\n');
