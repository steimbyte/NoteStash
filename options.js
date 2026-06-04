let currentHost = '';

function status(msg, isError = false, duration = 3000) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = isError ? 'error' : 'success';
  setTimeout(() => { el.className = ''; el.textContent = ''; }, duration);
}

// Debounce helper for auto-save
let saveTimeout = null;
function autoSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    save(true); // true = silent (auto-save)
  }, 500);
}

async function getCurrentSession() {
  const data = await chrome.storage.local.get(['sessions', 'currentSessionId']);
  const sessions = data.sessions || [];
  const currentId = data.currentSessionId;
  
  if (!currentId || sessions.length === 0) {
    return null;
  }
  
  return sessions.find(s => s.id === currentId) || sessions[0];
}

async function loadNotesInfo() {
  const session = await getCurrentSession();
  if (session) {
    document.getElementById('clipCount').textContent = session.clipCount || 0;
    document.getElementById('preview').value = session.content || '';
  } else {
    document.getElementById('clipCount').textContent = 0;
    document.getElementById('preview').value = '';
  }
}

const DEFAULT_SYSTEM_PROMPT = `You are a note-cleaning assistant. Your task is to take multiple web clippings and merge them into one coherent, well-structured markdown note.

Instructions:
- Remove duplicate information
- Organize content logically with clear headings
- Keep all important facts, code snippets, and key information
- Remove navigation elements, ads, and irrelevant content
- Maintain markdown formatting (headers, lists, code blocks, links)
- Create a clear summary at the top if appropriate
- Preserve any images references
- Output clean, readable markdown`;

// Default export prompts configuration
const DEFAULT_EXPORT_PROMPTS = [
  {
    name: 'Markdown (Default)',
    prompt: `You are a note-cleaning assistant. Your task is to take multiple web clippings and merge them into one coherent, well-structured markdown note.

Instructions:
- Remove duplicate information
- Organize content logically with clear headings
- Keep all important facts, code snippets, and key information
- Remove navigation elements, ads, and irrelevant content
- Maintain markdown formatting (headers, lists, code blocks, links)
- Create a clear summary at the top if appropriate
- Preserve any images references
- Output clean, readable markdown`
  },
  {
    name: 'Word Format',
    prompt: `You are a document formatting assistant. Your task is to take multiple web clippings and merge them into a clean, professional document suitable for Microsoft Word.

Instructions:
- Remove duplicate information
- Organize content with clear hierarchical headings (use # for main headings, ## for subheadings)
- Use proper paragraph formatting with clear spacing
- Convert bullet points to proper lists
- Keep all important facts and key information
- Remove navigation elements, ads, and irrelevant web content
- Format any tables cleanly
- Use bold for emphasis on key terms
- Create an executive summary at the top
- Output should be clean text that can be easily pasted into Word
- Avoid markdown-specific syntax that doesn't render in Word (like code blocks with backticks)`
  },
  {
    name: 'Clean Text Only',
    prompt: `You are a text extraction assistant. Your task is to take multiple web clippings and extract only the essential, clean text content.

Instructions:
- Remove ALL formatting (no markdown, no special characters)
- Remove duplicate information
- Extract only the core content and facts
- Remove navigation elements, ads, headers, footers, and irrelevant content
- Remove any code snippets unless they are essential
- Output plain, readable text in simple paragraphs
- Use simple line breaks between sections
- No bullet points, no headers, just flowing text
- Keep it concise and readable`
  },
  {
    name: 'Custom',
    prompt: ''
  }
];

