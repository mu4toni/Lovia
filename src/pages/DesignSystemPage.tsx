import { useState } from 'react';
import {
  Button,
  IconButton,
  Card,
  Input,
  Textarea,
  Switch,
  Checkbox,
  Badge,
  Avatar,
  CoupleAvatar,
  Modal,
  DateBadge,
  CalendarStrip,
  EmptyState,
  Skeleton,
  Spinner,
  ThemeToggle,
  useToast,
  CategoryMarker,
} from '../components/ui';
import { Icon } from '../components/ui/Icon/Icon';
import { DeadlineSelector, DeadlineValue } from '../components/home/CreateRequestModal/DeadlineSelector';
import { CATEGORY_LIST } from '../utils/categories';
import { TaskCategory } from '../components/ui/Badge/Badge';
import './DesignSystemPage.css';

export function DesignSystemPage() {
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [switch1, setSwitch1] = useState(true);
  const [switch2, setSwitch2] = useState(false);
  const [task1, setTask1] = useState(false);
  const [task2, setTask2] = useState(true);
  const [inputText, setInputText] = useState('Свидание в планетарии');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCat, setSelectedCat] = useState<TaskCategory>('dates');

  const [demoDeadline, setDemoDeadline] = useState<DeadlineValue>({
    mode: 'none',
    dueLabel: 'Несрочно',
  });

  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (i - 2));
    return {
      date: d,
      hasEvent: i === 2 || i === 4,
      eventLabel: i === 2 ? 'Сегодня' : 'Годовщина',
    };
  });

  const brandColors = [
    { name: 'Charcoal Slate', hex: '#3C3941', role: 'Основной текст / Canvas Dark' },
    { name: 'Warm Earth Taupe', hex: '#837362', role: 'Вторичный текст / Границы' },
    { name: 'Champagne Sand', hex: '#E4CAA5', role: 'Теплый фон / Чипсы' },
    { name: 'Ruby Rose', hex: '#C83649', role: 'Главный романтический акцент' },
    { name: 'Velvet Wine Noir', hex: '#360A17', role: 'Темный бархатный фон' },
    { name: 'Porcelain White', hex: '#FFFFFF', role: 'Чистый фарфоровый свет' },
  ];

  return (
    <div className="design-showcase">
      {/* Header with Theme Toggle */}
      <header className="showcase-header">
        <div className="showcase-header__text">
          <span className="showcase-header__tag">Дизайн-система</span>
          <h1 className="showcase-header__title">Lovia Design System</h1>
          <p className="showcase-header__desc">
            Премиальный тактильный минимализм • Палитра из эталона • Liquid Glass
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* 0. Brand Color Palette (Strictly from user image) */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">0. Фирменная палитра из эталона</h2>
        <Card variant="solid">
          <div className="showcase-palette-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {brandColors.map((c) => (
              <div
                key={c.hex}
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  padding: '10px',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    height: '42px',
                    borderRadius: '8px',
                    backgroundColor: c.hex,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {c.name}
                </span>
                <code style={{ fontSize: '11px', color: 'var(--color-primary)' }}>
                  {c.hex}
                </code>
                <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                  {c.role}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* 1. Couple & User Avatars */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">1. Аватарки и пара</h2>
        <Card variant="solid">
          <div className="showcase-avatars-row">
            <div className="showcase-avatar-col">
              <span className="showcase-sublabel">Пара вместе</span>
              <CoupleAvatar
                user1={{ name: 'Марсель' }}
                user2={{ name: 'Алиса' }}
                size="lg"
              />
            </div>
            <div className="showcase-avatar-col">
              <span className="showcase-sublabel">Статусы</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Avatar name="Марсель" size="md" />
                <Avatar name="Алиса" size="md" status="heart" />
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. Color System for Categories */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">2. Цветовая система категорий</h2>
        <Card variant="solid">
          <span className="showcase-sublabel">Минималистичные цветные маркеры (в карточках)</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {CATEGORY_LIST.map((cat) => (
              <CategoryMarker key={cat.key} category={cat.key} variant="tag" showIcon />
            ))}
          </div>

          <span className="showcase-sublabel">Интерактивные чипсы выбора (в формах и фильтрах)</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {CATEGORY_LIST.map((cat) => (
              <CategoryMarker
                key={cat.key}
                category={cat.key}
                variant="chip"
                showIcon
                selected={selectedCat === cat.key}
                onClick={() => setSelectedCat(cat.key)}
              />
            ))}
          </div>

          <span className="showcase-sublabel">
            Бейджи срочности (WCAG 2.1 AA)
          </span>
          <div className="showcase-chips-wrap">
            <Badge variant="urgency" urgency="low" dot>
              Спокойно
            </Badge>
            <Badge variant="urgency" urgency="medium" dot>
              Важно
            </Badge>
            <Badge variant="urgency" urgency="high" dot>
              Срочно
            </Badge>
          </div>
        </Card>
      </section>

      {/* 3. New Deadline Selector Showcase */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">3. Выбор срока (Несрочно / Календарь + Время)</h2>
        <Card variant="solid">
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Два понятных режима: «Несрочно» (без фиктивных дат) и «Открыть календарь» с опциональным выбором точного времени.
          </p>
          <DeadlineSelector value={demoDeadline} onChange={setDemoDeadline} />
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Текущее значение: <strong>{demoDeadline.dueLabel}</strong> (режим: {demoDeadline.mode})
          </div>
        </Card>
      </section>

      {/* 4. Calendar Elements */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">4. Календарные элементы</h2>
        <Card variant="solid">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <DateBadge day={14} month="НОЯ" highlight />
            <DateBadge day={25} month="ДЕК" />
            <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Компактные бейджи дат и горизонтальная лента
            </div>
          </div>
          <CalendarStrip
            days={calendarDays}
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
          />
        </Card>
      </section>

      {/* 5. Surfaces: Solid & Frosted Liquid Glass */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">5. Поверхности Solid & Frosted Glass</h2>
        <div className="showcase-cards-grid">
          <Card variant="solid">
            <h3 className="showcase-card-title">Solid Card</h3>
            <p className="showcase-card-text">
              Плотный чистый фон с микронной окантовкой и мягкой тенью.
            </p>
          </Card>

          <Card variant="glass">
            <h3 className="showcase-card-title">Frosted Liquid Glass</h3>
            <p className="showcase-card-text">
              Матовое полупрозрачное стекло с высоким коэффициентом непрозрачности (94%) — текст никогда не теряет читаемость.
            </p>
          </Card>

          <Card
            variant="interactive"
            onClick={() =>
              showToast({
                title: 'Интерактивная карточка',
                message: 'Плавный тактильный отклик при нажатии.',
                type: 'love',
              })
            }
          >
            <h3 className="showcase-card-title">Interactive Card (Нажмите)</h3>
            <p className="showcase-card-text">
              Поддерживает клик, hover и нажатие с клавиатуры (Enter / Space).
            </p>
          </Card>
        </div>
      </section>

      {/* 5. Buttons */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">5. Кнопки и иконки</h2>
        <Card variant="solid">
          <div className="showcase-buttons-stack">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Icon name="heart-filled" size={18} />}
              onClick={() =>
                showToast({
                  title: 'Любовь отправлена',
                  message: 'Ваш партнёр получит тёплое уведомление.',
                  type: 'love',
                })
              }
            >
              Основная кнопка (Primary)
            </Button>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="secondary" size="md">
                Вторичная
              </Button>
              <Button variant="outline" size="md">
                Контурная
              </Button>
              <Button variant="ghost" size="md">
                Ghost
              </Button>
              <Button variant="danger" size="md">
                Удалить
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Button variant="primary" size="sm">
                Маленькая
              </Button>
              <Button variant="primary" size="md" isLoading>
                Загрузка
              </Button>
              <Button variant="secondary" size="md" disabled>
                Отключена
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
              <IconButton
                aria-label="Поставить отметку"
                icon={<Icon name="heart" size={18} />}
                variant="primary"
              />
              <IconButton
                aria-label="Уведомления"
                icon={<Icon name="bell" size={18} />}
                variant="secondary"
              />
              <IconButton
                aria-label="Поделиться"
                icon={<Icon name="share" size={18} />}
                variant="ghost"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* 6. Inputs & Forms */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">6. Поля ввода и переключатели</h2>
        <Card variant="solid">
          <div className="showcase-form-stack">
            <Input
              label="Название совместной задачи"
              placeholder="Например: Заказать столик..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              leftIcon={<Icon name="note" size={16} />}
              helperText="Синхронизируется с партнёром в реальном времени"
            />

            <Input
              label="Поле с ошибкой (валидация)"
              value="Неправильная дата"
              error="Пожалуйста, выберите будущую дату для свидания"
              leftIcon={<Icon name="alert" size={16} />}
              readOnly
            />

            <Textarea
              label="Личная записка или пожелание"
              placeholder="Напишите что-то тёплое для второй половинки..."
              rows={2}
            />

            <div className="showcase-divider" />

            <Switch
              checked={switch1}
              onChange={setSwitch1}
              label="Уведомлять о напоминаниях"
              description="Присылать уведомление в Telegram"
            />

            <Switch
              checked={switch2}
              onChange={setSwitch2}
              label="Скрытый сюрприз"
              description="Партнёр увидит подарок только в день события"
            />

            <div className="showcase-divider" />

            <span className="showcase-sublabel">Список задач (Чекбоксы)</span>
            <Checkbox
              checked={task1}
              onChange={setTask1}
              label="Купить её любимые пионы"
              description="Категория: Сюрпризы"
            />
            <Checkbox
              checked={task2}
              onChange={setTask2}
              label="Забронировать билеты в кино"
              description="Выполнено вчера"
            />
          </div>
        </Card>
      </section>

      {/* 7. Modal & Toasts */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">7. Модальное окно и тосты</h2>
        <Card variant="solid">
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Нажмите кнопку ниже, чтобы проверить плавную анимацию всплывающего окна
            или отправьте тестовые уведомления:
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
            >
              Открыть Bottom Sheet
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() =>
                showToast({
                  title: 'Новое напоминание',
                  message: 'Марсель добавил: «Приготовь блинчики утром»',
                  type: 'love',
                })
              }
            >
              Тост «Любовь»
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() =>
                showToast({
                  title: 'Успешно сохранено',
                  message: 'План свидания добавлен в общий календарь',
                  type: 'success',
                })
              }
            >
              Тост «Успех»
            </Button>
          </div>
        </Card>
      </section>

      {/* 8. Empty & Loading States */}
      <section className="showcase-section">
        <h2 className="showcase-section__title">8. Пустые и загрузочные состояния</h2>
        <Card variant="solid">
          <EmptyState
            icon={<Icon name="heart" size={32} style={{ color: 'var(--color-primary)' }} />}
            title="Пока нет совместных планов"
            description="Создайте первое свидание или добавьте тёплое напоминание друг для друга!"
            actionText="Создать план"
            onAction={() =>
              showToast({
                title: 'Создание плана',
                message: 'Открывается форма добавления',
                type: 'love',
              })
            }
          />

          <div className="showcase-divider" />

          <span className="showcase-sublabel">Загрузка (Skeletons & Spinner)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Skeleton variant="circular" width={44} height={44} />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={14} />
                <Skeleton variant="text" width="40%" height={12} />
              </div>
              <Spinner size="sm" />
            </div>
            <Skeleton variant="rectangular" height={48} borderRadius="12px" />
          </div>
        </Card>
      </section>

      {/* Modal / Bottom Sheet */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Новое свидание"
        footer={
          <>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setIsModalOpen(false);
                showToast({
                  title: 'Свидание создано',
                  message: 'Партнёру отправлено приглашение',
                  type: 'love',
                });
              }}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Модальное окно в стиле iOS Bottom Sheet с тактильным управлением, поддержкой свайпа, клика по фону и Escape.
          </p>
          <Input
            label="Куда пойдём?"
            placeholder="Например: Уютный ресторан у реки..."
            defaultValue="Ужин при свечах"
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Категория:</span>
            <CategoryMarker category="dates" variant="tag" showIcon />
          </div>
        </div>
      </Modal>
    </div>
  );
}
