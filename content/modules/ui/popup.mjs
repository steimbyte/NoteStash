/**
 * Main Popup Module
 * Displays saved clips in a glassmorphism-styled popup
 * 
 * Features: Session tabs, search, clip cards with meta-badges,
 * thumbnails, screenshots, Copy/Open/HTML/Delete buttons,
 * Rename/Delete session, Download/Clean & Merge footer
 * 
 * @module content/modules/ui/popup
 * @version 2.0.0
 */

export const createPopup = ({ bridge, eventBus, chromeApi, config, state, utils, registry, sessionManager, dataProcessor, virtualScroller }) => {
  const logger = (...args) => { if (utils?.isDebug?.()) (utils?.nsLog || console.log)(...args); };
  let popup = null;
  let content = null;
  let grid = null;
  let searchInput = null;
  let sessionTabs = null;
  let footerCountEl = null;

  async function show() {
    if (popup) {
      popup.style.display = 'flex';
      await renderSessionTabs();
      await render();
      return;
    }

    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    popup = document.createElement('div');
    popup.id = 'notestash-popup';
    Object.assign(popup.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      zIndex: '2147483646', display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    content = document.createElement('div');
    Object.assign(content.style, {
      background: `rgba(${accentRgb}, 0.08)`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px', width: '90%', maxWidth: '1100px', maxHeight: '85vh', overflow: 'hidden',
      boxShadow: `0 25px 50px rgba(${accentRgb}, 0.25), 0 10px 20px rgba(0,0,0,0.3)`,
      border: `1px solid rgba(${accentRgb}, 0.3)`, display: 'flex', flexDirection: 'column',
      color: theme.text || '#e2e8f0'
    });

    content.appendChild(createHeader(accentRgb, theme));

    sessionTabs = document.createElement('div');
    Object.assign(sessionTabs.style, {
      display: 'flex', gap: '8px', padding: '12px 20px',
      background: `rgba(${accentRgb}, 0.06)`, borderBottom: `1px solid rgba(${accentRgb}, 0.15)`,
      overflowX: 'auto', flexWrap: 'nowrap', backdropFilter: 'blur(12px)',
      flexShrink: '0'
    });
    content.appendChild(sessionTabs);

    content.appendChild(createSearchBar(accentRgb, theme));

    grid = document.createElement('div');
    Object.assign(grid.style, {
      padding: '20px', overflowY: 'auto',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '16px', flex: '1'
    });
    content.appendChild(grid);

    content.appendChild(createFooter(accentRgb, theme));
    popup.appendChild(content);

    popup.addEventListener('click', (e) => { if (e.target === popup) hide(); });
    document.body.appendChild(popup);
    if (registry) registry.register('popups', popup);

    await renderSessionTabs();
    await render();
    logger('[Popup] Shown');
    eventBus?.emit('popup:shown');
  }

  function createHeader(accentRgb, theme) {
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '20px 24px', borderBottom: `1px solid rgba(${accentRgb}, 0.2)`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: `linear-gradient(135deg, rgba(${accentRgb}, 0.25) 0%, rgba(${accentRgb}, 0.15) 100%)`,
      backdropFilter: 'blur(12px)',
      flexShrink: '0'
    });

    const titleArea = document.createElement('div');
    titleArea.innerHTML = `
      <h2 style="margin:0;color:white;font-size:20px;">ðŸ“š Saved Clips</h2>
      <span id="notestash-session-name" style="color:rgba(255,255,255,0.8);font-size:13px;"></span>
    `;
    header.appendChild(titleArea);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = 'âœ•';
    Object.assign(closeBtn.style, {
      background: `rgba(${accentRgb}, 0.2)`, border: `1px solid rgba(${accentRgb}, 0.4)`,
      color: 'white', width: '38px', height: '38px', borderRadius: '50%',
      fontSize: '18px', cursor: 'pointer', transition: 'all 0.3s ease'
    });
    closeBtn.addEventListener('click', hide);
    header.appendChild(closeBtn);
    return header;
  }

  async function renderSessionTabs() {
    if (!sessionTabs) return;
    sessionTabs.innerHTML = '';
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    try {
      const sessions = await sessionManager?.getAllSessions?.() || [];
      const current = await sessionManager?.getCurrentSession?.();
      const currentId = current?.id;

      sessions.forEach(session => {
        const clips = dataProcessor?.parseClips(session.content) || [];
        const isActive = session.id === currentId;

        const tab = document.createElement('button');
        tab.textContent = `${session.name} (${clips.length})`;
        Object.assign(tab.style, {
          padding: '8px 16px', borderRadius: '10px', fontSize: '12px',
          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease',
          border: isActive ? `1px solid rgba(${accentRgb}, 0.6)` : `1px solid rgba(${accentRgb}, 0.2)`,
          background: isActive ? `rgba(${accentRgb}, 0.3)` : `rgba(${accentRgb}, 0.08)`,
          color: isActive ? 'white' : (theme.text || '#e2e8f0'),
          fontWeight: isActive ? '600' : '400'
        });
        tab.addEventListener('click', async () => {
          await sessionManager?.switchSession?.(session.id);
          await renderSessionTabs();
          await render();
        });
        sessionTabs.appendChild(tab);
      });

      const existingNewBtn = sessionTabs.querySelector('#notestash-new-session-btn');
      if (existingNewBtn) existingNewBtn.remove();
      
      const newBtn = document.createElement('button');
      newBtn.id = 'notestash-new-session-btn';
      newBtn.textContent = '+ New';
      Object.assign(newBtn.style, {
        padding: '8px 16px', borderRadius: '10px', fontSize: '12px',
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease',
        border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b', fontWeight: '600'
      });
      newBtn.addEventListener('click', async () => {
        const name = prompt('Enter session name:', `Session ${Date.now()}`);
        if (name) {
          await sessionManager?.createSession?.(name);
          await renderSessionTabs();
          await render();
        }
      });
      sessionTabs.appendChild(newBtn);

    } catch (err) {
      logger('[Popup] Error rendering session tabs:', err);
    }
  }

  function createSearchBar(accentRgb, theme) {
    const searchBar = document.createElement('div');
    Object.assign(searchBar.style, {
      padding: '12px 20px', background: `rgba(${accentRgb}, 0.04)`,
      borderBottom: `1px solid rgba(${accentRgb}, 0.12)`, position: 'relative',
      flexShrink: '0'
    });

    searchInput = document.createElement('input');
    searchInput.placeholder = 'Search clips...';
    Object.assign(searchInput.style, {
      width: '100%', padding: '14px 44px 14px 48px',
      border: `1px solid rgba(${accentRgb}, 0.2)`, borderRadius: '16px',
      fontSize: '14px', background: `rgba(${accentRgb}, 0.08)`,
      color: theme.text || '#e2e8f0', transition: 'all 0.3s ease',
      boxShadow: `0 4px 12px rgba(${accentRgb}, 0.1)`
    });
    searchInput.addEventListener('input', debounce(() => {
      render(searchInput.value.toLowerCase());
    }, 300));
    searchBar.appendChild(searchInput);
    return searchBar;
  }

  function createFooter(accentRgb, theme) {
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      padding: '16px 24px', borderTop: `1px solid rgba(${accentRgb}, 0.15)`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: `rgba(${accentRgb}, 0.06)`, backdropFilter: 'blur(12px)', flexWrap: 'wrap', gap: '10px',
      flexShrink: '0'
    });

    const leftSection = document.createElement('div');
    Object.assign(leftSection.style, { display: 'flex', gap: '10px', alignItems: 'center' });

    footerCountEl = document.createElement('span');
    Object.assign(footerCountEl.style, { fontSize: '13px', color: 'rgba(255,255,255,0.7)' });
    leftSection.appendChild(footerCountEl);

    const renameBtn = createPillButton('âœï¸ Rename', accentRgb, theme, async () => {
      const session = await sessionManager?.getCurrentSession?.();
      if (!session) return;
      const name = prompt('New session name:', session.name);
      if (name && name.trim()) {
        await sessionManager?.renameSession?.(session.id, name.trim());
        await renderSessionTabs();
        await render();
      }
    });
    leftSection.appendChild(renameBtn);

    const deleteBtn = createPillButton('ðŸ—‘ï¸ Delete', accentRgb, theme, async () => {
      const session = await sessionManager?.getCurrentSession?.();
      if (!session) return;
      if (!confirm(`Delete session "${session.name}"? This cannot be undone.`)) return;
      await sessionManager?.deleteSession?.(session.id);
      await renderSessionTabs();
      await render();
    });
    deleteBtn.style.background = 'rgba(239, 68, 68, 0.15)';
    deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    leftSection.appendChild(deleteBtn);

    const deleteAllBtn = createPillButton('ðŸ’€ Delete All', accentRgb, theme, async () => {
      if (!confirm('Delete ALL sessions? This will permanently wipe everything!')) return;
      await sessionManager?.deleteAllSessions?.();
      await renderSessionTabs();
      await render();
    });
    deleteAllBtn.style.background = 'rgba(239, 68, 68, 0.25)';
    deleteAllBtn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    deleteAllBtn.style.fontWeight = '700';
    leftSection.appendChild(deleteAllBtn);

    footer.appendChild(leftSection);

    const rightSection = document.createElement('div');
    Object.assign(rightSection.style, { display: 'flex', gap: '10px' });

    const downloadBtn = createPillButton('ðŸ’¾ Download ZIP', accentRgb, theme, async () => {
      eventBus?.emit('cleaner:download-original-zip');
    });
    rightSection.appendChild(downloadBtn);

    const cleanBtn = document.createElement('button');
    cleanBtn.innerHTML = 'ðŸ¤– Clean & Merge';
    Object.assign(cleanBtn.style, {
      padding: '10px 20px', background: `rgba(${accentRgb}, 0.3)`,
      border: `1px solid rgba(${accentRgb}, 0.5)`, borderRadius: '10px',
      fontSize: '13px', fontWeight: '600', color: 'white', cursor: 'pointer',
      transition: 'all 0.3s ease'
    });
    cleanBtn.addEventListener('click', () => { hide(); eventBus?.emit('popup:open-cleaner'); });
    rightSection.appendChild(cleanBtn);

    footer.appendChild(rightSection);
    return footer;
  }

  async function render(filter = '') {
    logger('[Popup] === render() START ===');
    logger('[Popup] render() - Filter:', filter);
    
    if (!grid) {
      logger('[Popup] render() - No grid element');
      return;
    }
    
    try {
      const session = await sessionManager?.getCurrentSession();
      if (!session) {
        logger('[Popup] render() - No session found');
        return;
      }
      
      logger('[Popup] render() - Session:', session.id, session.name, 'content len:', session.content?.length || 0, 'clipCount:', session.clipCount);
      logger('[Popup] render() - Session content preview:', session.content?.substring(0, 200));
      
      const clips = dataProcessor?.parseClips(session.content) || [];
      logger('[Popup] render() - Parsed clips:', clips.length);
      if (clips.length > 0) {
        logger('[Popup] render() - First clip ID:', clips[0].id, 'Title:', clips[0].title?.substring(0, 50));
      }
      
      const sessionData = dataProcessor?.createSessionData?.(session);
      logger('[Popup] render() - sessionData:', { 
        imagesCount: sessionData?.allImages?.length,
        screenshotsCount: Object.keys(sessionData?.screenshots || {}).length,
        hasSessionData: !!sessionData
      });
      const filtered = filter
        ? clips.filter(c => c.title.toLowerCase().includes(filter) || c.fullText.toLowerCase().includes(filter) || c.url?.toLowerCase().includes(filter))
        : clips;

      const nameEl = document.getElementById('notestash-session-name');
      if (nameEl) nameEl.textContent = `Session: ${session.name} | ${new Date(session.created || Date.now()).toLocaleDateString('de-DE')}`;
      if (footerCountEl) footerCountEl.textContent = `${clips.length} clips${filter ? ` (${filtered.length} shown)` : ''}`;

      grid.innerHTML = '';

      if (filtered.length === 0) {
        logger('[Popup] render() - No clips to display (filtered.length=0)');
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(255,255,255,0.6);">
          <p style="font-size:48px;margin:0;">ðŸ›ï¸</p>
          <p>${filter ? 'No matching clips' : 'No clips in this session'}</p>
        </div>`;
        return;
      }

      logger('[Popup] render() - Creating cards for', filtered.length, 'clips');
      filtered.forEach((clip, index) => {
        const card = createClipCard(clip, index, sessionData);
        grid.appendChild(card);
      });
      logger('[Popup] render() - Cards appended, render complete');

    } catch (err) {
      console.error('[Popup] render() ERROR:', err);
      console.error('[Popup] render() ERROR stack:', err.stack);
      logger('[Popup] Error rendering clips:', err);
    }
    logger('[Popup] === render() END ===');
  }

  function createClipCard(clip, index, sessionData) {
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};
    const clipId = clip.id;

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: `rgba(${accentRgb}, 0.08)`, backdropFilter: 'blur(16px)',
      borderRadius: '20px', padding: '20px',
      border: `1px solid rgba(${accentRgb}, 0.15)`, transition: 'all 0.35s ease',
      display: 'flex', flexDirection: 'column', gap: '8px'
    });
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = `0 8px 24px rgba(${accentRgb}, 0.2)`; });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.boxShadow = ''; });

    const title = document.createElement('h3');
    title.textContent = clip.title;
    Object.assign(title.style, {
      margin: '0', fontSize: '14px', fontWeight: '600', color: theme.text || '#e2e8f0',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
    });
    card.appendChild(title);

    if (clip.url) {
      const url = document.createElement('a');
      url.href = clip.url; url.textContent = clip.url; url.target = '_blank';
      Object.assign(url.style, {
        fontSize: '11px', color: theme.accent || '#8b0000', textDecoration: 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block'
      });
      card.appendChild(url);
    }

    const metaRow = document.createElement('div');
    Object.assign(metaRow.style, { display: 'flex', gap: '6px', flexWrap: 'wrap' });

    if (clip.id) metaRow.appendChild(createBadge(`#${clip.id?.split('-').pop()?.slice(0,6) || index}`, accentRgb));
    if (clip.captured) metaRow.appendChild(createBadge(`ðŸ• ${clip.captured}`, accentRgb));
    metaRow.appendChild(createBadge(`${clip.fullText.length.toLocaleString()} chars`, accentRgb));

    const hasScreenshot = sessionData?.screenshots?.[`screenshot-${clipId}`] || false;
    if (hasScreenshot) metaRow.appendChild(createBadge('ðŸ“·', accentRgb));

    card.appendChild(metaRow);

    const clipImages = sessionData?.allImages?.filter(img => img.clipId === clipId) || [];
    logger(`[Popup] Clip ${clipId} has ${clipImages.length} images. Total images in sessionData:`, sessionData?.allImages?.length);
    
    if (clipImages.length > 0) {
      const thumbGrid = document.createElement('div');
      Object.assign(thumbGrid.style, {
        display: 'flex', gap: '6px', overflowX: 'auto', padding: '4px 0',
        marginTop: '4px', scrollbarWidth: 'none'
      });
      
      clipImages.forEach(img => {
        const thumb = document.createElement('img');
        thumb.src = img.thumbnailDataUrl || img.thumbnail || img.fullDataUrl || img.dataUrl;
        Object.assign(thumb.style, {
          width: '64px', height: '64px', objectFit: 'cover',
          borderRadius: '8px', border: `1px solid rgba(${accentRgb}, 0.2)`,
          flexShrink: '0', background: 'rgba(0,0,0,0.2)'
        });
        thumbGrid.appendChild(thumb);
      });
      card.appendChild(thumbGrid);
    }

    const previewContainer = document.createElement('div');
    const preview = document.createElement('div');
    Object.assign(preview.style, {
      background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px',
      maxHeight: '100px', overflowY: 'auto', fontSize: '11px',
      color: theme.codeText || '#e2e8f0', fontFamily: 'Consolas, Monaco, monospace',
      lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      transition: 'max-height 0.3s ease', cursor: 'pointer'
    });

    preview.innerHTML = renderPreviewWithImages(clip.fullText.slice(0, 2000), sessionData);

    let isExpanded = false;
    const expandLabel = document.createElement('div');
    expandLabel.textContent = 'Click to expand';
    Object.assign(expandLabel.style, {
      fontSize: '10px', textAlign: 'center', color: theme.textSecondary || '#94a3b8',
      marginTop: '4px', cursor: 'pointer'
    });

    const toggleExpand = () => {
      isExpanded = !isExpanded;
      preview.style.maxHeight = isExpanded ? '400px' : '100px';
      expandLabel.textContent = isExpanded ? 'Click to collapse' : 'Click to expand';
    };
    preview.addEventListener('click', toggleExpand);
    expandLabel.addEventListener('click', toggleExpand);

    previewContainer.appendChild(preview);
    previewContainer.appendChild(expandLabel);
    card.appendChild(previewContainer);

    const actions = document.createElement('div');
    Object.assign(actions.style, { display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' });

    actions.appendChild(createActionButton('ðŸ“‹ Copy', accentRgb, theme, () => {
      navigator.clipboard.writeText(clip.fullText);
    }));

    if (clip.url) {
      actions.appendChild(createActionButton('ðŸ”— Open', accentRgb, theme, () => {
        window.open(clip.url, '_blank');
      }));
    }

    if (clipId && sessionData?.cachedHtml?.[clipId]) {
      actions.appendChild(createActionButton('ðŸŒ HTML', accentRgb, theme, () => {
        eventBus?.emit('popup:view-html', { clipId, cachedData: sessionData.cachedHtml[clipId] });
      }));
    }

    const delBtn = createActionButton('ðŸ—‘ï¸', accentRgb, theme, async () => {
      if (confirm('Delete this clip?')) {
        await deleteClip(clip.id);
        await render(searchInput?.value?.toLowerCase() || '');
      }
    });
    delBtn.style.background = 'rgba(239, 68, 68, 0.2)';
    delBtn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    actions.appendChild(delBtn);

    card.appendChild(actions);
    return card;
  }


  function createBadge(text, accentRgb) {
    const badge = document.createElement('span');
    badge.textContent = text;
    Object.assign(badge.style, {
      padding: '3px 8px', borderRadius: '6px', fontSize: '10px',
      background: `rgba(${accentRgb}, 0.15)`, color: 'rgba(255,255,255,0.8)',
      border: `1px solid rgba(${accentRgb}, 0.2)`
    });
    return badge;
  }

  function createPillButton(text, accentRgb, theme, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: '8px 16px', background: `rgba(${accentRgb}, 0.15)`,
      border: `1px solid rgba(${accentRgb}, 0.3)`, borderRadius: '8px',
      fontSize: '12px', color: theme.text || '#e2e8f0', cursor: 'pointer',
      transition: 'all 0.3s ease'
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createActionButton(text, accentRgb, theme, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: '6px 14px', background: `rgba(${accentRgb}, 0.2)`,
      border: `1px solid rgba(${accentRgb}, 0.3)`, borderRadius: '20px',
      fontSize: '11px', color: 'white', cursor: 'pointer', transition: 'all 0.25s ease'
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  /**
   * Render preview text with inline image placeholders
   */
  function renderPreviewWithImages(text, sessionData) {
    if (!text) return '';
    const escapeAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    let escaped = escapeAttr(text);
    escaped = escaped.replace(/!\[([^\]]*)\]\(attachments\/([^)]+)\)/g, (match, alt, filename) => {
      const imgData = sessionData?.allImages?.find(img => img.filename === filename);
      if (imgData?.thumbnailDataUrl || imgData?.thumbnail || imgData?.fullDataUrl || imgData?.dataUrl) {
        const src = imgData.thumbnailDataUrl || imgData.thumbnail || imgData.fullDataUrl || imgData.dataUrl;
        return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" style="max-width:80px;max-height:60px;border-radius:4px;vertical-align:middle;margin:2px;" />`;
      }
      return `[ðŸ“· ${alt || filename}]`;
    });
    return escaped;
  }

  function hide() {
    if (popup) popup.style.display = 'none';
    logger('[Popup] Hidden');
    eventBus?.emit('popup:hidden');
  }

  async function deleteClip(clipId) {
    try {
      const session = await sessionManager?.getCurrentSession?.();
      if (!session) return;
      const CLIP_SEPARATOR = '\n\n---\n\n';
      const clips = session.content.split(CLIP_SEPARATOR);
      const updatedClips = clips.filter(clip => {
        const idMatch = clip.match(/<!--\s*clip-id:\s*([^\s]+)\s*-->/);
        return idMatch ? idMatch[1] !== clipId : true;
      });
      session.content = updatedClips.join(CLIP_SEPARATOR);
      session.clipCount = Math.max(0, session.clipCount - 1);
      await sessionManager?.saveCurrentSession?.(session);
      eventBus?.emit('clip:deleted', { clipId });
      eventBus?.emit('session:changed');
    } catch (err) {
      logger('[Popup] Error deleting clip:', err);
    }
  }

  function isVisible() { return popup && popup.style.display === 'flex'; }

  function debounce(fn, ms) {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), ms); };
  }

  function destroy() {
    if (popup) { popup.remove(); popup = null; content = null; grid = null; searchInput = null; sessionTabs = null; }
    logger('[Popup] Destroyed');
  }

  function init() {
    logger('[Popup] Initialized');
    eventBus?.emit('module:initialized', { module: 'popup' });
  }

  return { init, show, hide, render, renderSessionTabs, isVisible, destroy };
};