async function load() {
  const result = await chrome.storage.sync.get(['blacklist', 'whitelist', 'mode', 'prefix', 'screenshotFormat', 'screenshotQuality', 'aiProvider', 'aiApiUrl', 'aiApiKey', 'aiModel', 'aiSystemPrompt', 'confirmDeletion', 'exportPrompts', 'showFloatingButton', 'contentFilterMode', 'accentColor', 'scanIframes', 'spaSensitivity', 'imageTimeout', 'showProgress', 'autoSave', 'debugLogging', 'sendImagesToAi', 'defaultSaveLocation']);
  
  document.getElementById('blacklist').value = (result.blacklist || []).join('\n');
  document.getElementById('whitelist').value = (result.whitelist || []).join('\n');
  document.getElementById('prefix').value = result.prefix || 'NoteStash';
  
  // Floating button toggle (default: true)
  document.getElementById('showFloatingButton').checked = result.showFloatingButton !== false;
  
  // Confirm deletion toggle (default: true)
  document.getElementById('confirmDeletion').checked = result.confirmDeletion !== false;
  
  // Scan iframes toggle (default: true)
  document.getElementById('scanIframes').checked = result.scanIframes !== false;
  
  // NEW: SPA Detection Sensitivity (default: medium)
  document.getElementById('spaSensitivity').value = result.spaSensitivity || 'medium';
  
  // NEW: Image Load Timeout (default: 3 seconds)
  const imageTimeout = result.imageTimeout || 3;
  document.getElementById('imageTimeout').value = imageTimeout;
  document.getElementById('imageTimeoutValue').textContent = imageTimeout;
  
  // NEW: Show Progress Bar toggle (default: true)
  document.getElementById('showProgress').checked = result.showProgress !== false;
  
  // NEW: Auto-save toggle (default: true)
  document.getElementById('autoSave').checked = result.autoSave !== false;
  
  // NEW: Debug logging toggle (default: false)
  document.getElementById('debugLogging').checked = result.debugLogging === true;
  
  // NEW: Send images to AI toggle (default: false)
  document.getElementById('sendImagesToAi').checked = result.sendImagesToAi === true;

  // NEW: Default save location
  document.getElementById('defaultSaveLocation').value = result.defaultSaveLocation || 'NoteStash';
  
  // Content filter mode (default: lean)
  document.getElementById('contentFilterMode').value = result.contentFilterMode || 'lean';
  
  const mode = result.mode || 'blacklist';
  const radio = document.querySelector('input[name="mode"][value="' + mode + '"]');
  if (radio) radio.checked = true;
  
  // Screenshot settings
  const screenshotFormat = result.screenshotFormat || 'jpeg';
  const formatRadio = document.querySelector('input[name="screenshotFormat"][value="' + screenshotFormat + '"]');
  if (formatRadio) formatRadio.checked = true;
  
  const quality = result.screenshotQuality || 80;
  document.getElementById('screenshotQuality').value = quality;
  document.getElementById('qualityValue').textContent = quality;
  
  // Show/hide quality slider based on format
  updateQualityVisibility(screenshotFormat);
  
  // AI settings
  const aiProvider = result.aiProvider || 'openrouter';
  document.getElementById('aiProvider').value = aiProvider;
  document.getElementById('aiApiUrl').value = result.aiApiUrl || 'https://openrouter.ai/api/v1';
  document.getElementById('aiApiKey').value = result.aiApiKey || '';
  document.getElementById('aiModel').value = result.aiModel || 'x-ai/grok-4.1-fast';
  
  // Update UI based on provider
  updateProviderUI(aiProvider);
  
  // Load export prompts (4 slots)
  const exportPrompts = result.exportPrompts || DEFAULT_EXPORT_PROMPTS;
  for (let i = 1; i <= 4; i++) {
    const promptData = exportPrompts[i - 1] || DEFAULT_EXPORT_PROMPTS[i - 1];
    document.getElementById('promptName' + i).value = promptData.name || '';
    document.getElementById('promptText' + i).value = promptData.prompt || '';
  }
  
  // Load accent color
  const accentColor = result.accentColor || '#8b0000';
  document.getElementById('accentColorPicker').value = accentColor;
  document.getElementById('accentColorHex').value = accentColor;
  updateAccentColorPreview(accentColor);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      currentHost = url.hostname;
      document.getElementById('hostBlack').textContent = currentHost;
      document.getElementById('hostWhite').textContent = currentHost;
    }
  } catch (e) {
    document.getElementById('hostBlack').textContent = 'N/A';
    document.getElementById('hostWhite').textContent = 'N/A';
  }
  
  await loadNotesInfo();
  status('Settings loaded');
}

