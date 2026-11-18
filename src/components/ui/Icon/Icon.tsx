import React from 'react';
import './Icon.css';

export type IconName =
  | 'home'
  | 'wishlist'
  | 'relationship'
  | 'dates'
  | 'profile'
  | 'calendar'
  | 'clock'
  | 'plus'
  | 'check'
  | 'trash'
  | 'close'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-right'
  | 'chevron-left'
  | 'search'
  | 'sparkles'
  | 'heart'
  | 'heart-filled'
  | 'bell'
  | 'copy'
  | 'share'
  | 'sun'
  | 'moon'
  | 'pin'
  | 'gift'
  | 'alert'
  | 'check-circle'
  | 'tag'
  | 'note'
  | 'edit'
  | 'palette'
  | 'folder'
  | 'external-link'
  | 'image'
  | 'eye'
  | 'sort'
  | 'camera'
  | 'link'
  | 'book'
  | 'more-vertical'
  | 'shopping-bag'
  | 'cart'
  | 'coffee'
  | 'car'
  | 'briefcase'
  | 'film'
  | 'music'
  | 'star'
  | 'paw'
  | 'plane'
  | 'mail';

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name: IconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  strokeWidth = 1.85,
  className = '',
  ...props
}) => {
  const renderPath = () => {
    switch (name) {
      case 'home':
        return (
          <>
            <path d="M4 11.2a1.8 1.8 0 01.5-1.2l6-5.4a2.2 2.2 0 013 0l6 5.4a1.8 1.8 0 01.5 1.2V18.5a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 18.5V11.2z" />
            <path d="M9.5 21v-5.5a2 2 0 012-2h1a2 2 0 012 2V21" />
          </>
        );

      case 'wishlist':
      case 'gift':
        return (
          <>
            <rect x="3" y="8" width="18" height="4" rx="1.5" />
            <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
            <path d="M12 8v13" />
            <path d="M12 8H7.5a2.5 2.5 0 010-5C11 3 12 8 12 8z" />
            <path d="M12 8h4.5a2.5 2.5 0 000-5C13 3 12 8 12 8z" />
          </>
        );

      case 'relationship':
      case 'heart':
        return (
          <path d="M12 20.3s-7-4.4-9.2-8.3C1.2 9 2.4 5.5 5.5 4.5c2.4-.8 5 .3 6.5 2.2 1.5-1.9 4.1-3 6.5-2.2 3.1 1 4.3 4.5 2.7 7.5-2.2 3.9-9.2 8.3-9.2 8.3z" />
        );

      case 'heart-filled':
        return (
          <path
            d="M12 20.3s-7-4.4-9.2-8.3C1.2 9 2.4 5.5 5.5 4.5c2.4-.8 5 .3 6.5 2.2 1.5-1.9 4.1-3 6.5-2.2 3.1 1 4.3 4.5 2.7 7.5-2.2 3.9-9.2 8.3-9.2 8.3z"
            fill="currentColor"
            stroke="none"
          />
        );

      case 'dates':
      case 'calendar':
        return (
          <>
            <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
            <path d="M16 2.8v3.5" />
            <path d="M8 2.8v3.5" />
            <path d="M3.5 10.2h17" />
            <circle cx="8" cy="14" r=".9" fill="currentColor" stroke="none" />
            <circle cx="12" cy="14" r=".9" fill="currentColor" stroke="none" />
            <circle cx="16" cy="14" r=".9" fill="currentColor" stroke="none" />
          </>
        );

      case 'profile':
        return (
          <>
            <circle cx="12" cy="8" r="4.2" />
            <path d="M5 19.5c0-3.6 3.1-5.8 7-5.8s7 2.2 7 5.8" />
          </>
        );

      case 'bell':
        return (
          <>
            <path d="M18 9a6 6 0 00-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15.5 18 9z" />
            <path d="M10.2 20.5a2.5 2.5 0 003.6 0" />
          </>
        );

      case 'clock':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.2v5l3.2 2" />
          </>
        );

      case 'plus':
        return (
          <>
            <path d="M12 5.5v13" />
            <path d="M5.5 12h13" />
          </>
        );

      case 'check':
        return <path d="M4.5 12.5l5 5L19.5 6.5" />;

      case 'check-circle':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 12.2l2.4 2.4 4.8-4.8" />
          </>
        );

      case 'trash':
        return (
          <>
            <path d="M4.5 6.5h15" />
            <path d="M9.5 6.5V4.2a1.7 1.7 0 011.7-1.7h1.6a1.7 1.7 0 011.7 1.7v2.3" />
            <path d="M18 6.5l-1 13a2.5 2.5 0 01-2.5 2.5H9.5a2.5 2.5 0 01-2.5-2.5l-1-13" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </>
        );

      case 'edit':
        return (
          <>
            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            <path d="M14.5 5.5l3 3" />
          </>
        );

      case 'close':
        return (
          <>
            <path d="M6.5 6.5l11 11" />
            <path d="M17.5 6.5l-11 11" />
          </>
        );

      case 'chevron-down':
        return <path d="M6.5 9.5l5.5 5.5 5.5-5.5" />;

      case 'chevron-up':
        return <path d="M17.5 14.5l-5.5-5.5-5.5 5.5" />;

      case 'chevron-right':
        return <path d="M9.5 6.5l5.5 5.5-5.5 5.5" />;

      case 'chevron-left':
        return <path d="M14.5 17.5l-5.5-5.5 5.5-5.5" />;

      case 'palette':
        return (
          <>
            <path d="M12 2.5a9.5 9.5 0 000 19c1.6 0 2.5-1.1 2.5-2.2 0-.6-.2-1.2-.6-1.6-.4-.4-.6-.9-.6-1.5 0-1.1.9-2 2-2H17a4.5 4.5 0 004.5-4.5c0-4-4.2-7.2-9.5-7.2z" />
            <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
            <circle cx="11.5" cy="7.2" r="1" fill="currentColor" stroke="none" />
            <circle cx="16.5" cy="8.8" r="1" fill="currentColor" stroke="none" />
          </>
        );

      case 'sun':
        return (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2" />
            <path d="M12 19.5v2" />
            <path d="M4.8 4.8l1.4 1.4" />
            <path d="M17.8 17.8l1.4 1.4" />
            <path d="M2.5 12h2" />
            <path d="M19.5 12h2" />
            <path d="M4.8 19.2l1.4-1.4" />
            <path d="M17.8 6.2l1.4-1.4" />
          </>
        );

      case 'moon':
        return (
          <path d="M20.5 13.5a8.5 8.5 0 11-10-10 7 7 0 0010 10z" />
        );

      case 'tag':
        return (
          <>
            <path d="M20 12.5l-7.5 7.5a2.5 2.5 0 01-3.5 0l-5-5a2.5 2.5 0 010-3.5L11.5 4a2 2 0 011.5-.6H19a2 2 0 012 2v6c0 .6-.2 1.1-.6 1.5z" />
            <circle cx="16" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
          </>
        );

      case 'folder':
        return (
          <path d="M3.5 6.5A2.5 2.5 0 016 4h3.2a2.5 2.5 0 011.8.8l1.4 1.4a1.5 1.5 0 001.1.5H18A2.5 2.5 0 0120.5 9v9.5A2.5 2.5 0 0118 21H6a2.5 2.5 0 01-2.5-2.5V6.5z" />
        );

      case 'sparkles':
        return (
          <>
            <path d="M12 3c.4 3 2 5.5 5 6-3 .5-4.6 3-5 6-.4-3-2-5.5-5-6 3-.5 4.6-3 5-6z" />
            <path d="M19 16c.2 1.3.8 2.2 2 2.5-1.2.3-1.8 1.2-2 2.5-.2-1.3-.8-2.2-2-2.5 1.2-.3 1.8-1.2 2-2.5z" />
          </>
        );

      case 'pin':
        return (
          <>
            <path d="M12 21.5s-6.5-6.2-6.5-11a6.5 6.5 0 0113 0c0 4.8-6.5 11-6.5 11z" />
            <circle cx="12" cy="10.5" r="2.2" />
          </>
        );

      case 'alert':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5" />
            <circle cx="12" cy="16" r=".9" fill="currentColor" stroke="none" />
          </>
        );

      case 'copy':
        return (
          <>
            <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
            <path d="M5.5 15.5H5a2 2 0 01-2-2V5a2 2 0 012-2h8.5a2 2 0 012 2v.5" />
          </>
        );

      case 'share':
        return (
          <>
            <circle cx="18" cy="5" r="2.8" />
            <circle cx="6" cy="12" r="2.8" />
            <circle cx="18" cy="19" r="2.8" />
            <path d="M8.6 10.7l6.8-4.4" />
            <path d="M8.6 13.3l6.8 4.4" />
          </>
        );

      case 'note':
        return (
          <>
            <rect x="4.5" y="3.5" width="15" height="17" rx="3" />
            <path d="M8.5 8.5h7" />
            <path d="M8.5 12.5h7" />
            <path d="M8.5 16.5h4" />
          </>
        );

      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </>
        );

      case 'external-link':
        return (
          <>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </>
        );

      case 'image':
        return (
          <>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </>
        );

      case 'eye':
        return (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        );

      case 'sort':
        return (
          <>
            <path d="M7 16V4m0 0L3 8m4-4l4 4" />
            <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </>
        );

      case 'camera':
        return (
          <>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </>
        );

      case 'link':
        return (
          <>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </>
        );

      case 'book':
        return (
          <>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </>
        );

      case 'more-vertical':
        return (
          <>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
          </>
        );

      case 'shopping-bag':
      case 'cart':
        return (
          <>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </>
        );

      case 'coffee':
        return (
          <>
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </>
        );

      case 'car':
        return (
          <>
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C1.4 11.2 1 12 1 12.8V16c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </>
        );

      case 'briefcase':
        return (
          <>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </>
        );

      case 'film':
        return (
          <>
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </>
        );

      case 'music':
        return (
          <>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </>
        );

      case 'star':
        return (
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        );

      case 'paw':
        return (
          <>
            <circle cx="12" cy="16" r="3.5" />
            <circle cx="7" cy="11" r="1.8" />
            <circle cx="17" cy="11" r="1.8" />
            <circle cx="9.5" cy="6.5" r="1.5" />
            <circle cx="14.5" cy="6.5" r="1.5" />
          </>
        );

      case 'plane':
        return (
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.7-.1-1.3.2-1.5.8l-.3.9 5.5 3.5-3.5 3.5-2.2-.4-.8.8 2.5 1.5 1.5 2.5.8-.8-.4-2.2 3.5-3.5 3.5 5.5.9-.3c.6-.2.9-.8.8-1.5z" />
        );

      case 'mail':
        return (
          <>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </>
        );

      default:
        return <circle cx="12" cy="12" r="4" />;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lovia-icon lovia-icon--${name} ${className}`}
      aria-hidden="true"
      {...props}
    >
      {renderPath()}
    </svg>
  );
};
