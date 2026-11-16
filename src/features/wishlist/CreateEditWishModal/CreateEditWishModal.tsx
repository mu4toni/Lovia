import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WishItem, CreateWishInput } from '../../../types/wishlist';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Icon } from '../../../components/ui/Icon/Icon';
import { productScraperService } from '../../../services/productScraperService';
import './CreateEditWishModal.css';

export interface CreateEditWishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateWishInput) => Promise<void>;
  initialWish?: WishItem | null;
}

type PhotoBoxState = 'idle' | 'loading' | 'success' | 'error';

export const CreateEditWishModal: React.FC<CreateEditWishModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialWish,
}) => {
  const isEditing = Boolean(initialWish);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // UI & Loading States
  const [photoState, setPhotoState] = useState<PhotoBoxState>('idle');
  const [photoErrorMsg, setPhotoErrorMsg] = useState('');
  const [isAutoFetched, setIsAutoFetched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Manual URL entry state
  const [isManualUrlOpen, setIsManualUrlOpen] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState('');

  // Refs for race-condition prevention & file upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastScrapedUrlRef = useRef<string>('');
  const requestIdRef = useRef<number>(0);

  // Reset form when modal opens / changes initialWish
  useEffect(() => {
    if (initialWish) {
      setTitle(initialWish.title || '');
      setLinkUrl(initialWish.linkUrl || '');
      setEstimatedPrice(
        initialWish.estimatedPrice
          ? Math.round(initialWish.estimatedPrice).toLocaleString('ru-RU')
          : ''
      );
      setImageUrl(initialWish.imageUrl || '');
      setPhotoState(initialWish.imageUrl ? 'success' : 'idle');
      setPhotoErrorMsg('');
      setIsAutoFetched(false);
      lastScrapedUrlRef.current = initialWish.linkUrl || '';
    } else {
      setTitle('');
      setLinkUrl('');
      setEstimatedPrice('');
      setImageUrl('');
      setPhotoState('idle');
      setPhotoErrorMsg('');
      setIsAutoFetched(false);
      lastScrapedUrlRef.current = '';
    }
    setIsManualUrlOpen(false);
    setManualImageUrl('');
    setTitleError(null);
    setIsZoomOpen(false);
  }, [initialWish, isOpen]);

  // Clean up any pending scraping requests on modal close
  useEffect(() => {
    if (!isOpen) {
      productScraperService.cancelAll();
      requestIdRef.current++;
    }
  }, [isOpen]);

  // Handle URL scraping for product photo directly from product page
  const triggerScrape = useCallback(async (urlToScrape: string, reqId: number) => {
    const trimmed = urlToScrape.trim();
    if (!trimmed) {
      lastScrapedUrlRef.current = '';
      return;
    }

    if (!productScraperService.isValidUrl(trimmed)) {
      if (reqId === requestIdRef.current) {
        setPhotoState('idle');
        setPhotoErrorMsg('');
      }
      return;
    }

    // Don't re-scrape the exact same URL if already loaded
    if (trimmed === lastScrapedUrlRef.current && imageUrl) {
      return;
    }

    lastScrapedUrlRef.current = trimmed;
    setPhotoState('loading');
    setPhotoErrorMsg('');
    setIsManualUrlOpen(false);

    try {
      const result = await productScraperService.scrapeProduct(trimmed);

      // Verify this request is still the active one (prevent race conditions)
      if (reqId !== requestIdRef.current) {
        return;
      }

      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl);
        setPhotoState('success');
        setIsAutoFetched(true);

        // Autofill title if empty and title was extracted from page
        if (!title.trim() && result.title) {
          setTitle(result.title);
          setTitleError(null);
        }
      } else {
        setPhotoState('error');
        setPhotoErrorMsg(
          result.error || 'Не удалось автоматически получить фотографию этого товара'
        );
      }
    } catch {
      if (reqId === requestIdRef.current) {
        setPhotoState('error');
        setPhotoErrorMsg('Не удалось автоматически получить фотографию этого товара');
      }
    }
  }, [imageUrl, title]);

  // Handle link changes: immediately clear previous auto-photo and debounce fetch (~500ms)
  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setLinkUrl(newUrl);

    // Increment request ID immediately to invalidate any in-flight requests
    const currentReqId = ++requestIdRef.current;
    productScraperService.cancelAll();

    const trimmed = newUrl.trim();

    // If previous photo was auto-fetched, clear it immediately to prevent showing outdated image
    if (isAutoFetched) {
      setImageUrl('');
      setIsAutoFetched(false);
      setPhotoState('idle');
      lastScrapedUrlRef.current = '';
    }

    if (!trimmed) {
      setPhotoState('idle');
      setPhotoErrorMsg('');
      return;
    }

    // Debounce the scraping trigger ~500ms
    setTimeout(() => {
      if (currentReqId === requestIdRef.current) {
        triggerScrape(trimmed, currentReqId);
      }
    }, 500);
  };

  // Handle paste into link input with fast scraping trigger (~500ms)
  const handleLinkPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.trim()) {
      const trimmed = pastedText.trim();
      setLinkUrl(trimmed);

      const currentReqId = ++requestIdRef.current;
      productScraperService.cancelAll();

      if (isAutoFetched) {
        setImageUrl('');
        setIsAutoFetched(false);
        setPhotoState('idle');
        lastScrapedUrlRef.current = '';
      }

      setTimeout(() => {
        if (currentReqId === requestIdRef.current) {
          triggerScrape(trimmed, currentReqId);
        }
      }, 500);
    }
  };

  // Dedicated button: manual trigger of scrape
  const handleManualFetchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = linkUrl.trim();
    if (!trimmed) return;
    const currentReqId = ++requestIdRef.current;
    productScraperService.cancelAll();
    triggerScrape(trimmed, currentReqId);
  };

  // Handle manual photo file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setImageUrl(dataUrl);
      setPhotoState('success');
      setIsAutoFetched(false);
      setPhotoErrorMsg('');
      setIsManualUrlOpen(false);
    };
    reader.readAsDataURL(file);
  };

  // Apply manual direct image URL
  const handleApplyManualImageUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    const trimmed = manualImageUrl.trim();
    if (!trimmed || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))) {
      alert('Пожалуйста, введите корректный URL изображения (http:// или https://)');
      return;
    }
    setImageUrl(trimmed);
    setPhotoState('success');
    setIsAutoFetched(false);
    setIsManualUrlOpen(false);
    setManualImageUrl('');
    setPhotoErrorMsg('');
  };

  // Remove photo
  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageUrl('');
    setPhotoState('idle');
    setIsAutoFetched(false);
    setPhotoErrorMsg('');
    setIsManualUrlOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format price input
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setEstimatedPrice('');
      return;
    }
    const num = parseInt(val, 10);
    setEstimatedPrice(num.toLocaleString('ru-RU'));
  };

  // Continue without photo on error
  const handleContinueWithoutPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageUrl('');
    setPhotoState('idle');
    setPhotoErrorMsg('');
    setIsAutoFetched(false);
    setIsManualUrlOpen(false);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setTitleError('Пожалуйста, укажите название желания');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedPrice = estimatedPrice.trim()
        ? parseFloat(estimatedPrice.replace(/\s+/g, ''))
        : undefined;

      await onSubmit({
        title: title.trim(),
        imageUrl: imageUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        estimatedPrice: !isNaN(Number(parsedPrice)) ? parsedPrice : undefined,
        currency: '₽',
        categoryId: initialWish?.categoryId || 'gifts',
      });
      onClose();
    } catch (err) {
      console.error('Failed to save wish', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Редактировать желание' : 'Новое желание'}
      >
        <form onSubmit={handleSubmit} className="wish-modal-form" noValidate>
          {/* Hidden File Input for device gallery / photo upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="wish-file-upload-input"
          />

          {/* 1. Photo Block (Hero Visual Element) */}
          <div
            className={`wish-photo-box wish-photo-box--${photoState}`}
            onClick={() => {
              if (photoState === 'idle' && !isManualUrlOpen) {
                fileInputRef.current?.click();
              }
            }}
            role="region"
            aria-label="Блок фотографии желания"
          >
            {/* State A: Idle */}
            {photoState === 'idle' && (
              <div className="wish-photo-box__idle-content">
                {isManualUrlOpen ? (
                  <div
                    className="wish-photo-box__manual-url-form"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="url"
                      className="wish-photo-box__manual-url-input"
                      placeholder="Вставьте ссылку на картинку (https://...)"
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                      autoFocus
                    />
                    <div className="wish-photo-box__manual-url-actions">
                      <button
                        type="button"
                        className="wish-photo-box__manual-url-btn wish-photo-box__manual-url-btn--submit"
                        onClick={handleApplyManualImageUrl}
                      >
                        Применить
                      </button>
                      <button
                        type="button"
                        className="wish-photo-box__manual-url-btn wish-photo-box__manual-url-btn--cancel"
                        onClick={() => setIsManualUrlOpen(false)}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="wish-photo-box__icon-circle" aria-hidden="true">
                      <Icon name="image" size={24} />
                    </div>
                    <div>
                      <span className="wish-photo-box__text">
                        Добавьте ссылку или загрузите фото
                      </span>
                      <span className="wish-photo-box__subtext" style={{ display: 'block', marginTop: '2px' }}>
                        Фото подтянется автоматически со страницы товара
                      </span>
                    </div>
                    <div className="wish-photo-box__idle-actions">
                      <button
                        type="button"
                        className="wish-photo-box__upload-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <Icon name="plus" size={14} />
                        <span>Загрузить фото</span>
                      </button>
                      <button
                        type="button"
                        className="wish-photo-box__upload-btn wish-photo-box__upload-btn--url"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsManualUrlOpen(true);
                        }}
                      >
                        <Icon name="link" size={14} />
                        <span>Вставить URL</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* State B: Loading (Auto-fetching via Link) */}
            {photoState === 'loading' && (
              <div className="wish-photo-box__loading-content" aria-live="polite">
                <div className="wish-photo-box__spinner" aria-hidden="true" />
                <span className="wish-photo-box__loading-text">
                  Ищем фотографию товара...
                </span>
              </div>
            )}

            {/* State C: Success (Image loaded) */}
            {photoState === 'success' && imageUrl && (
              <>
                <img
                  src={imageUrl}
                  alt={title || 'Фотография желания'}
                  className="wish-photo-box__image"
                  onClick={() => setIsZoomOpen(true)}
                  title="Нажмите для полноразмерного просмотра"
                  style={{ cursor: 'pointer' }}
                />

                {/* Action buttons overlay: Zoom, Replace & Delete */}
                <div className="wish-photo-box__overlay-actions">
                  <button
                    type="button"
                    className="wish-photo-box__action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsZoomOpen(true);
                    }}
                    aria-label="Посмотреть фотографию"
                    title="Посмотреть полноразмерное изображение"
                  >
                    <Icon name="eye" size={15} />
                  </button>
                  <button
                    type="button"
                    className="wish-photo-box__action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    aria-label="Заменить фотографию"
                    title="Заменить фотографию"
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className="wish-photo-box__action-btn wish-photo-box__action-btn--delete"
                    onClick={handleRemovePhoto}
                    aria-label="Удалить фотографию"
                    title="Удалить фотографию"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>

                {/* Auto-fetched pill indicator */}
                {isAutoFetched && (
                  <div className="wish-photo-box__auto-badge">
                    <Icon name="check" size={12} strokeWidth={2.5} />
                    <span>Фото получено по ссылке</span>
                  </div>
                )}
              </>
            )}

            {/* State D: Error (With honest error message and fallback choices) */}
            {photoState === 'error' && (
              <div className="wish-photo-box__error-content" role="status">
                <span className="wish-photo-box__error-text">
                  {photoErrorMsg || 'Не удалось автоматически получить фотографию этого товара'}
                </span>

                {isManualUrlOpen ? (
                  <div
                    className="wish-photo-box__manual-url-form"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="url"
                      className="wish-photo-box__manual-url-input"
                      placeholder="Вставьте ссылку на картинку (https://...)"
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                      autoFocus
                    />
                    <div className="wish-photo-box__manual-url-actions">
                      <button
                        type="button"
                        className="wish-photo-box__manual-url-btn wish-photo-box__manual-url-btn--submit"
                        onClick={handleApplyManualImageUrl}
                      >
                        Применить
                      </button>
                      <button
                        type="button"
                        className="wish-photo-box__manual-url-btn wish-photo-box__manual-url-btn--cancel"
                        onClick={() => setIsManualUrlOpen(false)}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="wish-photo-box__error-actions">
                    <button
                      type="button"
                      className="wish-photo-box__upload-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Icon name="plus" size={14} />
                      <span>Загрузить фото вручную</span>
                    </button>
                    <button
                      type="button"
                      className="wish-photo-box__upload-btn wish-photo-box__upload-btn--url"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsManualUrlOpen(true);
                      }}
                    >
                      <Icon name="link" size={14} />
                      <span>Вставить URL картинки</span>
                    </button>
                    <button
                      type="button"
                      className="wish-photo-box__skip-btn"
                      onClick={handleContinueWithoutPhoto}
                    >
                      <span>Продолжить без фото</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Title Field (Only required field) */}
          <div className="wish-modal-field">
            <label htmlFor="wish-title-input" className="wish-modal-field__label">
              Название желания *
            </label>
            <div
              className={`wish-modal-field__input-wrap ${
                titleError ? 'wish-modal-field__input-wrap--error' : ''
              }`}
            >
              <input
                id="wish-title-input"
                type="text"
                className="wish-modal-field__input"
                placeholder="Например, кашемировый плед"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError(null);
                }}
                aria-invalid={titleError ? 'true' : 'false'}
                required
              />
            </div>
            {titleError && (
              <p className="wish-modal-field__error-text" role="alert">
                {titleError}
              </p>
            )}
          </div>

          {/* 3. Link Field (Key field for auto photo scraping) */}
          <div className="wish-modal-field">
            <label htmlFor="wish-link-input" className="wish-modal-field__label">
              Ссылка на товар или услугу
            </label>
            <div className="wish-modal-field__input-wrap">
              <span className="wish-modal-field__icon" aria-hidden="true">
                <Icon name="external-link" size={16} />
              </span>
              <input
                id="wish-link-input"
                type="url"
                className="wish-modal-field__input"
                placeholder="Вставьте ссылку на товар"
                value={linkUrl}
                onChange={handleLinkChange}
                onPaste={handleLinkPaste}
                autoComplete="off"
                spellCheck="false"
              />
              {photoState === 'success' && isAutoFetched && (
                <span
                  className="wish-modal-field__status-icon wish-modal-field__status-icon--success"
                  title="Фото успешно загружено по ссылке"
                >
                  <Icon name="check" size={16} strokeWidth={2.5} />
                </span>
              )}
            </div>

            {/* Dedicated Action Button: Загрузить фото по ссылке */}
            {linkUrl.trim() && photoState !== 'loading' && (
              <button
                type="button"
                className="wish-fetch-link-btn"
                onClick={handleManualFetchClick}
                title="Загрузить фото по указанной ссылке"
                aria-label="Загрузить фото по указанной ссылке"
              >
                <Icon name="search" size={13} />
                <span>Загрузить фото по ссылке</span>
              </button>
            )}
          </div>

          {/* 4. Price Field (Optional) */}
          <div className="wish-modal-field">
            <label htmlFor="wish-price-input" className="wish-modal-field__label">
              Примерная стоимость
            </label>
            <div className="wish-modal-field__input-wrap">
              <input
                id="wish-price-input"
                type="text"
                inputMode="numeric"
                className="wish-modal-field__input"
                placeholder="Например, 4 500 ₽"
                value={estimatedPrice}
                onChange={handlePriceChange}
              />
              <span className="wish-modal-field__suffix" aria-hidden="true">
                ₽
              </span>
            </div>
          </div>

          {/* 5. Footer Full-Width Submit Button */}
          <div className="wish-modal-footer">
            <button
              type="submit"
              disabled={isSubmitting}
              className="wish-modal-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <div className="wish-photo-box__spinner" style={{ width: '18px', height: '18px' }} />
                  <span>Сохранение...</span>
                </>
              ) : (
                <span>{isEditing ? 'Сохранить изменения' : 'Добавить в вишлист'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Fullscreen Photo Zoom Lightbox (Requirement 7) */}
      {isZoomOpen && imageUrl && (
        <div
          className="wish-lightbox-overlay"
          onClick={() => setIsZoomOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Полноразмерный просмотр фотографии"
        >
          <div className="wish-lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="wish-lightbox-close-btn"
              onClick={() => setIsZoomOpen(false)}
              aria-label="Закрыть полноразмерный просмотр"
            >
              <Icon name="close" size={20} />
            </button>
            <img
              src={imageUrl}
              alt={title || 'Фотография товара'}
              className="wish-lightbox-img"
            />
            {title && <p className="wish-lightbox-caption">{title}</p>}
          </div>
        </div>
      )}
    </>
  );
};