async function save(silent = false) {
  const blacklistText = document.getElementById('blacklist').value;
  const whitelistText = document.getElementById('whitelist').value;
  const prefix = document.getElementById('prefix').value.trim() || 'NoteStash';
  const modeRadio = document.querySelector('input[name="mode"]:checked');
  const mode = modeRadio ? modeRadio.value : 'blacklist';
  
  // Screenshot settings
  const formatRadio = document.querySelector('input[name="screenshotFormat"]:checked');
  const screenshotFormat = formatRadio ? formatRadio.value : 'jpeg';
  const screenshotQuality = parseInt(document.getElementById('screenshotQuality').value) || 80;
  
  // Behavior settings
  const showFloatingButton = document.getElementById('showFloatingButton').checked;
  const confirmDeletion = document.getElementById('confirmDeletion').checked;
  const scanIframes = document.getElementById('scanIframes').checked;
  
  // Content filter mode
  const contentFilterMode = document.getElementById('contentFilterMode').value || 'lean';
  
  // AI settings
  const aiProvider = document.getElementById('aiProvider').value || 'openrouter';
  const aiApiUrl = document.getElementById('aiApiUrl').value.trim() || 'https://openrouter.ai/api/v1';
  const aiApiKey = document.getElementById('aiApiKey').value.trim();
  const aiModel = document.getElementById('aiModel').value.trim() || 'x-ai/grok-4.1-fast';
  
  // Export prompts (4 slots)
  const exportPrompts = [];
  for (let i = 1; i <= 4; i++) {
    exportPrompts.push({
      name: document.getElementById('promptName' + i).value.trim() || DEFAULT_EXPORT_PROMPTS[i - 1].name,
      prompt: document.getElementById('promptText' + i).value.trim() || ''
    });
  }
  
  const blacklist = blacklistText.trim() ? blacklistText.split(/\n/).map(s => s.trim()).filter(Boolean) : [];
  const whitelist = whitelistText.trim() ? whitelistText.split(/\n/).map(s => s.trim()).filter(Boolean) : [];
  
  // Accent color
  const accentColor = document.getElementById('accentColorPicker').value;
  
  // NEW: Advanced recording settings
  const spaSensitivity = document.getElementById('spaSensitivity').value || 'medium';
  const imageTimeout = parseInt(document.getElementById('imageTimeout').value) || 3;
  const showProgress = document.getElementById('showProgress').checked;
  const autoSave = document.getElementById('autoSave').checked;
  const debugLogging = document.getElementById('debugLogging').checked;
  const sendImagesToAi = document.getElementById('sendImagesToAi').checked;
  const defaultSaveLocation = document.getElementById('defaultSaveLocation').value.trim();
  
  await chrome.storage.sync.set({ blacklist, whitelist, mode, prefix, screenshotFormat, screenshotQuality, showFloatingButton, confirmDeletion, scanIframes, contentFilterMode, aiProvider, aiApiUrl, aiApiKey, aiModel, exportPrompts, accentColor, spaSensitivity, imageTimeout, showProgress, autoSave, debugLogging, sendImagesToAi, defaultSaveLocation });
  
  if (silent) {
    status('Auto-saved', false, 1500);
  } else {
    status('Settings saved!');
  }
}

function updateQualityVisibility(format) {
  const container = document.getElementById('qualityContainer');
  container.style.opacity = format === 'jpeg' ? '1' : '0.5';
  document.getElementById('screenshotQuality').disabled = format !== 'jpeg';
}

async function clearNotes() {
  if (!confirm('Clear current session clips? This cannot be undone.')) return;
  
  const data = await chrome.storage.local.get(['sessions', 'currentSessionId']);
  const sessions = data.sessions || [];
  const currentId = data.currentSessionId;
  
  const idx = sessions.findIndex(s => s.id === currentId);
  if (idx >= 0) {
    sessions[idx].content = '# NoteStash\n\nStashed pages collection.\n';
    sessions[idx].clipCount = 0;
    sessions[idx].screenshots = {};
    sessions[idx].images = [];
    sessions[idx].cachedHtml = {};  // Also clear cached HTML
    await chrome.storage.local.set({ sessions });
  }
  
  await loadNotesInfo();
  status('Session clips cleared');
}

