/**
 * Dragging Module - Draggable floating button
 */

export const createDragging = ({ bridge, eventBus, chromeApi, state }) => {
  let isDragging = false;
  let startX, startY, startRight, startBottom;
  let container = null;
  let btnClip = null;

  function init(containerEl, btnEl) {
    container = containerEl;
    
    btnClip = btnEl;
    
    if (!btnClip && container) {
      btnClip = container.querySelector('.notestash-btn-clip') || 
                container.querySelector('#notestash-clip > div:last-child');
    }
    
    if (!btnClip) {
      console.warn('[Dragging] No button element found for dragging', { 
        container: container?.id, 
        providedBtn: btnEl?.className 
      });
      return;
    }
    
    console.log('[Dragging] Initializing drag for button:', btnClip.className);
    
    btnClip.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    btnClip.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
  }

  function handleMouseDown(e) {
    console.log('[Dragging] MouseDown detected');
    if (e.button !== 0) return;
    
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = container.getBoundingClientRect();
    startRight = parseInt(container.style.right) || 20;
    startBottom = parseInt(container.style.bottom) || 20;
    
    state?.set('isDragging', false);
    
    setTimeout(() => {
      if (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5) {
        console.log('[Dragging] Click detected (not drag)');
        return;
      }
      isDragging = true;
      state?.set('isDragging', true);
      container.style.cursor = 'grabbing';
      btnClip.style.cursor = 'grabbing';
      console.log('[Dragging] Drag started');
    }, 100);
  }

  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({
      button: 0,
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    
    const dx = startX - e.clientX;
    const dy = startY - e.clientY;
    
    let newRight = startRight + dx;
    let newBottom = startBottom + dy;
    
    const maxRight = window.innerWidth - 76;
    const maxBottom = window.innerHeight - 76;
    
    newRight = Math.max(10, Math.min(newRight, maxRight));
    newBottom = Math.max(10, Math.min(newBottom, maxBottom));
    
    container.style.right = `${newRight}px`;
    container.style.bottom = `${newBottom}px`;
    container.style.left = 'auto';
    container.style.top = 'auto';
  }

  function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  }

  function handleMouseUp() {
    if (!isDragging) return;
    
    isDragging = false;
    state?.set('isDragging', false);
    container.style.cursor = 'default';
    btnClip.style.cursor = 'pointer';
    
    const newRight = parseInt(container.style.right) || 20;
    const newBottom = parseInt(container.style.bottom) || 20;
    
    chromeApi?.storage?.set({
      position: { right: newRight, bottom: newBottom }
    });
    
    eventBus?.emit('dragging:position-saved', { right: newRight, bottom: newBottom });
  }

  function isCurrentlyDragging() {
    return isDragging;
  }

  function destroy() {
    btnClip?.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    btnClip?.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleMouseUp);
  }

  return {
    init,
    isCurrentlyDragging,
    destroy
  };
};
