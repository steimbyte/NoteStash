/**
 * Toast Module - Notification display
 */

export const createToast = ({ bridge, eventBus, chromeApi, config }) => {
  let container = null;
  const activeToasts = new Map();
  let toastId = 0;

  function init() {
    container = document.createElement('div');
    container.id = 'notestash-toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  function show(message, options = {}) {
    const {
      type = 'info',
      duration = 3000,
      icon = 'â„¹ï¸'
    } = options;

    const id = ++toastId;
    
    const toast = document.createElement('div');
    toast.id = `toast-${id}`;
    toast.style.cssText = `
      background: rgba(30, 41, 59, 0.9);
      backdrop-filter: blur(12px);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      pointer-events: auto;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
    `;

    const iconSpan = document.createElement('span');
    iconSpan.textContent = type === 'success' ? 'âœ…' : type === 'error' ? 'âŒ' : icon;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);
    container.appendChild(toast);

    activeToasts.set(id, toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      remove(id);
    }, duration);

    return id;
  }

  function remove(id) {
    const toast = activeToasts.get(id);
    if (!toast) return;

    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';

    setTimeout(() => {
      toast.remove();
      activeToasts.delete(id);
    }, 300);
  }

  function success(message, duration) {
    return show(message, { type: 'success', duration, icon: 'âœ…' });
  }

  function error(message, duration) {
    return show(message, { type: 'error', duration, icon: 'âŒ' });
  }

  function destroy() {
    activeToasts.forEach((toast, id) => remove(id));
    container?.remove();
    container = null;
  }

  return {
    init,
    show,
    success,
    error,
    remove,
    destroy
  };
};