async function downloadNotes() {
  const session = await getCurrentSession();
  
  if (!session || !session.content || session.clipCount === 0) {
    status('No clips to download', true);
    return;
  }
  
  const settings = await chrome.storage.sync.get(['prefix']);
  const prefix = settings.prefix || 'NoteStash';
  const date = new Date().toISOString().split('T')[0];
  const safeName = session.name.replace(/[^\w\-]/g, '_');
  const baseFilename = prefix + '-' + safeName + '-' + date;
  
  // Create ZIP file
  const zip = new JSZip();
  
  let content = session.content;
  
  // Create attachments folder
  const attachmentsFolder = zip.folder('attachments');
  
  // Add screenshots to ZIP
  if (session.screenshots && Object.keys(session.screenshots).length > 0) {
    for (const [name, dataUrl] of Object.entries(session.screenshots)) {
      const base64Data = dataUrl.split(',')[1];
      const ext = dataUrl.includes('image/jpeg') ? 'jpg' : 'png';
      attachmentsFolder.file(name + '.' + ext, base64Data, { base64: true });
    }
  }
  
  // Add downloaded page images
  const images = Array.isArray(session.images) ? session.images : Object.values(session.images || {});
  if (images.length > 0) {
    for (const imgData of images) {
      if (imgData.dataUrl || imgData.fullDataUrl) {
        const dataUrl = imgData.fullDataUrl || imgData.dataUrl;
        const base64Data = dataUrl.split(',')[1];
        attachmentsFolder.file(imgData.filename, base64Data, { base64: true });
      }
    }
  }
  
  // Add markdown file
  zip.file(baseFilename + '.md', content);
  
  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  
  chrome.downloads.download({
    url: zipUrl,
    filename: baseFilename + '.zip',
    saveAs: false
  }, () => {
    URL.revokeObjectURL(zipUrl);
    status('Downloaded: ' + baseFilename + '.zip');
  });
}

function addCurrentSite(listType) {
  if (!currentHost) return;
  const textarea = document.getElementById(listType);
  const current = textarea.value.trim();
  const lines = current ? current.split('\n').map(s => s.trim()).filter(Boolean) : [];
  
  if (!lines.includes(currentHost)) {
    lines.push(currentHost);
    textarea.value = lines.join('\n');
    status('Added ' + currentHost + ' to ' + listType);
  } else {
    status(currentHost + ' already in ' + listType, true);
  }
}

// ============ ACCENT COLOR FUNCTIONS ============
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '139, 0, 0';
}

function updateAccentColorPreview(color) {
  const rgb = hexToRgb(color);
  document.documentElement.style.setProperty('--accent-color', color);
  document.documentElement.style.setProperty('--accent-rgb', rgb);
}

function validateHexColor(hex) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

