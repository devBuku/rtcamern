# UI/UX: Theming, Wallpapers, Keyboard Sounds & Polish

This document covers the UI/UX aspects of **rtcamern**: theming (Dark/Light + multiple themes), chat wallpapers, optional keyboard sound effects, design system, responsiveness, accessibility, and the planned UI polish approach.

Since this is a learning project, the focus is on understanding how to build a customizable, polished chat UI using **Tailwind CSS** and **Hero UI**.

---

## Overview

The frontend will deliver a modern real-time chat experience with personalization options:

- **Dark/Light Mode** – System/user toggle with persistence
- **Multiple Themes** – Theme variants via Hero UI + Tailwind
- **Wallpapers** – Selectable chat background per view/user preference
- **Keyboard Sound Effects** – Optional click sounds on actions (send, typing, etc.)
- **Polished Chat UI** – Message bubbles, avatars, timestamps, read receipts, typing indicator
- **Responsive Design** – Works on mobile, tablet, desktop
- **Accessibility (a11y)** – Keyboard nav, focus states, ARIA labels, color contrast

---

## Tech Stack (UI)

| Tool | Purpose | Notes |
|---|---|---|
| **[React](https://react.dev/)** | UI Framework | Component-based, hooks for state/effects. |
| **[Vite](https://vite.dev/)** | Build tool | Fast HMR, TypeScript support. |
| **[TypeScript](https://www.typescriptlang.org/)** | Type safety | Shared types between frontend/backend where helpful. |
| **[Tailwind CSS](https://tailwindcss.com/)** | Utility-first CSS | Rapid styling, consistent spacing, responsive design. |
| **[Hero UI](https://heroui.com/)** | Component Library | Accessible, themeable components (buttons, inputs, modals, avatars, etc.). Pairs well with Tailwind. |

---

## 1. Theming System

### Goals
- Support **Light** and **Dark** modes
- Allow **multiple theme variants** (e.g., modern, minimal, colorful) for personalization
- Consistent color tokens across components
- Persist user preference (localStorage) and optionally sync to DB (`User.themePrefs`)
- Smooth transitions between themes

### Approach with Hero UI + Tailwind

Hero UI provides built-in theming with CSS variables and theme switching. Combined with Tailwind's `dark:` mode and arbitrary values, we can create a flexible system.

**Key ideas:**
- Use Hero UI's theme provider/config to define color palettes
- Define semantic tokens (background, foreground, primary, secondary, success, warning, danger)
- Support switching via `useTheme()` or context
- Store preference: check `localStorage` first, fallback to system preference (`prefers-color-scheme`)
- If user is logged in, sync to `User.themePrefs` in DB for cross-device consistency

### Theme Structure (Planned)

```ts
// Example theme prefs structure
interface ThemePrefs {
  mode: 'light' | 'dark' | 'system';
  variant: 'default' | 'violet' | 'rose' | 'blue' | 'green';
}
```

**Default values:** `{ mode: 'light', variant: 'default' }`

### Implementation Notes
- Hero UI themes are configured at app root (`main.tsx` or `App.tsx` wrapper)
- Use CSS variables for customizations (wallpapers, chat-specific colors)
- Keep transitions subtle (`transition-colors duration-200`) to avoid flicker
- Apply `dark` class to `html`/`body` for Tailwind dark mode

---

## 2. Wallpapers

Wallpapers add personality to the chat experience. Users can select a background for the chat area.

### Goals
- Offer a set of predefined wallpapers (images or gradients)
- Allow user to select wallpaper (persist choice)
- Apply as background to chat container with proper styling
- Optionally sync to DB (`User.wallpaper`) for logged-in users
- Fallback to solid background if none selected

### Wallpaper Options (Planned)

Can include:
- **Solid/Gradient backgrounds** – CSS gradients (minimal, elegant)
- **Subtle patterns** – SVG patterns or abstract images
- **Theme-aware** – Different options for light/dark modes

Store as:
- URL (if using images from assets or external)
- CSS class/value (gradient)
- Identifier/key for easy switching

**Example structure:**
```ts
interface Wallpaper {
  id: string;
  name: string;
  type: 'gradient' | 'image';
  value: string; // CSS gradient or image URL
  preview: string; // small preview image/color
}
```

### Styling Approach

Apply to chat area container:
```css
.chat-area {
  background-image: var(--chat-wallpaper);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
```

Also consider:
- **Overlay**: Add semi-transparent overlay on messages/sidebar for readability (especially with busy images)
- **Blur/opacity**: Subtle wallpapers don't compete with text
- **Performance**: Use optimized images (small size) or pure CSS gradients
- **Accessibility**: Ensure text contrast remains readable over wallpaper

### Persistence

- **Guest users:** Store in `localStorage` (`rtcamern:wallpaper`)
- **Logged-in users:** Also save to `User.wallpaper` in DB via API (optional but nice)

---

## 3. Keyboard Sound Effects

Optional, subtle sound effects on key actions to enhance UX (common in chat apps). Must be **toggleable** and respect user preference.

### Goals
- Toggle on/off via settings/UI
- Play sounds on actions: send message, maybe typing (optional), button clicks
- Persist preference (`localStorage` + `User.keyboardSound` in DB)
- Use lightweight audio (small files, compressed)
- Don't autoplay, only play on user interaction
- Graceful fallback if audio fails

### Actions to Consider

| Action | Priority | Notes |
|---|---|---|
| **Send message** | High | Satisfying feedback on send |
| **Attach media / open modal** | Low | Optional, can feel noisy |
| **Typing keystroke** | Very low | Often annoying; better skip or make very subtle |
| **Button hover/click** | Low | Maybe overkill |

**Recommended:** Start with **send message** only. Keep it subtle.

### Audio Implementation

Use the Web Audio API or HTML5 `<audio>` element.

**Options:**
1. **HTMLAudioElement** – Simple: `new Audio('/sounds/send.mp3')` then `.play()`
2. **Web Audio API** – More control (volume, pitch), but more code

For learning, HTMLAudioElement is fine.

**Audio files:**
- Store in `frontend/public/sounds/` (or `frontend/src/assets/sounds/`)
- Use short, compressed formats (`.mp3`, `.webm`, or `.ogg`)
- Keep volume low (e.g., 10–20%)
- Files small (< 10KB)

### Implementation (Conceptual)

```ts
// useSound hook (conceptual)
export function useSound(src: string, volume = 0.15) {
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audio.current = new Audio(src);
    audio.current.volume = volume;
  }, [src, volume]);
  
  const play = () => {
    if (!audio.current) return;
    audio.current.currentTime = 0; // restart
    audio.current.play().catch(() => {}); // ignore play errors (autoplay policy)
  };
  return { play };
}
```

Check user preference:
```ts
const { keyboardSound } = user.prefs; // or from context/localStorage
if (keyboardSound) play();
```

**Note:** Browsers may block autoplay; calling `.play()` in response to user action (click on send button) is fine.

### Persistence

- Store in `localStorage`: `rtcamern:keyboardSound` (boolean)
- Sync to DB: `User.keyboardSound` when logged in
- Provide toggle in UI (settings panel)

---

## 4. Design System & UI Guidelines

### Spacing Scale

Use Tailwind's consistent spacing for rhythm:
- `p-2`, `p-3`, `p-4`, `px-4`, `py-2` etc.
- Gap between elements: `gap-2`, `gap-3`, `gap-4`
- Vertical rhythm: `space-y-2`, `space-y-4`

### Typography

- **Font family:** System fonts or Inter/Geist (optional). Keep readable.
- **Sizes:** `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`
- **Weights:** `font-medium`, `font-semibold`, `font-bold`
- **Line height:** `leading-tight`, `leading-normal` for readability
- **Chat text:** `text-sm` or `text-base` depending on density

### Colors & Semantics

Use Hero UI theme tokens + semantic colors:
- **Backgrounds:** `bg-background`, `bg-content1`, `bg-content2`
- **Text:** `text-foreground`, `text-default-600`, `text-default-500`
- **Primary actions:** Hero UI `Button color="primary"`
- **States:** `success`, `warning`, `danger`
- **Online indicator:** Green (`bg-success`, `text-success`)
- **Unread badge:** Primary/danger color

Ensure sufficient color contrast (WCAG AA minimum).

### Chat UI Specifics

| Element | Polish Ideas |
|---|---|
| **Message Bubbles** | Rounded corners, subtle shadows, different styling for sent vs received. Sent: primary-tinted bg; Received: content bg. |
| **Avatars** | Use Hero UI `Avatar` component. Show online status dot. |
| **Timestamps** | Small, subtle text (`text-xs text-default-500`). Show on hover or below message. |
| **Read Receipts** | Icons (check, double-check). Color change when read. |
| **Typing Indicator** | Animated dots (pulse/bounce). Show avatar + "is typing...". |
| **Last Message Preview** | Truncate text, show ellipsis. Include media indicator if image/video. |
| **Scroll Behavior** | Auto-scroll to bottom on new message. Smooth scroll. Preserve position on load more (pagination). |
| **Empty States** | Friendly illustration/text (e.g., "Select a conversation to start chatting"). |
| **Loading States** | Skeleton loaders for conversations/messages. Spinner for actions. |

### Component Ideas

- `ChatSidebar` – Conversations list, user profile, theme/wallpaper/sound toggles
- `ChatArea` – Messages, input, header (participant info, online status)
- `MessageBubble` – Individual message with media
- `MessageInput` – Text input + attach button + send button
- `TypingIndicator` – Animated indicator
- `ThemeSelector` – Modal/panel for mode + variant
- `WallpaperPicker` – Grid of wallpaper options with preview
- `SettingsPanel` – Central place for preferences

---

## 5. Responsiveness

Mobile-first approach using Tailwind breakpoints: `sm`, `md`, `lg`, `xl`, `2xl`.

| Screen | Layout Strategy |
|---|---|
| **Mobile (< 640px)** | Stack or toggle: show sidebar or chat. Hide sidebar when in chat view, show back button. Full-width messages/input. |
| **Tablet (640–1024px)** | Side-by-side layout but narrower sidebar. Adapt spacing. |
| **Desktop (> 1024px)** | Full two-panel layout: sidebar (fixed width) + chat area (flexible). Max width container if desired. |

**Tips:**
- Use `flex`, `grid`, `hidden md:flex` etc.
- Touch-friendly targets (min-height 44px for buttons/inputs)
- Avoid horizontal scroll
- Handle keyboard on mobile (input should not be hidden)

---

## 6. Accessibility (a11y)

Focus on inclusive UX:

| Area | Checklist |
|---|---|
| **Keyboard Navigation** | All interactive elements focusable via Tab. Escape closes modals. Arrow keys in lists. |
| **Focus States** | Visible focus rings (`focus-visible:ring-2 ...`). Don't remove outlines without replacement. |
| **ARIA Labels** | Add `aria-label` to icon buttons (send, attach, settings). Use `aria-live` for dynamic content (typing, new messages). |
| **Color Contrast** | Meet WCAG AA. Check text on backgrounds (especially over wallpapers). |
| **Semantic HTML** | Use `<button>`, `<nav>`, `<main>`, `<section>`, `<article>` appropriately. |
| **Alt Text** | All images have meaningful `alt` text (avatars, media). Decorative icons use `aria-hidden="true"`. |
| **Live Regions** | Announce "user is typing" or new messages if needed for screen readers (`aria-live="polite"`). |

Hero UI components are built with a11y in mind, which helps a lot.

---

## 7. UI Polish Approach (Per AGENTS.md)

When reviewing hand-written UI code, I’ll suggest **small, targeted polishes**:

| Category | Suggestions | Rationale |
|---|---|---|
| **Layout & Spacing** | Fix inconsistent padding/margins, align items, improve whitespace | Cleaner, more professional |
| **Typography** | Adjust sizes/weights, improve line-height, tighten chat bubbles | Better readability |
| **Colors/Themes** | Use Hero UI tokens, fix dark mode inconsistencies, improve contrast | Polished & accessible |
| **Chat UX** | Message alignment, timestamps placement, read receipt clarity, typing indicator animation | Standout real-time feel |
| **Media UI** | Image/video previews, loading states, graceful fallbacks | Smooth UX |
| **States** | Skeletons, empty states, error states, disabled states | Production-grade |
| **Microinteractions** | Hover effects, transitions, focus rings, send button feedback | Subtle polish |
| **Responsiveness** | Fix sidebar/chat on mobile, safe areas, overflow issues | Cross-device friendly |
| **Personalization UX** | Clear toggles, previews, persist cleanly | Intuitive settings |

**Approach:** Give specific suggestions (Tailwind/Hero UI class names, small before/after snippets, explanations). User implements to preserve learning.

---

## 8. Implementation Recommendations

### Project Structure (Frontend)

```text
frontend/src/
├── components/        # Reusable UI components
│   ├── chat/          # Chat-specific (MessageBubble, ChatArea, etc.)
│   ├── layout/        # Layout components (Sidebar, Header)
│   ├── ui/            # Shared UI helpers
│   └── settings/      # Theme/wallpaper/sound settings
├── hooks/             # Custom hooks (useSound, useTheme, useSocket, etc.)
├── lib/               # Utils, socket client, configs
├── pages/             # Route pages (ChatPage, LoginPage, etc.)
├── store/             # Context/Zustand for global state (optional)
├── styles/            # Global CSS (index.css, App.css)
├── utils/             # Helpers
└── assets/            # Images, sounds, icons
```

### State Management Ideas

- **Local UI state:** `useState` for modals, toggles
- **Auth state:** Clerk's `useUser()`, `useAuth()`
- **App state:** React Context or [Zustand](https://zustand-demo.pmnd.rs/) (lightweight) for conversations, messages, socket, preferences
- **Persistence:** Sync prefs to `localStorage` and DB

### Progressive Enhancement

Start simple:
1. Basic layout (sidebar + chat area)
2. Auth integration (Clerk)
3. Theme toggle (dark/light)
4. Then add wallpapers, sounds, polish

This keeps learning manageable.

---

## 9. Assets to Prepare

| Asset | Purpose | Notes |
|---|---|---|
| **Sound files** | Keyboard sounds | Short, subtle (`click.mp3`, `send.mp3`). Keep < 10KB. |
| **Wallpaper images** | Predefined options | Optimized (webp), small sizes or use gradients instead. |
| **Icons** | UI icons | Use Hero UI icons or SVGs. Consistent style. |
| **Empty state image** | Friendly UX | Optional, simple SVG/illustration. |

---

## Related Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – Frontend in system context
- [`SETUP.md`](./SETUP.md) – Frontend setup
- [`AUTH.md`](./AUTH.md) – Clerk frontend integration
- [`SOCKETS.md`](./SOCKETS.md) – Socket.IO client usage
- [`MEDIA.md`](./MEDIA.md) – Media UI/display
- [`API.md`](./API.md) – API calls from frontend

---

*Last updated: reflects the implemented theming system (Hero UI presets + dark/light toggle), wallpaper picker, keyboard sounds, and responsive chat UI using Tailwind CSS and Hero UI.*