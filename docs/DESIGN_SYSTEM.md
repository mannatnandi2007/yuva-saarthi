# Yuva Saarthi — Design System Specification

> Living design specification for Yuva Saarthi web and Android applications.
> Replaces legacy UIrules.md.

---

## 1. Design Philosophy & Principles

Yuva Saarthi is designed for Indian teenagers (ages 13–18) experiencing emotional distress or seeking guidance. The interface must balance emotional warmth, playful reassurance, and clinical safety without ever feeling corporate or condescending.

### Core Visual Law
* **Strictly NO Gradients:** No `linear-gradient`, `radial-gradient`, `conic-gradient`, SVG gradients, gradient text, or gradient borders. All fills and strokes are 100% solid.
* **No Soft Drop Shadows:** Standard fuzzy box-shadows are prohibited. An optional hard offset shadow (`3px 3px 0 var(--stroke)`) is permitted on primary cards and buttons.
* **Dual Reference Aesthetic:**
  * **Reference A (Reflections App):** Soft rounded forms, dumpling/modak companion silhouette, serif headings, and gentle mood selector.
  * **Reference B (Mindcare App):** Flat pastel fills, thick near-black outlines, doodle-inspired expressive features, and black pill-shaped primary buttons.
  * **Yusa Persona:** Reference A's body silhouette and eye/mouth logic rendered in Reference B's thick solid strokes with pastel fills and a calm meditation hand pose.

---

## 2. Color Palette & Design Tokens

Defined as CSS Custom Properties on `:root`, with dark mode overrides under `:root[data-theme="dark"]`.

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--bg` | `#EEF0FB` | `#13111C` | App viewport background |
| `--surface` | `#FFFFFF` | `#1D1A2B` | Message bubbles (assistant), primary cards, panels |
| `--surface-2` | `#E4E7F7` | `#272338` | Secondary surfaces, drawers, muted cards |
| `--text` | `#16131F` | `#F3F0FF` | Primary typography |
| `--text-muted` | `#5A5670` | `#B7B2CE` | Timestamps, subtitles, helper text |
| `--stroke` | `#16131F` | `#F3F0FF` | Borders, outlines, structural strokes |
| `--lilac` | `#C9BDFF` | `#C9BDFF` | Primary brand accent, Yusa body, user message bubble |
| `--pink` | `#F6A9D5` | `#F6A9D5` | Cheeks, joyful highlights, celebratory tags |
| `--sky` | `#A8D8F5` | `#A8D8F5` | Calming tags, sad mood bubble |
| `--yellow` | `#F8D66D` | `#F8D66D` | Happy mood bubble, attention pills |
| `--mint` | `#B6E8CF` | `#B6E8CF` | Anxious mood bubble, soothing feedback |
| `--coral` | `#FF8F7A` | `#FF8F7A` | SafetyBanner, emergency helpline links, anger mood |

### Visual Geometry Rules
* **Stroke Widths:** `2px` for UI containers/cards, `2.5px` for controls (buttons/inputs), `3px` for Yusa mascot SVG outlines.
* **Border Radii:** `20px` for cards/panels/message bubbles, `9999px` for pill buttons, tags, and inputs.
* **Primary Button:** Solid black (`#16131F`) with white text in light mode; cream/white (`#F3F0FF`) with dark text in dark mode. Hard offset shadow `3px 3px 0 var(--stroke)` on hover.
* **Contrast Compliance:** All text must meet WCAG AA (4.5:1 ratio). Elements with pastel background fills (`--lilac`, `--pink`, `--sky`, `--yellow`, `--mint`, `--coral`) MUST always use `#16131F` text in both light and dark themes.

---

## 3. Typography

Bundled locally using `@fontsource` to ensure 100% offline functionality in Capacitor Android builds.

* **Headings / Display:** Serif typeface (`Fraunces` or `Newsreader`). Warm, literary, editorial, and trustworthy.
* **Body / Interface:** Geometric sans-serif (`Outfit`). Highly legible on mobile screens at small font sizes.
* **No Italics:** Headers avoid artificial slants to preserve visual groundedness.

---

## 4. Theme System & Night Mode

* **Tri-State Preference:** System (default, following `prefers-color-scheme`), Light, or Dark.
* **Flash Prevention:** A synchronous inline script in `index.html` evaluates stored theme from `localStorage` (or Capacitor Preferences) and applies the `data-theme` attribute to `<html>` prior to the first render paint.
* **System Color Sync:** Dynamically updates `<meta name="theme-color">` (`#EEF0FB` in light, `#13111C` in dark).
* **Universality:** Applied consistently across Landing, Signup, OTP, Consent, Chat, Policy Modal, and Drawer views.