document.addEventListener('DOMContentLoaded', function() {
  load();
  document.getElementById('saveBtn').addEventListener('click', () => save(false));
  document.getElementById('loadBtn').addEventListener('click', load);
  document.getElementById('clearBtn').addEventListener('click', clearNotes);
  document.getElementById('downloadBtn').addEventListener('click', downloadNotes);
  document.getElementById('addBlacklist').addEventListener('click', function() { addCurrentSite('blacklist'); autoSave(); });
  document.getElementById('addWhitelist').addEventListener('click', function() { addCurrentSite('whitelist'); autoSave(); });
  
  // Screenshot format change
  document.querySelectorAll('input[name="screenshotFormat"]').forEach(radio => {
    radio.addEventListener('change', function() {
      updateQualityVisibility(this.value);
      autoSave();
    });
  });
  
  // Quality slider
  document.getElementById('screenshotQuality').addEventListener('input', function() {
    document.getElementById('qualityValue').textContent = this.value;
    autoSave();
  });
  
  // NEW: Image timeout slider
  document.getElementById('imageTimeout').addEventListener('input', function() {
    document.getElementById('imageTimeoutValue').textContent = this.value;
    autoSave();
  });
  
  // AI Provider change
  document.getElementById('aiProvider').addEventListener('change', function() {
    updateProviderUI(this.value);
    autoSave();
  });
  
  // Auto-save on all input changes
  // Text inputs and textareas
  document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach(el => {
    // Skip the preview textarea (it's readonly)
    if (el.id === 'preview') return;
    el.addEventListener('input', autoSave);
  });
  
  // Checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', autoSave);
  });
  
  // Radio buttons (mode)
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', autoSave);
  });
  
  // Select dropdowns
  document.querySelectorAll('select').forEach(el => {
    el.addEventListener('change', autoSave);
  });
  
  // Accent color picker
  const accentColorPicker = document.getElementById('accentColorPicker');
  const accentColorHex = document.getElementById('accentColorHex');
  
  if (accentColorPicker && accentColorHex) {
    // Color picker change
    accentColorPicker.addEventListener('input', function() {
      accentColorHex.value = this.value;
      updateAccentColorPreview(this.value);
      autoSave();
    });
    
    // Hex input change
    accentColorHex.addEventListener('input', function() {
      let value = this.value;
      if (!value.startsWith('#')) {
        value = '#' + value;
      }
      if (validateHexColor(value)) {
        accentColorPicker.value = value;
        updateAccentColorPreview(value);
        autoSave();
      }
    });
    
    // Reset to default button
    const resetBtn = document.getElementById('resetAccentColor');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        const defaultColor = '#8b0000';
        accentColorPicker.value = defaultColor;
        accentColorHex.value = defaultColor;
        updateAccentColorPreview(defaultColor);
        autoSave();
      });
    }
  }

  // API Check Button
  const checkApiBtn = document.getElementById('checkApiBtn');
  if (checkApiBtn) {
    checkApiBtn.addEventListener('click', checkApi);
  }

  // Test Free Models Button
  const testFreeBtn = document.getElementById('testFreeBtn');
  if (testFreeBtn) {
    testFreeBtn.addEventListener('click', () => checkApi(true));
  }
});

async function checkApi(isFreeTest = false) {
  const provider = document.getElementById('aiProvider').value;
  const apiUrlInput = document.getElementById('aiApiUrl');
  const apiUrl = apiUrlInput.value.trim();
  const apiKey = document.getElementById('aiApiKey').value.trim();
  const modelInput = document.getElementById('aiModel');
  const statusEl = document.getElementById('apiStatus');
  const checkApiBtn = document.getElementById('checkApiBtn');
  const testFreeBtn = document.getElementById('testFreeBtn');

  if (!apiKey) {
    statusEl.textContent = '❌ Error: API Key is required';
    statusEl.style.color = '#ef4444';
    document.getElementById('aiApiKey').focus();
    return;
  }

  const activeBtn = isFreeTest ? testFreeBtn : checkApiBtn;
  statusEl.innerHTML = '<span class="spinner"></span> ' + (isFreeTest ? 'Testing Free Model...' : 'Checking API...');
  statusEl.style.color = '#f59e0b';
  
  if (checkApiBtn) checkApiBtn.disabled = true;
  if (testFreeBtn) testFreeBtn.disabled = true;

  try {
    let success = false;
    let errorMsg = '';
    let responseData = null;

    if (isFreeTest) {
      // Test OpenRouter Free Model Specifically
      const testUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const freeModel = 'openrouter/free';
      
      const resp = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://notestash.io',
          'X-Title': 'NoteStash Test'
        },
        body: JSON.stringify({
          model: freeModel,
          messages: [{ role: 'user', content: 'Say "Connection successful"' }],
          max_tokens: 10
        })
      });
      
      success = resp.ok;
      if (!success) {
        responseData = await resp.json().catch(() => ({}));
        errorMsg = responseData.error?.message || `HTTP ${resp.status}`;
      } else {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        console.log('[NoteStash] Free test response:', content);
      }
    } else if (provider === 'google') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const resp = await fetch(url);
      success = resp.ok;
      if (!success) {
        responseData = await resp.json().catch(() => ({}));
        errorMsg = responseData.error?.message || `HTTP ${resp.status}`;
      }
    } else {
      // OpenAI-compatible (OpenRouter, OpenAI, Anthropic via proxy, etc.)
      const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const url = `${base}/models`;
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      success = resp.ok;
      if (!success) {
        responseData = await resp.json().catch(() => ({}));
        errorMsg = responseData.error?.message || `HTTP ${resp.status}`;
      }
    }

    if (success) {
      statusEl.textContent = '✅ API Connection Successful!';
      statusEl.style.color = '#10b981';
      
      // Show free test result in preview box
      if (isFreeTest && responseData) {
        const preview = document.getElementById('preview');
        if (preview) {
          preview.value = `FREE MODEL TEST SUCCESSFUL\n\nModel: openrouter/free\nResponse: ${responseData.choices?.[0]?.message?.content}`;
        }
      }
      
      // Auto-save if successful
      save(true);
    } else {
      if (errorMsg.includes('401') || errorMsg.toLowerCase().includes('auth') || errorMsg.toLowerCase().includes('key')) {
        statusEl.textContent = `❌ Invalid API Key: ${errorMsg}`;
      } else {
        statusEl.textContent = `❌ Connection Failed: ${errorMsg}`;
      }
      statusEl.style.color = '#ef4444';
    }
  } catch (err) {
    statusEl.textContent = `❌ Network Error: ${err.message}`;
    statusEl.style.color = '#ef4444';
  } finally {
    if (checkApiBtn) checkApiBtn.disabled = false;
    if (testFreeBtn) testFreeBtn.disabled = false;
  }
}

