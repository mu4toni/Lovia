import React, { useState, useMemo, memo } from 'react';
import { CoupleReminder } from '../../../types';
import { UserCategory, DEFAULT_BASE_CATEGORIES } from '../../../types/category';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { Icon } from '../../ui/Icon/Icon';
import { Mascot } from '../../ui/Mascot/Mascot';
import { SketchDoodle } from '../../ui/SketchDecor/SketchDecor';
import { getCardColorStyles } from '../../../utils/colorContrast';
import { getContrastColor } from '../../../utils/categories';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import { QuickChecklistCard } from './QuickChecklistCard';
import './RequestsList.css';

function getUrgencyLabel(urg: CoupleReminder['urgency']) {
  switch (urg) {
    case 'low':
      return 'Спокойно';
    case 'medium':
      return 'Важно';
    case 'high':
      return 'Срочно';
  }
}

interface RequestCardItemProps {
  req: CoupleReminder;
  onToggleStatus: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onEditRequest?: (request: CoupleReminder) => void;
}

const RequestCardItem: React.FC<RequestCardItemProps> = memo(
  ({ req, onToggleStatus, onDeleteRequest, onEditRequest }) => {
    const isCompleted = req.status === 'completed';
    const isOverdue = req.status === 'overdue';
    const isUnscheduled = !req.dueDate || req.dueLabel === 'Несрочно';
    const cardStyles = getCardColorStyles(req.categoryColor);

    return (
      <div
        className={`request-card ${isCompleted ? 'request-card--completed' : ''} ${
          isOverdue ? 'request-card--overdue' : ''
        } ${req.categoryColor ? 'request-card--tinted' : ''}`}
        style={{
          backgroundColor: cardStyles.backgroundColor,
          borderColor: cardStyles.borderColor,
          color: cardStyles.color,
        }}
      >
        <button
          type="button"
          className={`request-card__check-btn ${
            isCompleted ? 'request-card__check-btn--checked' : ''
          }`}
          style={{
            borderColor: isCompleted ? cardStyles.color : cardStyles.checkboxBorder,
            backgroundColor: isCompleted ? cardStyles.color : cardStyles.checkboxBg,
          }}
          onClick={() => onToggleStatus(req.id)}
          aria-label={
            isCompleted
              ? 'Отметить напоминание невыполненным'
              : 'Отметить напоминание выполненным'
          }
        >
          {isCompleted && (
            <Icon
              name="check"
              size={14}
              strokeWidth={2.8}
              className="request-card__check-svg"
              style={{ color: cardStyles.checkSvgColor }}
            />
          )}
        </button>

        <div className="request-card__body">
          <div className="request-card__top">
            <span className="request-card__title" style={{ color: cardStyles.color }}>
              {req.title}
            </span>
          </div>

          {req.description && (
            <p className="request-card__desc" style={{ color: cardStyles.colorSecondary }}>
              {req.description}
            </p>
          )}

          {req.urgency && req.urgency !== 'low' && (
            <div className="request-card__badges">
              <span
                className="request-card__urgency-pill"
                style={{
                  backgroundColor: cardStyles.urgencyBg,
                  color: cardStyles.urgencyColor,
                }}
              >
                <span
                  className={`create-urgency-dot create-urgency-dot--${req.urgency}`}
                  aria-hidden="true"
                />
                <span>{getUrgencyLabel(req.urgency)}</span>
              </span>
            </div>
          )}

          <div className="request-card__meta-row">
            <span
              className="request-card__meta-item"
              title="Автор"
              style={{ color: cardStyles.colorSecondary }}
            >
              <Icon
                name="profile"
                size={12}
                className="request-card__meta-icon"
                style={{ color: cardStyles.colorTertiary }}
              />
              {req.authorName}
            </span>
            <span
              className="request-card__meta-item"
              title="Для кого"
              style={{ color: cardStyles.colorSecondary }}
            >
              <Icon
                name="heart"
                size={12}
                className="request-card__meta-icon"
                style={{ color: cardStyles.colorTertiary }}
              />
              {req.targetName}
            </span>
            <span
              className={`request-card__meta-item ${
                isOverdue
                  ? 'request-card__meta-item--overdue'
                  : isUnscheduled
                  ? 'request-card__meta-item--unscheduled'
                  : ''
              }`}
              title="Срок выполнения"
              style={{
                color: isOverdue
                  ? cardStyles.isLightSurface && req.categoryColor
                    ? '#B1243D'
                    : 'var(--accent-text, var(--color-primary))'
                  : cardStyles.colorSecondary,
              }}
            >
              <Icon
                name="clock"
                size={12}
                className="request-card__meta-icon"
                style={{ color: cardStyles.colorTertiary }}
              />
              {isOverdue
                ? `Просрочено (${req.dueLabel})`
                : req.dueTime && req.dueLabel
                ? `${req.dueLabel} · ${req.dueTime}`
                : req.dueLabel || 'Несрочно'}
            </span>
          </div>

          {req.rewardNote && (
            <div
              className="request-card__reward"
              style={{
                backgroundColor: cardStyles.urgencyBg,
                color: cardStyles.color,
                borderColor: cardStyles.borderColor,
              }}
            >
              <Icon
                name="gift"
                size={13}
                className="request-card__reward-icon"
                style={{ color: cardStyles.color }}
              />
              <span>{req.rewardNote}</span>
            </div>
          )}
        </div>

        <div className="request-card__actions">
          {onEditRequest && (
            <button
              type="button"
              className="request-card__action-btn request-card__action-btn--edit"
              style={{ color: cardStyles.deleteBtnColor }}
              onClick={() => onEditRequest(req)}
              aria-label={`Редактировать напоминание: ${req.title}`}
              title="Редактировать напоминание"
            >
              <Icon name="edit" size={15} />
            </button>
          )}
          <button
            type="button"
            className="request-card__delete-btn request-card__action-btn--delete"
            style={{ color: cardStyles.deleteBtnColor }}
            onClick={() => onDeleteRequest(req.id)}
            aria-label={`Удалить напоминание: ${req.title}`}
            title="Удалить напоминание"
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
    );
  }
);