---

## 5. Viewport Layout & Mascot Placement

### Responsive Breakdown
* **Desktop (`≥ 1024px`):**
  * Left sidebar: 280px session history.
  * Central chat stream: Scrollable message list.
  * Right stage: Yusa companion fixed vertically in a 320px column with speech bubble and real-text mood pill.
* **Tablet (`768px – 1023px`):**
  * Sidebar transitions into an off-canvas slide drawer.
  * Yusa stage scales proportionally to ~220px.
* **Mobile (`< 768px` / Android):**
  * Sidebar becomes a full-height touch drawer with gesture dismissal.
  * **Yusa is centered horizontally** (compact 160–200px) in the upper-middle chat view.
  * Composer remains fixed at the bottom with safe-area padding.

### The Glass Stage & Message Layering
* **Scroll-Behind Architecture:** Messages scroll directly **behind** Yusa. The chat stream fills the viewport, while Yusa floats at a higher `z-index` with `pointer-events: none` on the container (`pointer-events: auto` on interactive elements).
* **Glass Stage Specs:** `backdrop-filter: blur(14px)` over a solid semi-transparent fill (`rgba` of `--surface` at ~55%) with a `2px` `--stroke` outline. Gradient fades are strictly banned.
* **Virtual Keyboard Protection:** Under mobile `visualViewport` resize events (keyboard open), Yusa automatically shrinks into a compact badge or tucks aside so input focus is never obstructed.

---

## 6. Yusa Mascot Specifications

* **Asset Type:** Pure 2D SVG (`viewBox="0 0 240 240"`). Zero WebGL or Three.js dependencies.
* **Anatomy:**
  * Body: Dumpling/modak silhouette with wider base and rounded top-knot filled in `--lilac` with a `3px #16131F` solid stroke.
  * Top Tuft: Small swirl in solid `#7FB8F0` with matching `3px` stroke.
  * Cheeks: Solid pink circles (`--pink`).
  * Eyes: White ovals, thick black pupils, single white highlight dot.
  * Hands: Stubby hands resting together in a calm meditation pose.
* **Seven Mood States (Swappable SVG `<g>` groups):**
  1. `NORMAL`: Gentle curved brows, pleasant closed smile, meditation hands, `--lilac` speech bubble.
  2. `HAPPY`: Raised brows, bright round eyes, wide open smile, `--yellow` speech bubble.
  3. `OVERJOYED`: Crescent closed eyes, wide laughing mouth, small joyful bounce, `--pink` speech bubble.
  4. `SAD`: Drooped brows, small curved frown, single solid sky-blue tear drop, `--sky` speech bubble.
  5. `ANGRY`: Furrowed angled brows, flat horizontal mouth, solid coral anger puffs, `--coral` speech bubble.
  6. `ANXIOUS`: Wide alert eyes, wavy wobbly mouth, small solid mint sweat drop, `--mint` speech bubble.
  7. `TIRED`: Half-closed eyelids, calm resting mouth, floating solid "z" markers, `--surface-2` speech bubble.
* **Animations:**
  * Gentle idle breathing (scale 1.0 → 1.03, 4s ease-in-out cycle).
  * Natural blinking every 4–6 seconds.
  * Smooth 200ms crossfade between mood transitions.
  * Full `prefers-reduced-motion` compliance (all CSS animations disabled).
* **Accessibility:** Root SVG carries `role="img"` with descriptive `aria-label="Yusa mascot feeling [mood]"`. Accompanied by real-text mood badge.

---

## 7. Component Architecture

* `src/styles/tokens.css`: Core design variables, stroke widths, and radii.
* `src/hooks/useTheme.js`: System/Light/Dark persistence hook.
* `src/components/ThemeToggle.jsx`: Segmented pill theme selector.
* `src/components/YusaCompanion.jsx`: Vector mascot renderer.
* `src/components/chat/MessageBubble.jsx`: Message bubble (User in `--lilac`, Assistant in `--surface`).
* `src/components/chat/SafetyBanner.jsx`: Coral emergency bar with one-touch `tel:` dialer links for verified helplines:
  * Tele-MANAS: `14416`
  * KIRAN Mental Health: `1800-599-0019`
  * Childline: `1098`
* `src/components/chat/Composer.jsx`: Fixed input bar with 44px+ touch targets and character safety validation.
