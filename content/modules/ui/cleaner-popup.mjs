/**
 * AI Cleaner Popup Module
 * Split-view interface for cleaning notes with AI
 * 
 * @module content/modules/ui/cleaner-popup
 * @version 1.0.0
 * @license ISC
 */

export const createCleanerPopup = ({ bridge, eventBus, chromeApi, config, state, utils, registry, sessionManager, dataProcessor, glassmorphismSelect }) => {
  const logger = utils?.nsLog || console.log;
  let popup = null;
  let content = null;
  let leftPanel = null;
  let rightPanel = null;
  let cleanedContent = '';
  let currentPromptIndex = 0;

  const PROMPTS = [
    { name: 'Clean & Summarize', prompt: 'Clean and summarize the following content. Describe images in detail wherever they appear.' },
    { name: 'Extract Key Points', prompt: 'Extract key points from the content. Provide detailed descriptions for all images.' },
    { name: 'Simplify', prompt: 'Simplify the following content. Include comprehensive descriptions of any images present.' },
    { name: 'Custom', prompt: 'Describe images in detail.' }
  ];

  /**
   * Show the cleaner popup
   */
  async function show() {
    if (popup) {
      popup.style.display = 'flex';
      await render();
      return;
    }

    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};

    popup = document.createElement('div');
    popup.id = 'notestash-cleaner-popup';
    Object.assign(popup.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: '2147483647',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    content = document.createElement('div');
    Object.assign(content.style, {
      background: `rgba(${accentRgb}, 0.08)`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      width: '85%',
      maxWidth: '1400px',
      height: '80%',
      maxHeight: '900px',
      display: 'flex',
      flexDirection: 'column',
      color: theme.text || '#e2e8f0',
      borderRadius: '24px',
      boxShadow: `0 25px 50px rgba(${accentRgb}, 0.25), 0 10px 20px rgba(0,0,0,0.3)`,
      border: `1px solid rgba(${accentRgb}, 0.3)`,
      overflow: 'hidden'
    });

    const header = createHeader(accentRgb, theme);
    content.appendChild(header);

    const splitView = document.createElement('div');
    Object.assign(splitView.style, {
      display: 'flex',
      flex: '1',
      overflow: 'hidden'
    });

    leftPanel = createLeftPanel(accentRgb, theme);
    splitView.appendChild(leftPanel);

    rightPanel = await createRightPanel(accentRgb, theme);
    splitView.appendChild(rightPanel);

    content.appendChild(splitView);

    const footer = createFooter(accentRgb, theme);
    content.appendChild(footer);

    popup.appendChild(content);

    popup.addEventListener('click', (e) => {
      if (e.target === popup) hide();
    });

    document.body.appendChild(popup);

    if (registry) {
      registry.register('aiCleaners', popup);
    }

    await render();

    logger('[CleanerPopup] Shown');
    eventBus?.emit('cleaner-popup:shown');
  }

  /**
   * Create header
   */
  function createHeader(accentRgb, theme) {
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '20px 24px',
      borderBottom: `1px solid rgba(${accentRgb}, 0.2)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: `linear-gradient(135deg, rgba(${accentRgb}, 0.25) 0%, rgba(${accentRgb}, 0.15) 100%)`,
      backdropFilter: 'blur(12px)',
      flexShrink: '0'
    });

    header.innerHTML = `
      <div>
        <h2 style="margin:0;color:white;font-size:20px;font-weight:600;">AI Note Cleaner</h2>
        <span style="color:rgba(255,255,255,0.8);font-size:13px;">Merge and clean your clips into one coherent note</span>
      </div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = 'âœ•';
    Object.assign(closeBtn.style, {
      background: `rgba(${accentRgb}, 0.2)`,
      border: `1px solid rgba(${accentRgb}, 0.4)`,
      color: 'white',
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      fontSize: '18px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    });
    closeBtn.addEventListener('click', hide);
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * Create left panel
   */
  function createLeftPanel(accentRgb, theme) {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: '50%',
      display: 'flex',
      flexDirection: 'column',
      borderRight: `2px solid rgba(${accentRgb}, 0.15)`
    });

    const leftHeader = document.createElement('div');
    Object.assign(leftHeader.style, {
      padding: '14px 20px',
      background: `rgba(${accentRgb}, 0.1)`,
      borderBottom: `1px solid rgba(${accentRgb}, 0.15)`,
      fontWeight: '600',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexShrink: '0'
    });
    leftHeader.innerHTML = `<span style="color:#f59e0b;">ðŸ“„</span><span>Original Clips</span><span id="cleaner-clip-count" style="color:${theme.textSecondary || '#94a3b8'};font-weight:normal;font-size:13px;"></span>`;
    panel.appendChild(leftHeader);

    const content = document.createElement('div');
    content.id = 'cleaner-left-content';
    Object.assign(content.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '16px',
      background: `rgba(${accentRgb}, 0.05)`
    });
    panel.appendChild(content);

    return panel;
  }

  /**
   * Create right panel
   */
  async function createRightPanel(accentRgb, theme) {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      width: '50%',
      display: 'flex',
      flexDirection: 'column'
    });

    const rightHeader = document.createElement('div');
    Object.assign(rightHeader.style, {
      padding: '14px 20px',
      background: `rgba(${accentRgb}, 0.1)`,
      borderBottom: `1px solid rgba(${accentRgb}, 0.15)`,
      fontWeight: '600',
      fontSize: '14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px',
      flexShrink: '0'
    });

    const left = document.createElement('div');
    left.innerHTML = `<span style="color:#10b981;">âœ¨</span><span>Cleaned Note</span>`;
    rightHeader.appendChild(left);

    const right = document.createElement('div');
    Object.assign(right.style, { display: 'flex', gap: '10px', alignItems: 'center' });

    let formatSel = null;
    if (glassmorphismSelect) {
      const formatOptions = [
        { value: 'markdown', label: 'Markdown' },
        { value: 'text', label: 'Plain Text' },
        { value: 'summary', label: 'Summary' }
      ];
      formatSel = glassmorphismSelect.create(formatOptions, 0);
      formatSel.id = 'cleaner-format-select-glass';
      right.appendChild(formatSel);
    }

    let promptSel = null;
    if (glassmorphismSelect) {
      const exportPrompts = config?.get?.('exportPrompts') || PROMPTS;
      const promptOptions = exportPrompts.map((p, i) => ({ 
        value: i, 
        label: p.name || `Prompt ${i+1}` 
      }));
      
      promptSel = glassmorphismSelect.create(promptOptions, 0, (idx) => {
        currentPromptIndex = idx;
      });
      promptSel.id = 'cleaner-prompt-select-glass';
      right.appendChild(promptSel);
    }

    const cleanBtn = document.createElement('button');
    cleanBtn.textContent = 'ðŸ¤– Clean with AI';
    cleanBtn.id = 'btn-cleaner-clean';
    Object.assign(cleanBtn.style, {
      padding: '10px 18px',
      background: `linear-gradient(135deg, rgba(${accentRgb}, 0.3) 0%, rgba(${accentRgb}, 0.2) 100%)`,
      border: `1px solid rgba(${accentRgb}, 0.4)`,
      borderRadius: '10px',
      fontSize: '13px',
      color: 'white',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.3s ease'
    });
    cleanBtn.addEventListener('click', async () => {
      const format = formatSel?.getValue()?.value || 'markdown';
      
      cleanBtn.textContent = 'â³ Preparing payload...';
      cleanBtn.disabled = true;
      
      showLoadingState();
      
      const session = await sessionManager?.getCurrentSession?.();
      if (!session) {
        eventBus?.emit('cleaner:error', { error: 'No active session found' });
        return;
      }

      eventBus?.emit('cleaner:clean-requested', { 
        promptIndex: currentPromptIndex,
        format: format,
        onComplete: () => {
          cleanBtn.textContent = 'ðŸ¤– Clean with AI';
          cleanBtn.disabled = false;
        }
      });
    });
    right.appendChild(cleanBtn);

    rightHeader.appendChild(right);
    panel.appendChild(rightHeader);

    const content = document.createElement('div');
    content.id = 'cleaner-right-content';
    Object.assign(content.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '16px',
      background: `rgba(${accentRgb}, 0.05)`,
      position: 'relative' // For absolute spinner positioning if needed
    });

    const placeholder = document.createElement('div');
    placeholder.id = 'cleaner-right-placeholder';
    Object.assign(placeholder.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: theme.textSecondary || '#94a3b8',
      textAlign: 'center',
      background: `rgba(${accentRgb}, 0.08)`,
      borderRadius: '16px',
      border: `1px solid rgba(${accentRgb}, 0.15)`,
      padding: '40px 30px'
    });
    placeholder.innerHTML = `
      <div style="font-size:48px;margin-bottom:16px;">ðŸ¤–</div>
      <div style="font-size:16px;margin-bottom:8px;font-weight:500;color:${theme.text || '#e2e8f0'};">Click "Clean with AI" to generate</div>
      <div style="font-size:13px;opacity:0.8;">AI will merge all clips into one coherent note</div>
    `;
    content.appendChild(placeholder);

    panel.appendChild(content);

    return panel;
  }

  /**
   * Create footer with status indicators and action buttons
   */
  function createFooter(accentRgb, theme) {
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      padding: '16px 24px',
      borderTop: `1px solid rgba(${accentRgb}, 0.15)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: `rgba(${accentRgb}, 0.06)`,
      flexShrink: '0',
      flexWrap: 'wrap',
      gap: '10px'
    });

    const left = document.createElement('div');
    Object.assign(left.style, { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' });
    
    const apiStatusDot = document.createElement('div');
    apiStatusDot.id = 'cleaner-api-dot';
    Object.assign(apiStatusDot.style, {
      display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '11px', color: theme.textSecondary || '#94a3b8'
    });
    apiStatusDot.innerHTML = `<span id="status-api-icon" style="width:10px;height:10px;border-radius:50%;background:#64748b;display:inline-block;"></span><span id="status-api-text">API: Not checked</span>`;
    left.appendChild(apiStatusDot);

    const reqStatusDot = document.createElement('div');
    reqStatusDot.id = 'cleaner-req-dot';
    Object.assign(reqStatusDot.style, {
      display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '11px', color: theme.textSecondary || '#94a3b8'
    });
    reqStatusDot.innerHTML = `<span id="status-request-icon" style="width:10px;height:10px;border-radius:50%;background:#64748b;display:inline-block;"></span><span id="status-request-text">Request: Idle</span>`;
    left.appendChild(reqStatusDot);

    const statusText = document.createElement('span');
    statusText.id = 'cleaner-status-text';
    Object.assign(statusText.style, {
      fontSize: '11px', color: theme.textSecondary || '#94a3b8', fontStyle: 'italic'
    });
    left.appendChild(statusText);

    const checkApiBtn = document.createElement('button');
    checkApiBtn.textContent = 'ðŸ”Œ Check API';
    checkApiBtn.id = 'btn-check-api';
    Object.assign(checkApiBtn.style, {
      padding: '6px 12px',
      background: `rgba(${accentRgb}, 0.15)`,
      border: `1px solid rgba(${accentRgb}, 0.3)`,
      borderRadius: '6px',
      fontSize: '11px',
      color: theme.text || '#e2e8f0',
      cursor: 'pointer'
    });
    checkApiBtn.addEventListener('click', async () => {
      await checkAIConnection(false);
    });
    left.appendChild(checkApiBtn);

    const testFreeBtn = document.createElement('button');
    testFreeBtn.textContent = 'ðŸ†“ Test Free';
    testFreeBtn.id = 'btn-test-free';
    Object.assign(testFreeBtn.style, {
      padding: '6px 12px',
      background: 'rgba(16, 185, 129, 0.15)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#10b981',
      cursor: 'pointer',
      marginLeft: '4px'
    });
    testFreeBtn.addEventListener('click', async () => {
      await checkAIConnection(true);
    });
    left.appendChild(testFreeBtn);

    const downloadOriginalBtn = document.createElement('button');
    downloadOriginalBtn.textContent = 'â¬‡ï¸ Original ZIP';
    Object.assign(downloadOriginalBtn.style, {
      padding: '6px 12px',
      background: `rgba(${accentRgb}, 0.15)`,
      border: `1px solid rgba(${accentRgb}, 0.3)`,
      borderRadius: '6px',
      fontSize: '11px',
      color: theme.text || '#e2e8f0',
      cursor: 'pointer'
    });
    downloadOriginalBtn.addEventListener('click', () => {
      eventBus?.emit('cleaner:download-original-zip');
    });
    left.appendChild(downloadOriginalBtn);

    const donateBtn = document.createElement('a');
    donateBtn.textContent = 'â¤ï¸ Support';
    donateBtn.href = 'https://www.paypal.me/bvsteimer';
    donateBtn.target = '_blank';
    Object.assign(donateBtn.style, {
      padding: '6px 12px',
      background: 'rgba(236, 72, 153, 0.15)',
      border: '1px solid rgba(236, 72, 153, 0.3)',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#ec4899',
      cursor: 'pointer',
      textDecoration: 'none'
    });
    left.appendChild(donateBtn);
    
    footer.appendChild(left);

    const right = document.createElement('div');
    Object.assign(right.style, { display: 'flex', gap: '8px', alignItems: 'center' });

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'âœ… Accept & Replace';
    acceptBtn.id = 'btn-cleaner-accept';
    Object.assign(acceptBtn.style, {
      padding: '10px 20px',
      background: 'rgba(16, 185, 129, 0.2)',
      border: '1px solid rgba(16, 185, 129, 0.4)',
      borderRadius: '10px',
      fontSize: '13px',
      color: theme.text || '#e2e8f0',
      cursor: 'pointer',
      display: 'none'
    });
    acceptBtn.addEventListener('click', async () => {
      const session = await sessionManager?.getCurrentSession?.();
      if (session && cleanedContent) {
        const timestamp = new Date().toLocaleString('de-DE');
        const CLIP_SEPARATOR = '\n\n---\n\n';
        session.content = `# NoteStash\n\nStashed pages collection.${CLIP_SEPARATOR}## Cleaned Notes\n\n**URL:** [Merged from multiple clips]()\n**Captured:** ${timestamp}\n\n${cleanedContent}\n`;
        session.clipCount = 1;
        
        
        await sessionManager?.saveCurrentSession?.(session);
        eventBus?.emit('cleaner:accepted');
        hide();
      }
    });
    right.appendChild(acceptBtn);

    const downloadMdBtn = document.createElement('button');
    downloadMdBtn.textContent = 'â¬‡ï¸ .md';
    downloadMdBtn.id = 'btn-cleaner-download-md';
    Object.assign(downloadMdBtn.style, {
      padding: '10px 16px',
      background: `rgba(${accentRgb}, 0.15)`,
      border: `1px solid rgba(${accentRgb}, 0.3)`,
      borderRadius: '10px',
      fontSize: '12px',
      color: theme.text || '#e2e8f0',
      cursor: 'pointer',
      display: 'none'
    });
    downloadMdBtn.addEventListener('click', () => {
      if (cleanedContent) {
        eventBus?.emit('cleaner:download-cleaned-md', { cleanedContent });
      }
    });
    right.appendChild(downloadMdBtn);

    const downloadZipBtn = document.createElement('button');
    downloadZipBtn.textContent = 'â¬‡ï¸ ZIP';
    downloadZipBtn.id = 'btn-cleaner-download-zip';
    Object.assign(downloadZipBtn.style, {
      padding: '10px 16px',
      background: `rgba(${accentRgb}, 0.15)`,
      border: `1px solid rgba(${accentRgb}, 0.3)`,
      borderRadius: '10px',
      fontSize: '12px',
      color: theme.text || '#e2e8f0',
      cursor: 'pointer',
      display: 'none'
    });
    downloadZipBtn.addEventListener('click', () => {
      if (cleanedContent) {
        eventBus?.emit('cleaner:download-cleaned-zip', { cleanedContent });
      }
    });
    right.appendChild(downloadZipBtn);

    footer.appendChild(right);

    return footer;
  }

  /**
   * Render clips in left panel
   */
  async function render() {
    const content = document.getElementById('cleaner-left-content');
    const countEl = document.getElementById('cleaner-clip-count');
    if (!content) return;

    try {
      const session = await sessionManager?.getCurrentSession();
      if (!session) return;

      const clips = dataProcessor?.parseClips(session.content) || [];

      if (countEl) {
        countEl.textContent = `(${clips.length} clips)`;
      }

      content.innerHTML = '';

      if (clips.length === 0) {
        content.innerHTML = `
          <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.6);">
            <p style="font-size:36px;margin:0 0 12px 0;">ðŸ“­</p>
            <p>No clips in this session</p>
          </div>
        `;
        return;
      }

      clips.forEach((clip, i) => {
        const card = createClipCard(clip, i, session);
        content.appendChild(card);
      });

    } catch (err) {
      logger('[CleanerPopup] Error rendering:', err);
    }
  }

  /**
   * Create clip card for cleaner
   */
  function createClipCard(clip, index, session) {
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    const theme = state?.theme || {};
    const clipId = clip.id;

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: `rgba(${accentRgb}, 0.08)`,
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      padding: '16px 18px',
      marginBottom: '12px',
      border: `1px solid rgba(${accentRgb}, 0.15)`,
      transition: 'all 0.3s ease'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer'
    });

    const titleArea = document.createElement('div');
    titleArea.innerHTML = `
      <div style="font-weight:600;font-size:13px;color:${theme.text || '#e2e8f0'};">${index + 1}. ${clip.title}</div>
      <div style="font-size:11px;color:${theme.textSecondary || '#94a3b8'};">${clip.captured} â€¢ ${clip.fullText.length.toLocaleString()} chars</div>
    `;
    header.appendChild(titleArea);

    const expandBtn = document.createElement('span');
    expandBtn.textContent = 'â–¼';
    Object.assign(expandBtn.style, {
      color: theme.textSecondary || '#94a3b8',
      fontSize: '10px',
      transition: 'transform 0.2s'
    });
    header.appendChild(expandBtn);

    const allImages = Array.isArray(session?.images) ? session.images : Object.values(session?.images || {});
    const clipImages = allImages.filter(img => img.clipId === clipId);
    console.log(`[Cleaner] Clip ${clipId} has ${clipImages.length} images. Total images in session:`, allImages.length);
    
    if (clipImages.length > 0) {
      const thumbGrid = document.createElement('div');
      Object.assign(thumbGrid.style, {
        display: 'flex', gap: '6px', overflowX: 'auto', padding: '4px 0',
        marginTop: '8px', scrollbarWidth: 'none'
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

    const preview = document.createElement('div');
    Object.assign(preview.style, {
      marginTop: '0',
      padding: '0 10px',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '6px',
      fontSize: '11px',
      color: theme.codeText || '#e2e8f0',
      fontFamily: 'monospace',
      maxHeight: '0',
      overflowY: 'auto',
      overflowX: 'hidden',
      transition: 'max-height 0.3s ease, padding 0.3s ease, margin 0.3s ease',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    });
    preview.textContent = clip.fullText.slice(0, 2000) + (clip.fullText.length > 2000 ? '\n\n... (truncated)' : '');

    let isExpanded = false;
    header.addEventListener('click', () => {
      isExpanded = !isExpanded;
      preview.style.maxHeight = isExpanded ? '250px' : '0';
      preview.style.padding = isExpanded ? '10px' : '0 10px';
      preview.style.marginTop = isExpanded ? '12px' : '0';
      expandBtn.style.transform = isExpanded ? 'rotate(180deg)' : '';
    });

    card.appendChild(header);
    card.appendChild(preview);

    return card;
  }

  /**
   * Set cleaned content in right panel
   * @param {string} content - Cleaned content
   */
  function setCleanedContent(content) {
    const cleanBtn = document.getElementById('btn-cleaner-clean');
    if (cleanBtn) {
      cleanBtn.textContent = 'ðŸ¤– Clean with AI';
      cleanBtn.disabled = false;
    }

    cleanedContent = content;
    const rightContent = document.getElementById('cleaner-right-content');
    if (rightContent) {
      rightContent.innerHTML = '';
      const text = document.createElement('div');
      Object.assign(text.style, {
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        color: state?.theme?.text || '#e2e8f0'
      });
      text.textContent = content;
      rightContent.appendChild(text);
    }

    const acceptBtn = document.getElementById('btn-cleaner-accept');
    const downloadMdBtn = document.getElementById('btn-cleaner-download-md');
    const downloadZipBtn = document.getElementById('btn-cleaner-download-zip');
    if (acceptBtn) acceptBtn.style.display = 'block';
    if (downloadMdBtn) downloadMdBtn.style.display = 'block';
    if (downloadZipBtn) downloadZipBtn.style.display = 'block';
  }

  /**
   * Show loading state in right panel
   */
  function showLoadingState() {
    const rightContent = document.getElementById('cleaner-right-content');
    if (!rightContent) return;

    rightContent.innerHTML = '';
    
    const loadingContainer = document.createElement('div');
    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    
    Object.assign(loadingContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: state?.theme?.textSecondary || '#94a3b8'
    });

    loadingContainer.innerHTML = `
      <div class="notestash-spinner-animate" style="
        width: 48px;
        height: 48px;
        border: 4px solid rgba(${accentRgb}, 0.1);
        border-top: 4px solid rgba(${accentRgb}, 0.8);
        border-radius: 50%;
        margin-bottom: 20px;
      "></div>
      <div style="font-size: 14px; font-weight: 500;">AI is working its magic...</div>
      <div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">Sent and waiting for response</div>
    `;
    
    rightContent.appendChild(loadingContainer);
  }

  /**
   * Hide popup
   */
  function hide() {
    if (popup) {
      popup.style.display = 'none';
      cleanedContent = '';
    }
    logger('[CleanerPopup] Hidden');
    eventBus?.emit('cleaner-popup:hidden');
  }

  /**
   * Check if visible
   */
  function isVisible() {
    return popup && popup.style.display === 'flex';
  }

  /**
   * Check AI API connection and update status dots
   */
  async function checkAIConnection(isFreeTest = false) {
    setApiStatusDot('checking', isFreeTest ? 'Testing Free...' : 'Checking...');
    
    try {
      const aiSettings = {
        provider: config?.get?.('aiProvider') || 'openrouter',
        apiUrl: config?.get?.('aiApiUrl') || 'https://openrouter.ai/api/v1',
        apiKey: config?.get?.('aiApiKey') || '',
        model: config?.get?.('aiModel') || '',
        isFreeTest: isFreeTest
      };
      
      if (!aiSettings.apiKey) {
        setApiStatusDot('error', 'No API key');
        setStatusText('Configure API key in extension settings');
        
        showApiKeyPrompt();
        return;
      }
      
      eventBus?.emit('cleaner:check-api', { 
        settings: aiSettings,
        callback: (result) => {
          if (result.success) {
            setApiStatusDot('connected', `Connected: ${result.provider}`);
            setStatusText('API ready');
            
            if (isFreeTest && result.testResult) {
              setCleanedContent(`FREE MODEL TEST SUCCESSFUL\n\nProvider: ${result.provider}\nResponse: ${result.testResult}`);
            }
          } else {
            setApiStatusDot('error', result.error || 'Connection failed');
            setStatusText(result.error || 'Check failed');
            if (result.error?.toLowerCase().includes('key') || result.error?.toLowerCase().includes('auth')) {
               showApiKeyPrompt(aiSettings.apiKey);
            }
            
            if (isFreeTest) {
              eventBus?.emit('cleaner:error', { error: `Free Test Failed: ${result.error}` });
            }
          }
        }
      });
      
      setTimeout(() => {
        const apiText = document.getElementById('status-api-text');
        if (apiText?.textContent === 'API: Checking...') {
          setApiStatusDot('error', 'Timeout');
        }
      }, 10000);
      
    } catch (err) {
      logger('[CleanerPopup] API check error:', err);
      setApiStatusDot('error', 'Check failed');
    }
  }

  /**
   * Show prompt in right panel to set/update API key
   */
  function showApiKeyPrompt(currentKey = '') {
    const rightContent = document.getElementById('cleaner-right-content');
    if (!rightContent) return;

    const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
    rightContent.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;">
        <div style="font-size:40px;margin-bottom:20px;">ðŸ”‘</div>
        <h3 style="margin:0 0 12px 0;color:white;">Configure AI API Key</h3>
        <p style="font-size:13px;opacity:0.8;margin-bottom:24px;">To use AI cleaning, you need an API key from your selected provider.</p>
        
        <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:12px;">
          <input type="password" id="cleaner-temp-key" placeholder="Paste API key here..." style="
            width:100%;padding:12px 16px;background:rgba(0,0,0,0.3);border:1px solid rgba(${accentRgb}, 0.5);
            border-radius:10px;color:white;font-size:14px;outline:none;
          ">
          <button id="btn-save-temp-key" style="
            width:100%;padding:12px;background:rgba(${accentRgb}, 0.8);color:white;border:none;
            border-radius:10px;font-weight:600;cursor:pointer;transition:all 0.3s ease;
          ">Save Key & Check Again</button>
        </div>
        
        <p style="font-size:11px;opacity:0.6;margin-top:20px;">Key will be saved to extension settings permanently.</p>
      </div>
    `;
    const keyInput = document.getElementById('cleaner-temp-key');
    if (keyInput) keyInput.value = currentKey;

    document.getElementById('btn-save-temp-key')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-save-temp-key');
      const input = document.getElementById('cleaner-temp-key');
      const newKey = input.value.trim();
      
      if (!newKey) {
        input.style.borderColor = '#ef4444';
        return;
      }

      btn.textContent = 'â³ Saving...';
      btn.disabled = true;

      if (config?.set) {
        try {
          await config.set('aiApiKey', newKey);
          setStatusText('Key saved to settings');
          
          btn.textContent = 'âœ… Saved!';
          btn.style.background = '#10b981';
          
          setTimeout(() => {
            checkAIConnection();
          }, 800);
        } catch (err) {
          btn.textContent = 'âŒ Failed to save';
          btn.disabled = false;
          logger('[CleanerPopup] Failed to save key:', err);
        }
      }
    });
  }

  /**
   * Set API status dot color and text
   * @param {string} status - 'checking', 'connected', 'error', 'idle'
   * @param {string} text - Status text
   */
  function setApiStatusDot(status, text) {
    const icon = document.getElementById('status-api-icon');
    const label = document.getElementById('status-api-text');
    if (!icon || !label) return;

    const colors = {
      checking: '#f59e0b',
      connected: '#10b981',
      error: '#ef4444',
      idle: '#64748b'
    };
    icon.style.background = colors[status] || colors.idle;
    label.textContent = `API: ${text}`;
  }

  /**
   * Set request status dot color and text
   * @param {string} status - 'loading', 'success', 'error', 'idle'
   * @param {string} text - Status text
   */
  function setRequestStatusDot(status, text) {
    const icon = document.getElementById('status-request-icon');
    const label = document.getElementById('status-request-text');
    if (!icon || !label) return;

    const colors = {
      loading: '#f59e0b',
      success: '#10b981',
      error: '#ef4444',
      idle: '#64748b'
    };
    icon.style.background = colors[status] || colors.idle;
    label.textContent = `Request: ${text}`;
  }

  /**
   * Set general status text
   */
  function setStatusText(text) {
    const el = document.getElementById('cleaner-status-text');
    if (el) el.textContent = text;
  }

  /**
   * Download file with fallback mechanism
   * Tries chrome.downloads API first, falls back to manual download
   * @param {string} url - Blob URL
   * @param {string} filename - Filename
   * @returns {Promise<boolean>} Success status
   */
  async function downloadFile(url, filename) {
    if (chromeApi?.downloads?.download) {
      try {
        await chromeApi.downloads.download({ url, filename, saveAs: true });
        return true;
      } catch (err) {
        logger('[CleanerPopup] Chrome download failed, trying fallback:', err);
      }
    }
    
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (err) {
      logger('[CleanerPopup] Fallback download failed:', err);
      return false;
    }
  }

  /**
   * Destroy
   */
  function destroy() {
    if (popup) {
      popup.remove();
      popup = null;
      content = null;
      leftPanel = null;
      rightPanel = null;
      cleanedContent = '';
    }
    logger('[CleanerPopup] Destroyed');
  }

  function init() {
    eventBus?.on('cleaner:api-status', ({ status, text }) => {
      setApiStatusDot(status, text);
    });

    eventBus?.on('cleaner:request-status', ({ status, text }) => {
      setRequestStatusDot(status, text);
    });

    eventBus?.on('cleaner:status', ({ phase, message }) => {
      setStatusText(message);
      
      const cleanBtn = document.getElementById('btn-cleaner-clean');
      if (cleanBtn && phase === 'processing') {
        cleanBtn.textContent = 'â³ Processing...';
      }
    });

    eventBus?.on('cleaner:error', ({ error }) => {
      const cleanBtn = document.getElementById('btn-cleaner-clean');
      if (cleanBtn) {
        cleanBtn.textContent = 'ðŸ¤– Clean with AI';
        cleanBtn.disabled = false;
      }
      
      const rightContent = document.getElementById('cleaner-right-content');
      if (rightContent) {
        const accentRgb = state?.theme?.accentRgb || '139, 0, 0';
        rightContent.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#ef4444;text-align:center;padding:30px;">
            <div style="font-size:48px;margin-bottom:20px;">ðŸš«</div>
            <div style="font-weight:700;font-size:18px;margin-bottom:12px;color:white;">Provider API Error</div>
            
            <div id="cleaner-error-details" style="
              width:100%;
              max-width:500px;
              background:rgba(0,0,0,0.4);
              border:1px solid rgba(239,68,68,0.3);
              border-radius:12px;
              padding:16px;
              font-family:monospace;
              font-size:12px;
              text-align:left;
              margin-bottom:24px;
              overflow-y:auto;
              max-height:200px;
              color:#fca5a5;
              white-space:pre-wrap;
              word-break:break-all;
            ">${error}</div>
            
            <div style="display:flex;gap:12px;">
              <button id="btn-cleaner-retry" style="
                padding:10px 20px;
                background:rgba(${accentRgb}, 0.3);
                border:1px solid rgba(${accentRgb}, 0.5);
                color:white;
                border-radius:10px;
                cursor:pointer;
                font-weight:600;
              ">ðŸ”„ Try Again</button>
              
              <button id="btn-cleaner-fix-key" style="
                padding:10px 20px;
                background:rgba(255,255,255,0.1);
                border:1px solid rgba(255,255,255,0.2);
                color:white;
                border-radius:10px;
                cursor:pointer;
              ">ðŸ”‘ Update API Key</button>
            </div>
          </div>
        `;
        
        document.getElementById('btn-cleaner-retry')?.addEventListener('click', () => {
          document.getElementById('btn-cleaner-clean')?.click();
        });
        
        document.getElementById('btn-cleaner-fix-key')?.addEventListener('click', () => {
          showApiKeyPrompt(config?.get('aiApiKey') || '');
        });
      }
    });

    logger('[CleanerPopup] Initialized');
    eventBus?.emit('module:initialized', { module: 'cleanerPopup' });
  }

  return {
    init,
    show,
    hide,
    render,
    setCleanedContent,
    isVisible,
    destroy
  };
};
