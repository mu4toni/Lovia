import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card/Card';
import { Button } from '../components/ui/Button/Button';
import { Icon } from '../components/ui/Icon/Icon';
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
import { isLocalDevHost } from '../utils/env';
import './ProfilePage.css';

export function ProfilePage() {
  const navigate = useNavigate();

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

  const handleUpdateName = (newName: string) => {
    profileService.updateUserName(newName);
    setUser(profileService.getUserProfile());
  };

  const handleUpdateAvatar = (newAvatarUrl: string) => {
    profileService.updateUserAvatar(newAvatarUrl);
    setUser(profileService.getUserProfile());
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

      {/* 7. Developer Tools Card: Link to design system */}
      {isLocalDevHost() && (
        <Card variant="solid" className="profile-dev-card">
          <div className="profile-dev-card__header">
            <Icon name="sparkles" size={17} className="profile-dev-card__icon" />
            <h3 className="profile-dev-card__title">Инструменты разработчика</h3>
          </div>
          <Button
            variant="secondary"
            fullWidth
            size="md"
            leftIcon={<Icon name="sparkles" size={16} />}
            onClick={() => navigate('/design')}
          >
            Дизайн-система Lovia
          </Button>
        </Card>
      )}

      {/* 8. Danger Zone: Bottom account deletion with clear policies */}
      <DangerZone />
    </div>
  );
}
