import { NavLink } from 'react-router-dom';
import { Icon, IconName } from './ui/Icon/Icon';
import { telegramService } from '../services/telegramService';
import { useSpaceMode } from '../hooks/useSpaceMode';
import './BottomNav.css';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  isFeatured?: boolean;
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
      isFeatured: true,
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
            onClick={() => {
              telegramService.hapticImpact('light');
            }}
            className={({ isActive }) =>
              `bottom-nav__item ${item.isFeatured ? 'bottom-nav__item--featured' : ''} ${
                isActive ? 'bottom-nav__item--active' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`bottom-nav__icon ${
                    item.isFeatured ? 'bottom-nav__icon--featured' : ''
                  }`}
                  aria-hidden="true"
                >
                  <Icon
                    name={item.icon}
                    size={item.isFeatured ? 28 : 20}
                    strokeWidth={item.isFeatured ? 2.2 : (isActive ? 2.1 : 1.8)}
                  />
                </span>
                <span
                  className={`bottom-nav__label ${
                    item.isFeatured ? 'bottom-nav__label--featured' : ''
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
