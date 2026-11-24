import { useState, useEffect } from 'react';
import { useToast } from '../components/ui/Toast/ToastContext';
import {
  ProfileHeader,
  PartnerInfoCard,
  AppearanceSettings,
  NotificationSettings,
  SharedSpaceSettings,
  DangerZone,
} from '../features/profile';
import { profileService, UserProfileData, PartnerProfileData } from '../services/profileService';
import { relationshipService } from '../services/relationshipService';
import { telegramService } from '../services/telegramService';
import './ProfilePage.css';

export function ProfilePage() {
  const { showToast } = useToast();

  const [user, setUser] = useState<UserProfileData>(() => profileService.getUserProfile());
  const [partner, setPartner] = useState<PartnerProfileData>(() =>
    profileService.getPartnerProfile()
  );
  const [startDate, setStartDate] = useState<string>(() => relationshipService.getStartDate());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() =>
    profileService.getNotificationsEnabled()
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem('lovia_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      telegramService.applyThemeColors(savedTheme);
    }

    const handleProfileUpdate = () => {
      setUser(profileService.getUserProfile());
      setPartner(profileService.getPartnerProfile());
      setNotificationsEnabled(profileService.getNotificationsEnabled());
    };

    const handleRelationshipUpdate = () => {
      setStartDate(relationshipService.getStartDate());
    };

    window.addEventListener('lovia_profile_updated', handleProfileUpdate);
    window.addEventListener('lovia_relationship_updated', handleRelationshipUpdate);

    return () => {
      window.removeEventListener('lovia_profile_updated', handleProfileUpdate);
      window.removeEventListener('lovia_relationship_updated', handleRelationshipUpdate);
    };
  }, []);

  const handleUpdateName = async (newName: string) => {
    try {
      await profileService.updateUserName(newName);
      setUser(profileService.getUserProfile());
      showToast({ title: 'Сохранено', message: 'Имя успешно сохранено', type: 'love' });
    } catch (err: any) {
      showToast({
        title: 'Ошибка сохранения',
        message: err.message || 'Не удалось сохранить имя',
        type: 'warning',
      });
    }
  };

  const handleUpdateAvatar = async (newAvatarUrl: string) => {
    try {
      await profileService.updateUserAvatar(newAvatarUrl);
      setUser(profileService.getUserProfile());
      showToast({ title: 'Сохранено', message: 'Новое фото профиля сохранено', type: 'love' });
    } catch (err: any) {
      showToast({
        title: 'Ошибка загрузки фото',
        message: err.message || 'Не удалось загрузить аватар',
        type: 'warning',
      });
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('lovia_theme', newTheme);
    telegramService.applyThemeColors(newTheme);
  };

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
  };

  const handleStartDateChanged = (newDate: string) => {
    setStartDate(newDate);
  };

  const handlePartnerStatusChanged = () => {
    setPartner(profileService.getPartnerProfile());
  };

  return (
    <div className="profile-page" data-testid="profile-page">
      {/* 1. Profile Hero Card: User Avatar, Name edit, Joined date, Connection badge */}
      <ProfileHeader
        user={user}
        partnerName={partner.name}
        isPartnerConnected={partner.isPartnerConnected}
        onUpdateName={handleUpdateName}
        onUpdateAvatar={handleUpdateAvatar}
      />

      {/* 2. Partner Info Card: Online status, Days together, Link to chronicle */}
      <PartnerInfoCard partner={partner} startDate={startDate} />

      {/* 3. Theme & Appearance Settings: Light / Dark interactive cards */}
      <AppearanceSettings theme={theme} onThemeChange={handleThemeChange} />

      {/* 4. Notification Settings: Toggle switch with permissions handling */}
      <NotificationSettings
        enabled={notificationsEnabled}
        onToggle={handleToggleNotifications}
      />

      {/* 5. Shared Space Settings: Start date editor, Couple code, Unpair / Reconnect */}
      <SharedSpaceSettings
        partner={partner}
        startDate={startDate}
        onStartDateChanged={handleStartDateChanged}
        onPartnerStatusChanged={handlePartnerStatusChanged}
      />

      {/* 6. Danger Zone: Bottom account deletion with clear policies */}
      <DangerZone />
    </div>
  );
}
