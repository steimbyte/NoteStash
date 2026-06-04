/**
 * Design tokens for NoteStash — single source of truth for all colors,
 * spacing, type, radii, shadows, motion, z-index.
 * Injected into document.head by index.mjs at startup.
 */

export const TOKENS_CSS = `
:root {
  --ns-bg:               #ffffff;
  --ns-surface:          #f4f4f5;
  --ns-surface-2:        #e4e4e7;
  --ns-surface-3:        #d4d4d8;
  --ns-text:             #09090b;
  --ns-text-muted:       #71717a;
  --ns-text-subtle:      #a1a1aa;
  --ns-text-inverse:     #ffffff;
  --ns-border:           #e4e4e7;
  --ns-border-focus:     #4f46e5;
  --ns-accent:           #4f46e5;
  --ns-accent-hover:     #4338ca;
  --ns-accent-active:    #3730a3;
  --ns-accent-soft:      rgba(79, 70, 229, 0.1);
  --ns-accent-border:    rgba(79, 70, 229, 0.3);
  --ns-accent-fg:        #ffffff;
  --ns-success:          #16a34a;
  --ns-success-soft:     rgba(22, 163, 74, 0.1);
  --ns-warning:          #ca8a04;
  --ns-warning-soft:     rgba(202, 138, 4, 0.1);
  --ns-danger:           #dc2626;
  --ns-danger-soft:      rgba(220, 38, 38, 0.1);
  --ns-info:             #0284c7;
  --ns-info-soft:        rgba(2, 132, 199, 0.1);
  --ns-overlay-bg:       rgba(0, 0, 0, 0.5);
  --ns-scrim:            rgba(0, 0, 0, 0.6);
  --ns-text-xs:          11px;
  --ns-text-sm:          12px;
  --ns-text-base:        14px;
  --ns-text-lg:          16px;
  --ns-text-xl:          20px;
  --ns-text-2xl:         24px;
  --ns-font-normal:      400;
  --ns-font-medium:      500;
  --ns-font-bold:        600;
  --ns-line-height-tight:  1.25;
  --ns-line-height-base:   1.5;
  --ns-font-family:      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --ns-font-mono:        'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  --ns-space-1:  4px;
  --ns-space-2:  8px;
  --ns-space-3:  12px;
  --ns-space-4:  16px;
  --ns-space-5:  24px;
  --ns-space-6:  32px;
  --ns-space-7:  48px;
  --ns-space-8:  64px;
  --ns-radius-sm:   4px;
  --ns-radius-md:   8px;
  --ns-radius-lg:   12px;
  --ns-radius-xl:   16px;
  --ns-radius-full: 9999px;
  --ns-shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --ns-shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --ns-shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
  --ns-shadow-focus: 0 0 0 3px var(--ns-accent-soft);
  --ns-duration-fast:   100ms;
  --ns-duration-normal: 200ms;
  --ns-duration-slow:   300ms;
  --ns-easing-standard:    cubic-bezier(0.4, 0, 0.2, 1);
  --ns-easing-emphasized:  cubic-bezier(0.2, 0, 0, 1);
  --ns-easing-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ns-z-base:     0;
  --ns-z-dropdown: 100;
  --ns-z-sticky:   200;
  --ns-z-overlay:  1000;
  --ns-z-modal:    1100;
  --ns-z-toast:    1200;
  --ns-z-tooltip:  1300;
}

[data-theme="dark"], :root[data-theme="dark"] {
  --ns-bg:               #09090b;
  --ns-surface:          #18181b;
  --ns-surface-2:        #27272a;
  --ns-surface-3:        #3f3f46;
  --ns-text:             #fafafa;
  --ns-text-muted:       #a1a1aa;
  --ns-text-subtle:      #71717a;
  --ns-text-inverse:     #09090b;
  --ns-border:           #27272a;
  --ns-border-focus:     #818cf8;
  --ns-accent:           #818cf8;
  --ns-accent-hover:     #a5b4fc;
  --ns-accent-active:    #c7d2fe;
  --ns-accent-soft:      rgba(129, 140, 248, 0.15);
  --ns-accent-border:    rgba(129, 140, 248, 0.4);
  --ns-accent-fg:        #1e1b4b;
  --ns-success:          #4ade80;
  --ns-success-soft:     rgba(74, 222, 128, 0.15);
  --ns-warning:          #fbbf24;
  --ns-warning-soft:     rgba(251, 191, 36, 0.15);
  --ns-danger:           #f87171;
  --ns-danger-soft:      rgba(248, 113, 113, 0.15);
  --ns-info:             #38bdf8;
  --ns-info-soft:        rgba(56, 189, 248, 0.15);
  --ns-overlay-bg:       rgba(0, 0, 0, 0.7);
  --ns-scrim:            rgba(0, 0, 0, 0.8);
  --ns-shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --ns-shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
  --ns-shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ns-bg:               #09090b;
    --ns-surface:          #18181b;
    --ns-surface-2:        #27272a;
    --ns-surface-3:        #3f3f46;
    --ns-text:             #fafafa;
    --ns-text-muted:       #a1a1aa;
    --ns-text-subtle:      #71717a;
    --ns-text-inverse:     #09090b;
    --ns-border:           #27272a;
    --ns-border-focus:     #818cf8;
    --ns-accent:           #818cf8;
    --ns-accent-hover:     #a5b4fc;
    --ns-accent-active:    #c7d2fe;
    --ns-accent-soft:      rgba(129, 140, 248, 0.15);
    --ns-accent-border:    rgba(129, 140, 248, 0.4);
    --ns-accent-fg:        #1e1b4b;
    --ns-success:          #4ade80;
    --ns-success-soft:     rgba(74, 222, 128, 0.15);
    --ns-warning:          #fbbf24;
    --ns-warning-soft:     rgba(251, 191, 36, 0.15);
    --ns-danger:           #f87171;
    --ns-danger-soft:      rgba(248, 113, 113, 0.15);
    --ns-info:             #38bdf8;
    --ns-info-soft:        rgba(56, 189, 248, 0.15);
    --ns-overlay-bg:       rgba(0, 0, 0, 0.7);
    --ns-scrim:            rgba(0, 0, 0, 0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