// Update UI based on selected AI provider
function updateProviderUI(provider) {
  const apiUrlContainer = document.getElementById('apiUrlContainer');
  const apiUrlInput = document.getElementById('aiApiUrl');
  const modelInput = document.getElementById('aiModel');
  const modelHint = document.getElementById('modelHint');
  const apiKeyInput = document.getElementById('aiApiKey');
  
  switch (provider) {
    case 'openrouter':
      apiUrlContainer.style.display = 'flex';
      apiUrlInput.value = 'https://openrouter.ai/api/v1';
      apiKeyInput.placeholder = 'sk-or-...';
      modelInput.placeholder = 'x-ai/grok-4.1-fast';
      modelHint.textContent = 'OpenRouter: x-ai/grok-4.1-fast, google/gemini-pro, anthropic/claude-3.5-sonnet, openai/gpt-4o';
      break;
    case 'google':
      apiUrlContainer.style.display = 'none';
      apiKeyInput.placeholder = 'AIza...';
      modelInput.value = 'gemini-1.5-flash';
      modelInput.placeholder = 'gemini-1.5-flash';
      modelHint.textContent = 'Google: gemini-1.5-flash, gemini-1.5-pro, gemini-pro';
      break;
    case 'openai':
      apiUrlContainer.style.display = 'flex';
      apiUrlInput.value = 'https://api.openai.com/v1';
      apiKeyInput.placeholder = 'sk-...';
      modelInput.value = 'gpt-4o';
      modelInput.placeholder = 'gpt-4o';
      modelHint.textContent = 'OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo';
      break;
    case 'anthropic':
      apiUrlContainer.style.display = 'flex';
      apiUrlInput.value = 'https://api.anthropic.com/v1';
      apiKeyInput.placeholder = 'sk-ant-...';
      modelInput.value = 'claude-3-5-sonnet-20241022';
      modelInput.placeholder = 'claude-3-5-sonnet-20241022';
      modelHint.textContent = 'Anthropic: claude-3-5-sonnet-20241022, claude-3-opus-20240229, claude-3-haiku-20240307';
      break;
    case 'custom':
      apiUrlContainer.style.display = 'flex';
      apiKeyInput.placeholder = 'Your API key';
      modelHint.textContent = 'Custom OpenAI-compatible endpoint';
      break;
  }
}