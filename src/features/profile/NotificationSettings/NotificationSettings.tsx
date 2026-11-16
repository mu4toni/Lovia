import React, { useState } from 'react';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Switch } from '../../../components/ui/Switch/Switch';
import { profileService } from '../../../services/profileService';
import './NotificationSettings.css';

export interface NotificationSettingsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  enabled,
  onToggle,
}) => {
  const [permissionState, setPermissionState] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const handleToggle = async (val: boolean) => {
    if (val) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const perm = await Notification.requestPermission();
          setPermissionState(perm);
          if (perm === 'granted') {
            profileService.setNotificationsEnabled(true);
            onToggle(true);
            return;
          } else {
            // Permission denied by user/browser
            profileService.setNotificationsEnabled(false);
            onToggle(false);
            return;
          }
        } catch {
          // In Telegram WebView Notification.requestPermission may throw or not be supported
        }
      }
    }
    profileService.setNotificationsEnabled(val);
    onToggle(val);
  };

  return (
    <section className="notification-settings" aria-label="Настройки уведомлений">
      <div className="notification-settings__card">
        <div className="notification-settings__left">
          <div className="notification-settings__icon-wrap">
            <Icon name="bell" size={18} className="notification-settings__icon" />
          </div>
          <div className="notification-settings__text">
            <h4 className="notification-settings__title">Уведомления</h4>
          </div>
        </div>

        <div className="notification-settings__switch">
          <Switch
            checked={enabled}
            onChange={handleToggle}
            ariaLabel="Переключатель уведомлений"
          />
        </div>
      </div>

      {permissionState === 'denied' && (
        <div className="notification-settings__warning" role="alert">
          <Icon name="alert" size={14} className="notification-warning-icon" />
          <span>
            Уведомления заблокированы в настройках браузера или Telegram. Чтобы получать напоминания, разрешите уведомления в настройках устройства.
          </span>
        </div>
      )}
    </section>
  );
};
