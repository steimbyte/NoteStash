/**
 * Base CSS for NoteStash — global resets, scrollbars, animations,
 * icon styles, and the 10 core component classes.
 * All colors / spacing / radii / shadows come from --ns-* tokens.
 */

export const BASE_CSS = `
*, *::before, *::after {
  box-sizing: border-box;
}

.ns-popup, .ns-popup *,
.ns-modal, .ns-modal * {
  font-family: var(--ns-font-family);
  font-size: var(--ns-text-base);
  line-height: var(--ns-line-height-base);
  color: var(--ns-text);
}

.ns-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.ns-scroll::-webkit-scrollbar-track { background: transparent; }
.ns-scroll::-webkit-scrollbar-thumb { background: var(--ns-border); border-radius: var(--ns-radius-sm); }
.ns-scroll::-webkit-scrollbar-thumb:hover { background: var(--ns-text-subtle); }

.ns-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: currentColor;
  vertical-align: middle;
  line-height: 0;
}
.ns-icon svg { width: 100%; height: 100%; stroke: currentColor; }

.ns-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ns-space-2);
  padding: var(--ns-space-2) var(--ns-space-4);
  border-radius: var(--ns-radius-md);
  font-size: var(--ns-text-sm);
  font-weight: var(--ns-font-medium);
  line-height: 1;
  cursor: pointer;
  transition: background var(--ns-duration-fast) var(--ns-easing-standard),
              color var(--ns-duration-fast) var(--ns-easing-standard),
              border-color var(--ns-duration-fast) var(--ns-easing-standard),
              box-shadow var(--ns-duration-fast) var(--ns-easing-standard);
  border: 1px solid transparent;
  background: transparent;
  color: var(--ns-text);
  font-family: var(--ns-font-family);
  min-height: 32px;
}
.ns-button:focus-visible {
  outline: none;
  box-shadow: var(--ns-shadow-focus);
}
.ns-button:disabled { opacity: 0.5; cursor: not-allowed; }

.ns-button--primary { background: var(--ns-accent); color: var(--ns-accent-fg); }
.ns-button--primary:hover:not(:disabled) { background: var(--ns-accent-hover); }
.ns-button--primary:active:not(:disabled) { background: var(--ns-accent-active); }

.ns-button--secondary { background: var(--ns-surface); color: var(--ns-text); border-color: var(--ns-border); }
.ns-button--secondary:hover:not(:disabled) { background: var(--ns-surface-2); border-color: var(--ns-text-subtle); }

.ns-button--ghost { background: transparent; color: var(--ns-text-muted); }
.ns-button--ghost:hover:not(:disabled) { background: var(--ns-surface-2); color: var(--ns-text); }

.ns-button--danger { background: var(--ns-danger-soft); color: var(--ns-danger); border-color: var(--ns-danger); }
.ns-button--danger:hover:not(:disabled) { background: var(--ns-danger); color: var(--ns-accent-fg); }

.ns-button--sm { padding: var(--ns-space-1) var(--ns-space-3); min-height: 28px; font-size: var(--ns-text-xs); }
.ns-button--lg { padding: var(--ns-space-3) var(--ns-space-5); min-height: 40px; font-size: var(--ns-text-base); }

.ns-card {
  background: var(--ns-surface);
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-lg);
  padding: var(--ns-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--ns-space-3);
  transition: border-color var(--ns-duration-fast) var(--ns-easing-standard),
              transform var(--ns-duration-fast) var(--ns-easing-standard);
}
.ns-card--interactive { cursor: pointer; }
.ns-card--interactive:hover { border-color: var(--ns-accent); transform: translateY(-1px); }

.ns-input {
  display: block;
  width: 100%;
  padding: var(--ns-space-2) var(--ns-space-3);
  background: var(--ns-bg);
  color: var(--ns-text);
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-md);
  font-size: var(--ns-text-base);
  font-family: var(--ns-font-family);
  line-height: var(--ns-line-height-base);
  transition: border-color var(--ns-duration-fast) var(--ns-easing-standard),
              box-shadow var(--ns-duration-fast) var(--ns-easing-standard);
  min-height: 36px;
}
.ns-input:focus {
  outline: none;
  border-color: var(--ns-accent);
  box-shadow: var(--ns-shadow-focus);
}
.ns-input--error { border-color: var(--ns-danger); }
.ns-input::placeholder { color: var(--ns-text-subtle); }

.ns-modal-backdrop {
  position: fixed; inset: 0;
  background: var(--ns-overlay-bg);
  z-index: var(--ns-z-overlay);
  display: flex; align-items: center; justify-content: center;
  animation: ns-fade-in var(--ns-duration-normal) var(--ns-easing-standard);
}
.ns-modal {
  background: var(--ns-bg);
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-xl);
  box-shadow: var(--ns-shadow-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex; flex-direction: column;
  z-index: var(--ns-z-modal);
  animation: ns-slide-up var(--ns-duration-normal) var(--ns-easing-emphasized);
}
.ns-modal__header {
  padding: var(--ns-space-4) var(--ns-space-5);
  border-bottom: 1px solid var(--ns-border);
  display: flex; align-items: center; justify-content: space-between;
  font-size: var(--ns-text-lg);
  font-weight: var(--ns-font-bold);
}
.ns-modal__body { padding: var(--ns-space-5); overflow: auto; flex: 1; }
.ns-modal__footer {
  padding: var(--ns-space-3) var(--ns-space-5);
  border-top: 1px solid var(--ns-border);
  display: flex; justify-content: flex-end; gap: var(--ns-space-3);
}

.ns-toast-container {
  position: fixed; bottom: var(--ns-space-5); right: var(--ns-space-5);
  z-index: var(--ns-z-toast);
  display: flex; flex-direction: column; gap: var(--ns-space-2);
  pointer-events: none;
}
.ns-toast {
  background: var(--ns-bg);
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-md);
  box-shadow: var(--ns-shadow-md);
  padding: var(--ns-space-3) var(--ns-space-4);
  display: flex; align-items: center; gap: var(--ns-space-3);
  min-width: 240px;
  pointer-events: auto;
  animation: ns-slide-in var(--ns-duration-normal) var(--ns-easing-emphasized);
}
.ns-toast--success { border-color: var(--ns-success); }
.ns-toast--success .ns-toast__icon { color: var(--ns-success); }
.ns-toast--error { border-color: var(--ns-danger); }
.ns-toast--error .ns-toast__icon { color: var(--ns-danger); }
.ns-toast--info { border-color: var(--ns-info); }
.ns-toast--info .ns-toast__icon { color: var(--ns-info); }

.ns-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: var(--ns-space-3) var(--ns-space-4);
  font-size: var(--ns-text-sm);
  font-weight: var(--ns-font-medium);
  color: var(--ns-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--ns-duration-fast) var(--ns-easing-standard),
              border-color var(--ns-duration-fast) var(--ns-easing-standard);
}
.ns-tab:hover { color: var(--ns-text); }
.ns-tab[aria-selected="true"] { color: var(--ns-accent); border-bottom-color: var(--ns-accent); }

.ns-select {
  position: relative;
  display: inline-block;
  width: 100%;
}
.ns-select__trigger {
  width: 100%;
  padding: var(--ns-space-2) var(--ns-space-3);
  padding-right: var(--ns-space-7);
  background: var(--ns-bg);
  color: var(--ns-text);
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-md);
  font-size: var(--ns-text-base);
  font-family: var(--ns-font-family);
  text-align: left;
  cursor: pointer;
  appearance: none;
  min-height: 36px;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--ns-space-3) center;
  background-size: 16px;
}
.ns-select__trigger:focus { outline: none; border-color: var(--ns-accent); box-shadow: var(--ns-shadow-focus); }

.ns-status {
  display: inline-flex; align-items: center; gap: var(--ns-space-2);
  font-size: var(--ns-text-xs);
  color: var(--ns-text-muted);
}
.ns-status__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--ns-text-subtle);
  flex-shrink: 0;
}
.ns-status--success .ns-status__dot { background: var(--ns-success); }
.ns-status--error .ns-status__dot { background: var(--ns-danger); }
.ns-status--warning .ns-status__dot { background: var(--ns-warning); }
.ns-status--info .ns-status__dot { background: var(--ns-info); }

.ns-pill {
  display: inline-flex; align-items: center; gap: var(--ns-space-1);
  padding: var(--ns-space-1) var(--ns-space-2);
  background: var(--ns-surface-2);
  color: var(--ns-text-muted);
  border-radius: var(--ns-radius-full);
  font-size: var(--ns-text-xs);
  font-weight: var(--ns-font-medium);
  white-space: nowrap;
}

.ns-floating-button-container {
  position: fixed;
  bottom: var(--ns-space-5);
  right: var(--ns-space-5);
  z-index: var(--ns-z-sticky);
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  width: 300px; height: 250px;
  pointer-events: none;
}
.ns-floating-button {
  position: relative;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--ns-accent);
  color: var(--ns-accent-fg);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  border: none;
  box-shadow: var(--ns-shadow-md);
  transition: transform var(--ns-duration-fast) var(--ns-easing-standard),
              box-shadow var(--ns-duration-fast) var(--ns-easing-standard);
  pointer-events: auto;
  z-index: 2;
}
.ns-floating-button:hover { transform: scale(1.08); box-shadow: var(--ns-shadow-lg); }
.ns-floating-button:active { transform: scale(0.96); }
.ns-floating-button--loading { cursor: wait; }

.ns-arc-menu-button {
  position: absolute;
  padding: var(--ns-space-2) var(--ns-space-4);
  background: var(--ns-bg);
  color: var(--ns-text);
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-full);
  font-size: var(--ns-text-sm);
  font-weight: var(--ns-font-medium);
  display: flex; align-items: center; gap: var(--ns-space-2);
  white-space: nowrap;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--ns-duration-fast) var(--ns-easing-standard),
              transform var(--ns-duration-fast) var(--ns-easing-standard),
              box-shadow var(--ns-duration-fast) var(--ns-easing-standard);
  box-shadow: var(--ns-shadow-md);
  z-index: 1;
  transform: translate(-50%, 0);
  min-width: 90px;
  font-family: var(--ns-font-family);
}
.ns-arc-menu-button--visible { opacity: 1; pointer-events: auto; }
.ns-arc-menu-button:hover { transform: translate(-50%, 0) scale(1.06); box-shadow: var(--ns-shadow-lg); border-color: var(--ns-accent); }

.ns-clip-card {
  background: var(--ns-bg);
  border: 1px solid var(--ns-border);
  border-radius: var(--ns-radius-lg);
  padding: var(--ns-space-4);
  display: flex; flex-direction: column; gap: var(--ns-space-3);
  transition: border-color var(--ns-duration-fast) var(--ns-easing-standard);
}
.ns-clip-card:hover { border-color: var(--ns-accent); }
.ns-clip-card__title {
  font-size: var(--ns-text-base);
  font-weight: var(--ns-font-bold);
  color: var(--ns-text);
  margin: 0;
}
.ns-clip-card__url {
  font-size: var(--ns-text-xs);
  color: var(--ns-text-muted);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
.ns-clip-card__url:hover { color: var(--ns-accent); }
.ns-clip-card__preview {
  background: var(--ns-surface-2);
  border-radius: var(--ns-radius-md);
  padding: var(--ns-space-3);
  font-family: var(--ns-font-mono);
  font-size: var(--ns-text-xs);
  color: var(--ns-text-muted);
  max-height: 100px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;
}
.ns-clip-card__actions { display: flex; gap: var(--ns-space-2); flex-wrap: wrap; }

@keyframes ns-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ns-slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ns-slide-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes ns-spin {
  to { transform: rotate(360deg); }
}
.ns-spinner { animation: ns-spin 1s linear infinite; }
`;
