# Lovialy — Design System Master Blueprint
> Powered by:
> - **UI/UX Pro Max** ([uupm.cc](https://www.uupm.cc)) — Design Intelligence & Structure
> - **Taste Skill** ([tasteskill.dev](https://tasteskill.dev)) — Anti-Slop & Human Art-Direction
> - **Motion Design Skill** ([LottieFiles](https://github.com/LottieFiles/motion-design-skill)) — Physics-based Animation Choreography
> 
> Single Source of Truth for Lovialy (Telegram Mini App for Couples).

---

## 1. Product Archetype & Calibration

| Dimension | Specification |
|---|---|
| **Product Category** | Couple Space / Intimate Life Organizer / Romance |
| **Aesthetic Archetype** | **iOS Liquid Glass (Glassmorphism 2.0)** |
| **Motion Archetype** | **Playful & Warm (LottieFiles Motion Standard)** |
| **Tone of Voice** | Warm, intimate, supportive, delightful, human (non-robotic) |
| **Target Platform** | Telegram Mini App (iOS & Android WebView, Desktop Web) |
| **`DESIGN_VARIANCE`** | **6 / 10** (Curated, bespoke, distinctive layout touches) |
| **`MOTION_INTENSITY`** | **5 / 10** (Tactile spring responses, active scale 0.97, gentle pulse) |
| **`VISUAL_DENSITY`** | **5 / 10** (Comfortable mobile rhythm, zero cramped clutter) |

---

## 2. Motion Design Choreography (LottieFiles Rules)

### Timing & Duration Scale
- **Micro-interactions (Tap / Switch / Checkbox)**: `120ms – 160ms`
- **Card hover / State changes**: `200ms – 250ms`
- **Toasts & alerts**: `250ms – 320ms`
- **Bottom Sheet / Modal entrance**: `350ms – 400ms`

### Easing Families
- **Entrance (Decelerate)**: `cubic-bezier(0.16, 1, 0.3, 1)` (Swift out-of-screen arrival, gentle landing)
- **Exit (Accelerate)**: `cubic-bezier(0.7, 0, 0.84, 0)` (Decisive quick departure)
- **Micro-Spring (Bounce)**: `cubic-bezier(0.34, 1.56, 0.64, 1)` (Tactile satisfaction for checkmarks)

### 3-Layer Motion Hierarchy
1. **Primary Layer**: The functional card or modal sliding into view.
2. **Secondary Layer**: Subtle drop-shadow depth shift and border glow settling into place.
3. **Ambient Layer**: Continuous subtle breathing (e.g., `heartPulse` on the couple connector badge).

### Accessibility Rule
- Every animation is gated with `@media (prefers-reduced-motion: reduce)` to eliminate vestibular discomfort.

### Key Liquid Glass Specification
- **Backdrop Blur**: `blur(20px) saturate(180%)`
- **Light Surface**: `rgba(255, 255, 255, 0.72)` (fallback: `#ffffff` when blur unsupported)
- **Dark Surface**: `rgba(32, 24, 38, 0.68)` (fallback: `#1F1725`)
- **Specular Border**: `1px solid rgba(255, 255, 255, 0.8)` (light) / `rgba(255, 255, 255, 0.12)` (dark)
- **Inner Light Highlight**: `inset 0 1px 1px 0 rgba(255, 255, 255, 0.85)`
- **Depth Shadow**: `0 8px 30px rgba(0, 0, 0, 0.06)`

---

## 2. Anti-Slop Directives (Taste Skill Rules)

1. **No Hero Slop**: Never create centered 3-line headline blocks with generic purple gradient blobs.
2. **No 3-Card Template Grids**: Replace cookie-cutter card grids with contextual, rhythmic components (such as our horizontal fluid calendar strip and couple requests stream).
3. **No Robot Copy**: Replace dry placeholders with heartwarming, natural Russian microcopy (e.g. *«Марсель ждёт блинчики 🥐»*, *«С меня крепкие обнимашки 🥰»*, *«Всё сделано, можно отдыхать и обниматься! 🥰»*).
4. **Tactile Feedback**: Every interactive node must react instantly (`transform: scale(0.97)` on active, checkmark bounce, fluid bottom sheet glide).
5. **A11y First (WCAG 2.1 AA)**: Minimum 44×44px hit slop, visible focus rings, and contrast $\ge 4.5:1$.

---

## 2. Color Palette & WCAG Compliance

### Primary Brand
- **Primary Accent**: `#FF3366` (Romantic Berry Rose)
- **Primary Gradient**: `linear-gradient(135deg, #FF3366 0%, #FF6B8B 100%)`
- **Glow**: `0 8px 24px -4px rgba(255, 51, 102, 0.35)`

### Category Tokens (Couples Tasks)
- 💖 **Свидания (Dates)**: `#FF3366` / tint `rgba(255, 51, 102, 0.14)`
- 🧺 **Быт и забота (Chores)**: `#0284C7` (High Contrast Blue) / tint `rgba(2, 132, 199, 0.14)`
- 🎁 **Сюрпризы (Gifts)**: `#B45309` (Warm Amber, WCAG AA 4.6:1) / tint `rgba(180, 83, 9, 0.14)`
- ✨ **Желания (Wishes)**: `#7C3AED` (Royal Violet, WCAG AA 5.8:1) / tint `rgba(124, 58, 237, 0.14)`
- 📸 **Воспоминания (Memories)**: `#047857` (Emerald, WCAG AA 4.6:1) / tint `rgba(4, 120, 87, 0.14)`

### Urgency Levels
- 🟢 **Спокойно (Low)**: `#047857` (WCAG AA 4.6:1 on light)
- 🟡 **Важно (Medium)**: `#B45309` (WCAG AA 4.6:1 on light)
- 🔴 **Срочно (High)**: `#DC2626` (WCAG AA 4.8:1 on light)

### Contrast Ratios (WCAG 2.1 AA)
- Primary text on white: `17.4:1` (AAA)
- Secondary text on white: `8.2:1` (AAA)
- Dark mode text: `18.2:1` (AAA)

---

## 3. Typography System

**Stack**: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif`

| Token | Size / Line Height | Weight | Letter Spacing |
|---|---|---|---|
| **Display** | 26px / 32px | 800 (ExtraBold) | -0.5px |
| **Title 1** | 20px / 24px | 800 (ExtraBold) | -0.4px |
| **Title 2** | 18px / 22px | 700 (Bold) | -0.3px |
| **Title 3** | 15px / 20px | 700 (Bold) | -0.2px |
| **Body** | 14px / 20px | 500 (Medium) | Normal |
| **Caption** | 12.5px / 16px | 500 (Medium) | +0.2px |
| **Badge** | 11px / 13px | 700 (Bold) | +0.5px (Uppercase) |

---

## 4. Interaction & Motion Rules

- **Tap Feedback**: `transform: scale(0.97)` on `:active`, spring timing `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Modals / Bottom Sheets**: Slide-up spring translation `translateY(100%) -> translateY(0)` with blurred backdrop `blur(8px)`.
- **Task Completion**: Animated SVG checkmark bounce + smooth strike-through opacity transition.
- **Floating Heart**: Subtly pulsing `keyframes heartPulse` (1.8s ease-in-out) connecting partner avatars.
- **Accessibility**: Automatic fallback for users with `prefers-reduced-motion: reduce`.

---

## 5. Anti-Patterns Checklist (Strictly Prohibited)

- ❌ **No Generic Vibe-Coding**: Never dump arbitrary purple-pink neon backgrounds that destroy contrast.
- ❌ **No Orphaned Form Inputs**: Every field must have an explicit linked `<label htmlFor="...">`.
- ❌ **No Sub-44px Tap Targets**: Every clickable button, tab, and toggle must be at least 44x44px.
- ❌ **No Static Stiff Buttons**: All interactive elements must react visually to taps.
- ❌ **No Hardcoded Screen Layouts**: Always respect `env(safe-area-inset-bottom)` and flexible viewport sizing.
