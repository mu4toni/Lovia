import React, { useEffect, useState } from 'react';
import { IconButton } from '../IconButton/IconButton';
import { Icon } from '../Icon/Icon';
import { telegramService } from '../../../services/telegramService';
import './ThemeToggle.css';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const saved = localStorage.getItem('lovia_theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
      telegramService.applyThemeColors(saved);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('lovia_theme', nextTheme);
    telegramService.applyThemeColors(nextTheme);
  };

  return (
    <IconButton
      variant="secondary"
      size="md"
      aria-label={
        theme === 'light'
          ? 'Переключить на тёмную тему'
          : 'Переключить на светлую тему'
      }
      icon={<Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />}
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
    />
  );
};
