import React, { useState, useEffect, memo } from 'react';
import { telegramService } from '../../../services/telegramService';
import './Mascot.css';

export type MascotName =
  | '01_peeking_home'
  | '02_key_register'
  | '03_waving_hello'
  | '04_sending_love_note'
  | '05_nudge_poke'
  | '06_waiting_partner'
  | '07_streak_fire'
  | '08_camera_photo'
  | '09_calendar_anniversary'
  | '10_pair_lock'
  | '11_wishlist_gift'
  | '12_date_coffee'
  | '13_date_cinema'
  | '14_reminder_bell'
  | '15_profile_scarf'
  | '16_relationships_hug'
  | '17_empty_state_box'
  | '18_success_celebrate'
  | '19_loading_tea'
  | '20_error_dizzy'
  | '21_mood_happy'
  | '22_mood_sleepy'
  | '23_mood_sad'
  | '24_mood_angry'
  | '25_mood_miss_you'
  | '26_mood_hungry'
  | '27_mood_working'
  | '28_mood_sick'
  | '29_mood_calm'
  | '30_kiss_goodnight'
  | '31_campfire_zero'
  | '32_peeking_cloud'
  | '33_streak_12_glow'
  | '34_lying_dreaming'
  | '35_peeking_side'
  | '36_high_five'
  | '37_heart_balloon'
  | '38_writing_diary'
  | '39_umbrella_care'
  | '40_sleeping_moon';

export type MascotMood =
  | 'happy'
  | 'love'
  | 'support'
  | 'sleepy'
  | 'camera'
  | 'peek'
  | 'thinking'
  | 'sad'
  | 'home_jump'
  | 'registration_invite'
  | 'error_splat'
  | 'error_oops'
  | 'empty_wishlist'
  | 'empty_dates'
  | 'bouquet'
  | 'surprised';

export type MascotVariant = 'love' | 'sleepy' | 'peek';

export interface MascotProps {
  /** Preferred sticker filename without .png (e.g. "01_peeking_home") */
  name?: MascotName | string;
  /** Legacy mood alias */
  mood?: MascotMood;
  /** Legacy variant alias */
  variant?: MascotVariant;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  /** Set loading="eager" for above-the-fold / first-frame stickers */
  eager?: boolean;
  animated?: boolean;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  onClick?: () => void;
}

const LEGACY_MOOD_MAP: Record<MascotMood, MascotName> = {
  happy: '21_mood_happy',
  love: '37_heart_balloon',
  support: '39_umbrella_care',
  sleepy: '40_sleeping_moon',
  camera: '08_camera_photo',
  peek: '01_peeking_home',
  thinking: '38_writing_diary',
  sad: '23_mood_sad',
  home_jump: '03_waving_hello',
  registration_invite: '02_key_register',
  error_splat: '20_error_dizzy',
  error_oops: '20_error_dizzy',
  empty_wishlist: '11_wishlist_gift',
  empty_dates: '08_camera_photo',
  bouquet: '37_heart_balloon',
  surprised: '01_peeking_home',
};

const FALLBACK_STICKER_SRC = '/mascot/01_peeking_home.webp';

export const Mascot: React.FC<MascotProps> = memo(({
  name,
  mood,
  variant,
  size,
  width,
  height,
  eager = false,
  animated = false,
  interactive = false,
  className = '',
  style,
  alt = '',
  onClick,
}) => {
  const resolvedFile =
    name ||
    (mood ? LEGACY_MOOD_MAP[mood] : undefined) ||
    (variant ? LEGACY_MOOD_MAP[variant] : undefined) ||
    '01_peeking_home';

  const [useFallback, setUseFallback] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const [hearts, setHearts] = useState<
    { id: number; symbol: string; left: string; size: number }[]
  >([]);

  useEffect(() => {
    setUseFallback(false);
  }, [resolvedFile]);

  const primarySrc = `/mascot/${resolvedFile}.webp`;
  const currentSrc = useFallback ? FALLBACK_STICKER_SRC : primarySrc;

  const w = width ?? size;
  const h = height ?? size;

  const sizeStyle: React.CSSProperties = {
    ...style,
    ...(w !== undefined ? { width: typeof w === 'number' ? `${w}px` : w } : {}),
    ...(h !== undefined ? { height: typeof h === 'number' ? `${h}px` : h } : {}),
  };

  const isClickable = interactive || Boolean(onClick);

  // Lean decorative render: direct <img> with zero pointer interception
  if (!isClickable) {
    return (
      <img
        src={currentSrc}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className={`lovia-mascot lovia-mascot__img lovia-mascot--decorative ${
          animated ? 'lovia-mascot--animated' : ''
        } ${className}`}
        style={sizeStyle}
        onError={() => {
          if (!useFallback && primarySrc !== FALLBACK_STICKER_SRC) {
            setUseFallback(true);
          }
        }}
      />
    );
  }

  const handleClick = () => {
    if (interactive) {
      setIsTapped(true);
      telegramService.hapticImpact('light');

      const now = Date.now();
      const newHearts = [
        { id: now + 1, symbol: '♥', left: '22%', size: 15 },
        { id: now + 2, symbol: '✦', left: '52%', size: 13 },
        { id: now + 3, symbol: '♡', left: '76%', size: 16 },
      ];
      setHearts((prev) => [...prev, ...newHearts]);

      setTimeout(() => {
        setHearts((prev) => prev.filter((item) => !newHearts.some((nh) => nh.id === item.id)));
      }, 850);

      setTimeout(() => setIsTapped(false), 500);
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`lovia-mascot lovia-mascot--interactive ${
        animated ? 'lovia-mascot--animated' : ''
      } ${isTapped ? 'lovia-mascot--tapped' : ''} ${className}`}
      style={sizeStyle}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={alt || 'Медвежонок Бин'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <img
        src={currentSrc}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className="lovia-mascot__img"
        onError={() => {
          if (!useFallback && primarySrc !== FALLBACK_STICKER_SRC) {
            setUseFallback(true);
          }
        }}
      />
      {hearts.map((item) => (
        <span
          key={item.id}
          className="lovia-mascot__float-heart"
          style={{ left: item.left, fontSize: `${item.size}px` }}
          aria-hidden="true"
        >
          {item.symbol}
        </span>
      ))}
    </div>
  );
});