export interface RequestsListProps {
  requests: CoupleReminder[];
  categories?: UserCategory[];
  currentUserId: string;
  onToggleStatus: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onEditRequest?: (request: CoupleReminder) => void;
  onCreateClick: () => void;
  className?: string;
}

type TodaySectionTab = 'reminders' | 'lists';

export const RequestsList: React.FC<RequestsListProps> = ({
  requests,
  categories = [],
  currentUserId: _currentUserId,
  onToggleStatus,
  onDeleteRequest,
  onEditRequest,
  onCreateClick: _onCreateClick,
  className = '',
}) => {
  const { isFriendship } = useSpaceMode();
  const [activeTab, setActiveTab] = useState<TodaySectionTab>('reminders');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Extract / collect unique category colors for filtering
  const filterColors = useMemo(() => {
    const fromRequests = requests.map((r) => r.categoryColor).filter(Boolean) as string[];
    const fromCategories = (categories && categories.length > 0 ? categories : DEFAULT_BASE_CATEGORIES)
      .map((c: UserCategory) => c.color)
      .filter(Boolean);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of [...fromRequests, ...fromCategories]) {
      const lower = c.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(c);
      }
    }
    return result;
  }, [requests, categories]);

  // Active reminders filtered by selected color
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (req.status === 'completed') return false;
      if (selectedColor && req.categoryColor?.toLowerCase() !== selectedColor.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [requests, selectedColor]);

  const overdueRequests = useMemo(
    () => requests.filter((r) => r.status === 'overdue'),
    [requests]
  );

  return (
    <section className={`requests-section ${className}`} aria-label="Наши совместные напоминания и списки">
      {/* Section Header */}
      <div className="requests-section__header">
        <div className="requests-section__title-wrap">
          <div className="requests-section__title-row">
            <Mascot name="14_reminder_bell" size={26} />
            <h2 className="requests-section__title">Сегодня</h2>
            <SketchDoodle
              type={isFriendship ? 'star' : 'heart-filled'}
              size={12}
              className="requests-section__doodle-heart"
            />
          </div>
        </div>
      </div>

      {/* 2 Tabs: «Напоминания» and «Списки» */}
      <div className="requests-tabs" role="tablist" aria-label="Разделы блока Сегодня">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reminders'}
          className={`requests-tab ${activeTab === 'reminders' ? 'requests-tab--active' : ''}`}
          onClick={() => setActiveTab('reminders')}
        >
          Напоминания
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'lists'}
          className={`requests-tab ${activeTab === 'lists' ? 'requests-tab--active' : ''}`}
          onClick={() => setActiveTab('lists')}
        >
          Списки
        </button>
      </div>

      {activeTab === 'lists' ? (
        <QuickChecklistCard />
      ) : (
        <>
          {/* Overdue Alert Banner if any */}
          {overdueRequests.length > 0 && (
            <div className="requests-overdue-banner" role="alert">
              <Icon name="alert" size={18} className="requests-overdue-banner__icon" />
              <div className="requests-overdue-banner__text">
                <strong>
                  {overdueRequests.length === 1
                    ? '1 напоминание требует внимания'
                    : `${overdueRequests.length} напоминания просрочены`}
                </strong>
                <p>Не переживайте, любовь важнее дедлайнов — обновите срок или отметьте выполненным.</p>
              </div>
            </div>
          )}

          {/* Compact Color Filter Bar (Right below the tabs) */}
          {filterColors.length > 0 && (
            <div
              className="requests-color-filter-bar"
              role="toolbar"
              aria-label="Фильтрация напоминаний по цвету"
            >
              <button
                type="button"
                className={`requests-color-pill requests-color-all-btn ${
                  selectedColor === null ? 'requests-color-pill--active requests-color-all-btn--active' : ''
                }`}
                onClick={() => setSelectedColor(null)}
                aria-pressed={selectedColor === null}
              >
                Все
              </button>
              {filterColors.map((colorHex) => {
                const isSelected = selectedColor?.toLowerCase() === colorHex.toLowerCase();
                const checkColor = getContrastColor(colorHex);
                const matchedCat =
                  categories.find((c: UserCategory) => c.color.toLowerCase() === colorHex.toLowerCase()) ||
                  DEFAULT_BASE_CATEGORIES.find((c: UserCategory) => c.color.toLowerCase() === colorHex.toLowerCase());
                const catName = matchedCat?.name || `Цвет ${colorHex}`;

                return (
                  <button
                    key={colorHex}
                    type="button"
                    className={`requests-color-circle requests-color-swatch-btn ${
                      isSelected ? 'requests-color-circle--active requests-color-swatch-btn--active' : ''
                    }`}
                    style={{ backgroundColor: colorHex }}
                    onClick={() => setSelectedColor(isSelected ? null : colorHex)}
                    aria-pressed={isSelected}
                    aria-label={`Фильтр по цвету: ${catName}`}
                    title={catName}
                  >
                    {isSelected && (
                      <Icon
                        name="check"
                        size={11}
                        strokeWidth={3}
                        className="requests-color-swatch__check"
                        style={{ color: checkColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Reminders List with Full Card Background Tinting */}
          {filteredRequests.length > 0 ? (
            <div className="requests-cards-list">
              {filteredRequests.map((req) => (
                <RequestCardItem
                  key={req.id}
                  req={req}
                  onToggleStatus={onToggleStatus}
                  onDeleteRequest={onDeleteRequest}
                  onEditRequest={onEditRequest}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              mascotName={
                selectedColor
                  ? '17_empty_state_box'
                  : new Date().getHours() >= 21
                  ? '40_sleeping_moon'
                  : '19_loading_tea'
              }
              title={
                selectedColor
                  ? 'Напоминаний этого цвета пока нет'
                  : 'Всё сделано, можно отдыхать'
              }
              description={
                selectedColor
                  ? 'Создайте напоминание с этим цветом или сбросьте фильтр.'
                  : isFriendship
                  ? 'У вас пока нет активных напоминаний. Создайте приятное напоминание для друга!'
                  : 'У вас пока нет активных напоминаний. Создайте приятное напоминание для партнёра!'
              }
            />
          )}
        </>
      )}
    </section>
  );
};
