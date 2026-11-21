import { NavLink } from 'react-router-dom';
import { Icon, IconName } from './ui/Icon/Icon';
import { telegramService } from '../services/telegramService';
import { useSpaceMode } from '../hooks/useSpaceMode';
import './BottomNav.css';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

export function BottomNav() {
  const { isFriendship } = useSpaceMode();

  const navItems: NavItem[] = [
    { to: '/', label: 'Дом', icon: 'home' },
    { to: '/wishlist', label: 'Вишлисты', icon: 'wishlist' },
    {
      to: '/relationship',
      label: isFriendship ? 'Дружба' : 'Отношения',
      icon: isFriendship ? 'sparkles' : 'relationship',
    },
    {
      to: '/dates',
      label: isFriendship ? 'Встречи' : 'Свидания',
      icon: 'dates',
    },
    { to: '/profile', label: 'Профиль', icon: 'profile' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <div className="bottom-nav__dock">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => {
              telegramService.hapticImpact('light');
            }}
            className={({ isActive }) =>
              `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="bottom-nav__icon-wrap" aria-hidden="true">
                  <span className="bottom-nav__icon">
                    <Icon
                      name={item.icon}
                      size={isActive ? 20 : 21}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                  </span>
                </span>
                <span className="bottom-nav__label">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
