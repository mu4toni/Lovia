import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfileData } from '../../../services/profileService';
import { Avatar } from '../../../components/ui/Avatar/Avatar';
import { Icon } from '../../../components/ui/Icon/Icon';
import { formatMonthYearGenitive } from '../../../utils/dateCalculations';
import { telegramService } from '../../../services/telegramService';
import { useSpaceMode } from '../../../hooks/useSpaceMode';
import { AvatarCropModal } from '../AvatarCropModal/AvatarCropModal';
import './ProfileHeader.css';

export interface ProfileHeaderProps {
  user: UserProfileData;
  partnerName?: string;
  isPartnerConnected: boolean;
  onUpdateName: (newName: string) => void;
  onUpdateAvatar: (newAvatarUrl: string) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  partnerName,
  isPartnerConnected,
  onUpdateName,
  onUpdateAvatar,
}) => {
  const navigate = useNavigate();
  const { isFriendship } = useSpaceMode();
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveInlineName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (clean) {
      onUpdateName(clean);
      setIsEditingInline(false);
      telegramService.hapticImpact('light');
    }
  };

  const handleCancelInlineName = () => {
    setNameInput(user.name);
    setIsEditingInline(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawImageForCrop(reader.result);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Formatted registration date (e.g., "В Lovia с октября 2025 г.")
  const joinDateText = (() => {
    try {
      return `В Lovia с ${formatMonthYearGenitive(user.joinedDate)}`;
    } catch {
      return 'В Lovia с октября 2025 г.';
    }
  })();

  return (
    <section className="profile-hero-card" aria-label="Карточка профиля пользователя">
      <div className="profile-hero-card__glow" aria-hidden="true" />

      <div className="profile-hero-card__body">
        {/* Telegram-style Centered 96px Round Avatar */}
        <div className="profile-hero-card__avatar-wrap">
          <div
            className="profile-hero-card__avatar-frame"
            onClick={() => {
              telegramService.hapticImpact('light');
              fileInputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
            title="Нажмите, чтобы сменить фото"
            aria-label="Изменить фотографию профиля"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <Avatar name={user.name} src={user.avatarUrl} size="lg" className="profile-hero-avatar" />
          </div>

          <button
            type="button"
            className="profile-hero-card__avatar-btn"
            onClick={() => {
              telegramService.hapticImpact('light');
              fileInputRef.current?.click();
            }}
            title="Изменить фотографию"
            aria-label="Изменить фотографию профиля"
          >
            <Icon name="camera" size={16} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* Telegram-style Centered User Info */}
        <div className="profile-hero-card__info">
          {/* Centered Name / Inline Editing */}
          {isEditingInline ? (
            <form onSubmit={handleSaveInlineName} className="profile-hero-card__inline-form">
              <input
                type="text"
                className="profile-hero-card__inline-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                autoFocus
                aria-label="Имя пользователя"
                placeholder="Ваше имя"
              />
              <div className="profile-hero-card__inline-actions">
                <button
                  type="submit"
                  className="profile-hero-card__inline-btn profile-hero-card__inline-btn--save"
                  title="Сохранить"
                  aria-label="Сохранить имя"
                  disabled={!nameInput.trim()}
                >
                  <Icon name="check" size={16} />
                </button>
                <button
                  type="button"
                  className="profile-hero-card__inline-btn profile-hero-card__inline-btn--cancel"
                  onClick={handleCancelInlineName}
                  title="Отмена"
                  aria-label="Отменить редактирование имени"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-hero-card__name-row">
              <h1 className="profile-hero-card__name">{user.name}</h1>
              <button
                type="button"
                className="profile-hero-card__edit-btn"
                onClick={() => {
                  telegramService.hapticImpact('light');
                  setNameInput(user.name);
                  setIsEditingInline(true);
                }}
                title="Изменить имя"
                aria-label="Изменить имя профиля"
              >
                <Icon name="edit" size={15} />
              </button>
            </div>
          )}

          {/* Centered Connection Status Badge */}
          <div className="profile-hero-card__status-wrap">
            {isPartnerConnected && partnerName ? (
              <span
                className="profile-hero-card__badge profile-hero-card__badge--connected"
                role="button"
                tabIndex={0}
                onClick={() => {
                  telegramService.hapticImpact('light');
                  navigate('/relationship');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    telegramService.hapticImpact('light');
                    navigate('/relationship');
                  }
                }}
                title={isFriendship ? 'Перейти в раздел Дружба' : 'Перейти в раздел Отношения'}
                aria-label={
                  isFriendship
                    ? `Друзья с ${partnerName}. Нажмите для перехода в Дружбу.`
                    : `В паре с ${partnerName}. Нажмите для перехода в Отношения.`
                }
              >
                <span className="profile-hero-dot" aria-hidden="true" />
                <span>{isFriendship ? `Друзья с ${partnerName}` : `В паре с ${partnerName}`}</span>
                <span className="profile-hero-heart">
                  <Icon name={isFriendship ? 'sparkles' : 'heart-filled'} size={12} />
                </span>
                <Icon name="chevron-right" size={12} className="profile-hero-chevron" />
              </span>
            ) : (
              <span className="profile-hero-card__badge profile-hero-card__badge--unpaired">
                <span className="profile-hero-dot profile-hero-dot--offline" aria-hidden="true" />
                <span>{isFriendship ? 'Друг не подключён' : 'Партнёр не подключён'}</span>
              </span>
            )}
          </div>

          {/* Centered Registration Date */}
          <p className="profile-hero-card__joined">{joinDateText}</p>
        </div>
      </div>

      {/* Avatar Crop Modal */}
      {rawImageForCrop && (
        <AvatarCropModal
          isOpen={isCropModalOpen}
          imageSrc={rawImageForCrop}
          onClose={() => {
            setIsCropModalOpen(false);
            setRawImageForCrop(null);
          }}
          onCropComplete={(croppedDataUrl) => {
            onUpdateAvatar(croppedDataUrl);
            setIsCropModalOpen(false);
            setRawImageForCrop(null);
          }}
        />
      )}
    </section>
  );
};
