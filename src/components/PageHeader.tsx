import React from 'react';
import { Icon, IconName } from './ui/Icon/Icon';
import './PageHeader.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  iconName?: IconName;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, iconName, icon }: PageHeaderProps) {
  return (
    <div className="page-header">
      {(iconName || icon) && (
        <div className="page-header__icon-badge" aria-hidden="true">
          {iconName ? <Icon name={iconName} size={28} /> : icon}
        </div>
      )}
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </div>
  );
}
