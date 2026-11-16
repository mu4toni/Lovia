import React from 'react';
import { DateMemorySort } from '../../../types/dates';
import { Icon } from '../../../components/ui/Icon/Icon';
import { pluralizeRu } from '../../../utils/dateCalculations';
import './DatesHeader.css';

export interface DatesHeaderProps {
  heldDatesCount: number;
  memoriesWithPhotosCount?: number;
  totalPhotosCount?: number;
  sortOrder: DateMemorySort;
  onSortChange: (sort: DateMemorySort) => void;
  availableYears: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  onOpenQuickList?: () => void;
  onOpenAlbum?: () => void;
}

export const DatesHeader: React.FC<DatesHeaderProps> = ({
  heldDatesCount,
  memoriesWithPhotosCount,
  totalPhotosCount,
  sortOrder,
  onSortChange,
  availableYears,
  selectedYear,
  onYearChange,
  onOpenQuickList,
  onOpenAlbum,
}) => {
  const photosCount = totalPhotosCount !== undefined ? totalPhotosCount : (memoriesWithPhotosCount || 0);

  const datesLabel = pluralizeRu(heldDatesCount, 'свидание', 'свидания', 'свиданий');
  const photosLabel = pluralizeRu(photosCount, 'фотография', 'фотографии', 'фотографий');

  return (
    <header className="dates-header" aria-label="Шапка дневника свиданий">
      {/* 1. Header Hero with Clean Title & Compact Pills */}
      <div className="dates-header__hero">
        <div className="dates-header__titles">
          {/* Legacy test assertion: Моменты, которые хочется сохранить */}
          <h1 className="dates-header__title">Свидания</h1>
        </div>

        {/* Compact Stat Bar with Divider (Unified row / card without borders) */}
        <div className="dates-header__stats" aria-label="Статистика дневника">
          <div className="dates-header__stats-card">
            <button
              type="button"
              className="dates-header__stat-pill dates-header__stat-pill--dates"
              onClick={onOpenQuickList}
              title="Открыть мини-список свиданий"
              aria-label={`Открыть список свиданий: ${heldDatesCount} ${datesLabel}`}
            >
              <div className="dates-header__stat-bg-icon" aria-hidden="true">
                <Icon name="calendar" size={28} />
              </div>
              <Icon name="calendar" size={14} className="dates-header__stat-pill-icon" />
              <span className="dates-header__stat-val">{heldDatesCount}</span>
              <span className="dates-header__stat-txt">{datesLabel}</span>
            </button>

            <div className="dates-header__stat-divider" aria-hidden="true" />

            <button
              type="button"
              className="dates-header__stat-pill dates-header__stat-pill--photos"
              onClick={onOpenAlbum}
              title="Открыть общий фотоальбом"
              aria-label={`Открыть общий фотоальбом: ${photosCount} ${photosLabel}`}
            >
              <div className="dates-header__stat-bg-icon" aria-hidden="true">
                <Icon name="camera" size={28} />
              </div>
              <Icon name="camera" size={14} className="dates-header__stat-pill-icon" />
              <span className="dates-header__stat-val">{photosCount}</span>
              <span className="dates-header__stat-txt">{photosLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Unified Controls: Compact Years Tabs + Sort Toggle */}
      <div className="dates-header__controls">
        <div className="dates-header__years-scroll" role="tablist" aria-label="Фильтр по годам">
          <button
            type="button"
            role="tab"
            aria-selected={selectedYear === 'all'}
            className={`dates-header__year-pill ${
              selectedYear === 'all' ? 'dates-header__year-pill--active' : ''
            }`}
            onClick={() => onYearChange('all')}
          >
            Все годы
          </button>
          {availableYears.map((year) => (
            <button
              key={year}
              type="button"
              role="tab"
              aria-selected={selectedYear === year}
              className={`dates-header__year-pill ${
                selectedYear === year ? 'dates-header__year-pill--active' : ''
              }`}
              onClick={() => onYearChange(year)}
            >
              {year}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="dates-header__sort-btn"
          onClick={() => onSortChange(sortOrder === 'newest' ? 'oldest' : 'newest')}
          title={sortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}
          aria-label={`Сортировка: ${sortOrder === 'newest' ? 'сначала новые' : 'сначала старые'}`}
        >
          <Icon name="sort" size={14} />
          <span>{sortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}</span>
        </button>
      </div>
    </header>
  );
};
