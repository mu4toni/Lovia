import React, { useEffect, useRef, useState } from 'react';
import type { ChecklistItem } from '../../../types';
import { checklistService, MAX_CHECKLIST_ITEMS } from '../../../services/checklistService';
import { telegramService } from '../../../services/telegramService';
import { useToast } from '../../ui/Toast/ToastContext';
import { Icon } from '../../ui/Icon/Icon';

export const QuickChecklistCard: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>(() => checklistService.getItems());
  const [draftText, setDraftText] = useState('');
  const [completingIds, setCompletingIds] = useState<Record<string, 'checked' | 'collapsing'>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef('');
  const timersRef = useRef<number[]>([]);

  const isAtLimit = items.length >= MAX_CHECKLIST_ITEMS;

  useEffect(() => {
    const sync = () => {
      setItems(checklistService.getItems());
    };
    window.addEventListener('lovia_checklist_updated', sync);
    window.addEventListener('lovia_couple_updated', sync);
    return () => {
      window.removeEventListener('lovia_checklist_updated', sync);
      window.removeEventListener('lovia_couple_updated', sync);
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const commitLines = (rawLines: string[], keepFocus: boolean) => {
    const cleaned = rawLines.map((l) => l.trim()).filter(Boolean);
    if (cleaned.length === 0) return;

    // Clear draft synchronously before any blur/re-render so rapid Enter never double-submits
    draftRef.current = '';
    setDraftText('');

    const { added, hitLimit, persistence } = checklistService.addItems(cleaned);

    if (added.length > 0) {
      telegramService.hapticImpact('light');
      void persistence.catch((err: any) => {
        showToast({
          title: 'Не удалось сохранить пункт',
          message: err?.message || 'Проверьте соединение и попробуйте ещё раз',
          type: 'warning',
        });
      });
    }

    if (hitLimit) {
      showToast({
        title: `Максимум ${MAX_CHECKLIST_ITEMS} пунктов`,
        message: 'Отметьте выполненные пункты, чтобы добавить новые',
        type: 'info',
      });
    }

    if (keepFocus) {
      // Keep cursor inside input so user can type 5–10 items in a row without pauses
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const commitCurrentDraft = (keepFocus: boolean) => {
    const currentText = draftRef.current;
    if (!currentText.trim()) return;
    commitLines(currentText.split(/\r?\n/), keepFocus);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    draftRef.current = value;
    setDraftText(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitCurrentDraft(true);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitCurrentDraft(true);
  };

  const handleBlur = () => {
    commitCurrentDraft(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted || !/\r?\n/.test(pasted)) return;

    e.preventDefault();
    const combined = draftRef.current ? `${draftRef.current}\n${pasted}` : pasted;
    commitLines(combined.split(/\r?\n/), true);
  };

  const handleCardAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.quick-checklist__row-btn') || target.closest('input')) {
      return;
    }
    if (!isAtLimit) {
      inputRef.current?.focus();
    }
  };

  const handleComplete = (item: ChecklistItem) => {
    if (completingIds[item.id]) return;

    telegramService.hapticImpact('light');
    setCompletingIds((prev) => ({ ...prev, [item.id]: 'checked' }));

    const t1 = window.setTimeout(() => {
      setCompletingIds((prev) => ({ ...prev, [item.id]: 'collapsing' }));
    }, 450);

    const t2 = window.setTimeout(() => {
      setCompletingIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      void checklistService.deleteItem(item.id).catch((err: any) => {
        showToast({
          title: 'Не удалось удалить пункт',
          message: err?.message || 'Попробуйте ещё раз',
          type: 'warning',
        });
      });
    }, 670);

    timersRef.current.push(t1, t2);
  };

  return (
    <div
      className="quick-checklist-card sketch-card"
      aria-label="Быстрый список"
      onClick={handleCardAreaClick}
    >
      {items.length > 0 && (
        <ul className="quick-checklist__list">
          {items.map((item) => {
            const phase = completingIds[item.id];
            const isChecked = phase === 'checked' || phase === 'collapsing';
            const isCollapsing = phase === 'collapsing';

            return (
              <li
                key={item.id}
                className={`quick-checklist__row ${
                  isChecked ? 'quick-checklist__row--checked' : ''
                } ${isCollapsing ? 'quick-checklist__row--collapsing' : ''}`}
              >
                <button
                  type="button"
                  className="quick-checklist__row-btn"
                  onClick={() => handleComplete(item)}
                  aria-label={`Выполнить и убрать: ${item.text}`}
                >
                  <span
                    className={`quick-checklist__circle ${
                      isChecked ? 'quick-checklist__circle--checked' : ''
                    }`}
                    aria-hidden="true"
                  >
                    {isChecked && (
                      <Icon
                        name="check"
                        size={13}
                        strokeWidth={3}
                        className="quick-checklist__check-icon"
                      />
                    )}
                  </span>
                  <span className="quick-checklist__text">{item.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isAtLimit ? (
        <div className="quick-checklist__limit-note" role="status">
          Максимум {MAX_CHECKLIST_ITEMS} пунктов
        </div>
      ) : (
        <form className="quick-checklist__form" onSubmit={handleFormSubmit}>
          <span
            className="quick-checklist__add-circle"
            aria-hidden="true"
            onClick={() => inputRef.current?.focus()}
          >
            +
          </span>
          <input
            ref={inputRef}
            type="text"
            className="quick-checklist__input"
            value={draftText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onPaste={handlePaste}
            placeholder="Добавить пункт..."
            aria-label="Добавить пункт в список"
            enterKeyHint="next"
            autoComplete="off"
            maxLength={180}
          />
        </form>
      )}
    </div>
  );
};
