// Node.js test simulating the runtime lifecycle in localStorage / services
console.log('🧪 Запуск сценария жизненного цикла категорий и напоминаний...');

// Dynamically import compiled or load modules
// In our Vite project, let's test directly via a small script simulating requestsService and categoriesService logic
class StorageMock {
  constructor() {
    this.store = {};
  }
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}
const mockStorage = new StorageMock();

// Test logic:
let reminders = [
  { id: 'rem-1', title: 'Купить цветы', categoryId: 'cat-love', categoryColor: '#DA0038', categoryIcon: 'heart' },
  { id: 'rem-2', title: 'Ужин при свечах', categoryId: 'cat-love', categoryColor: '#DA0038', categoryIcon: 'heart' },
  { id: 'rem-3', title: 'Заплатить за квартиру', categoryId: 'cat-home', categoryColor: '#4ECDC4', categoryIcon: 'home' },
];

function getAffectedRemindersCount(catId) {
  return reminders.filter((r) => r.categoryId === catId || r.category === catId).length;
}

function unlinkCategory(catId) {
  reminders = reminders.map((r) => {
    if (r.categoryId === catId || r.category === catId) {
      return {
        ...r,
        categoryId: undefined,
        categoryName: undefined,
        categoryColor: undefined,
        categoryIcon: undefined,
        category: undefined,
      };
    }
    return r;
  });
}

function reassignCategory(fromId, toId, toColor, toIcon) {
  reminders = reminders.map((r) => {
    if (r.categoryId === fromId || r.category === fromId) {
      return {
        ...r,
        categoryId: toId,
        category: toId,
        categoryColor: toColor,
        categoryIcon: toIcon,
      };
    }
    return r;
  });
}

// 1. Initial count
console.log('Проверка подсчета:');
if (getAffectedRemindersCount('cat-love') !== 2) throw new Error('Count should be 2 for cat-love');
if (getAffectedRemindersCount('cat-home') !== 1) throw new Error('Count should be 1 for cat-home');
if (getAffectedRemindersCount('cat-nonexistent') !== 0) throw new Error('Count should be 0 for cat-nonexistent');
console.log('✅ Подсчёт связанных напоминаний корректен (2, 1, 0)');

// 2. Unlink test
console.log('Проверка отвязки (unlink):');
unlinkCategory('cat-home');
if (reminders.length !== 3) throw new Error('Reminders should NOT be deleted');
const rem3 = reminders.find(r => r.id === 'rem-3');
if (rem3.categoryId !== undefined || rem3.categoryColor !== undefined) {
  throw new Error('Reminder rem-3 should have undefined category and color');
}
if (rem3.title !== 'Заплатить за квартиру') throw new Error('Reminder data must be preserved');
console.log('✅ Напоминание сохранено, категория безопасно снята');

// 3. Reassign test
console.log('Проверка переноса (reassign):');
reassignCategory('cat-love', 'cat-romance', '#FF6B8A', 'sparkles');
if (reminders.length !== 3) throw new Error('Reminders should NOT be deleted');
const rem1 = reminders.find(r => r.id === 'rem-1');
const rem2 = reminders.find(r => r.id === 'rem-2');
if (rem1.categoryId !== 'cat-romance' || rem1.categoryColor !== '#FF6B8A' || rem1.categoryIcon !== 'sparkles') {
  throw new Error('Reminder rem-1 should be reassigned');
}
if (rem2.categoryId !== 'cat-romance' || rem2.categoryColor !== '#FF6B8A' || rem2.categoryIcon !== 'sparkles') {
  throw new Error('Reminder rem-2 should be reassigned');
}
console.log('✅ Напоминания успешно перенесены в новую категорию');

console.log('\n🎉 Все проверки логики жизненного цикла пройдены!');
