/**
 * AI Cleaner Module - AI-powered content cleaning
 * Supports Google AI, Anthropic, and OpenAI-compatible providers
 */

export const createAiCleaner = ({ bridge, eventBus, chromeApi, config, state, utils, sessionManager, cleanerPopup }) => {
  const logger = utils?.nsLog || console.log;

  const DEFAULT_PROMPT = `Clean and organize the following web content:
- Remove ads, navigation, and irrelevant content
- Keep only the main article/content
- Format as clean markdown
- Preserve the key information
- Describe images in detail wherever they appear
- Return ONLY the cleaned content, no explanations`;

  const IMAGE_PLACEHOLDER_INSTRUCTION = `\n\nCRITICAL INSTRUCTION: The text contains placeholders like __IMAGE_0__, __IMAGE_1__, etc. These represent images and MUST be preserved in your output exactly as they appear. For each image placeholder, please provide a comprehensive and detailed description of the image content right next to or below the placeholder.`;

  async function clean(content, format = 'markdown', promptIndex = 0) {
    const aiSettings = {
      provider: config?.get('aiProvider') || 'openrouter',
      apiUrl: config?.get('aiApiUrl') || 'https://openrouter.ai/api/v1',
      apiKey: config?.get('aiApiKey') || '',
      model: config?.get('aiModel') || 'x-ai/grok-4.1-fast',
      sendImages: config?.get('sendImagesToAi') || false
    };
    
    if (!aiSettings.apiKey) {
      eventBus?.emit('cleaner:error', { error: 'Please configure API key in settings' });
      return { cleaned: null, original: content, error: 'No API key configured' };
    }

    const { provider, apiUrl, apiKey, model } = aiSettings;
    const clips = parseClipsFromContent(content);
    if (clips.length === 0) return { cleaned: null, original: content, error: 'No clips to clean' };

    const systemPrompt = (await getSelectedPrompt(promptIndex)) + IMAGE_PLACEHOLDER_INSTRUCTION;
    let allContent = clips.map((clip, i) => `--- CLIP ${i + 1}: ${clip.title} ---\nURL: ${clip.url}\nCaptured: ${clip.captured}\n\n${clip.fullText}`).join('\n\n');

    const imageRefs = extractImageReferences(allContent);
    
    const session = await sessionManager?.getCurrentSession();
    const sessionImages = session?.images || {};
    
    imageRefs.forEach(img => { 
      allContent = allContent.replace(img.original, img.placeholder);
      const imgData = Object.values(sessionImages).find(si => si.filename === img.filename);
      if (imgData) {
        img.fullDataUrl = imgData.fullDataUrl || imgData.dataUrl;
      }
    });

    const userMessage = `Please clean and merge the following ${clips.length} web clippings into one coherent note:\n\n${allContent}`;

    const snippetsCount = clips.length;
    const imagesCount = imageRefs.length;

    eventBus?.emit('cleaner:status', { phase: 'connecting', message: 'Checking API connectivity...' });
    eventBus?.emit('cleaner:api-status', { status: 'checking', text: 'Checking...' });

    try {
      eventBus?.emit('cleaner:api-status', { status: 'connected', text: 'Connected' });
      eventBus?.emit('cleaner:request-status', { status: 'loading', text: `Sending ${snippetsCount} snippets & ${imagesCount} images...` });
      eventBus?.emit('cleaner:status', { phase: 'processing', message: `Sent ${snippetsCount} snippets & ${imagesCount} images successfully to ${model}. Waiting for response...` });

      let cleanedContent;
      if (provider === 'google') {
        cleanedContent = await callGoogle(apiKey, model, systemPrompt, userMessage, aiSettings.sendImages ? imageRefs : []);
      } else if (provider === 'anthropic') {
        cleanedContent = await callAnthropic(apiUrl, apiKey, model, systemPrompt, userMessage, aiSettings.sendImages ? imageRefs : []);
      } else {
        cleanedContent = await callOpenAICompatible(apiUrl, apiKey, model, systemPrompt, userMessage, aiSettings.sendImages ? imageRefs : []);
      }

      if (!cleanedContent) throw new Error('No content returned from AI');

      imageRefs.forEach(img => {
        cleanedContent = cleanedContent.replace(new RegExp(img.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), img.original);
      });

      eventBus?.emit('cleaner:request-status', { status: 'success', text: `Complete (${snippetsCount} snips, ${imagesCount} imgs)` });
      eventBus?.emit('cleaner:status', { phase: 'done', message: `Successfully cleaned ${snippetsCount} snippets and processed ${imagesCount} images.` });
      return { cleaned: cleanedContent, original: content, provider, model, imageRefs };

    } catch (error) {
      logger('[AiCleaner] error:', error);
      const isAuthError = error.message.includes('401') || error.message.toLowerCase().includes('auth');
      
      let displayError = error.message;
      if (isAuthError) {
        displayError = `Authentication Failed (401). Your API key is likely invalid or your OpenRouter/AI account has no credits. Full message: ${error.message}`;
      }
      
      eventBus?.emit('cleaner:api-status', { status: isAuthError ? 'error' : 'connected', text: isAuthError ? 'Invalid Key' : 'Connected' });
      eventBus?.emit('cleaner:request-status', { status: 'error', text: 'Failed' });
      eventBus?.emit('cleaner:status', { phase: 'error', message: displayError });
      eventBus?.emit('cleaner:error', { error: displayError });
      return { cleaned: null, original: content, error: displayError };
    }
  }

  async function callGoogle(apiKey, model, systemPrompt, userMessage, imageRefs = []) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const parts = [{ text: systemPrompt + '\n\n' + userMessage }];
    
    imageRefs.forEach(img => {
      if (img.fullDataUrl) {
        const [mime, base64] = img.fullDataUrl.split(';base64,');
        parts.push({
          inline_data: {
            mime_type: mime.split(':')[1],
            data: base64
          }
        });
      }
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: 16000 } })
    });
    if (!response.ok) throw new Error(`Google API error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async function callAnthropic(apiUrl, apiKey, model, systemPrompt, userMessage, imageRefs = []) {
    const userContent = [{ type: 'text', text: userMessage }];
    
    imageRefs.forEach(img => {
      if (img.fullDataUrl) {
        const [mime, base64] = img.fullDataUrl.split(';base64,');
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mime.split(':')[1],
            data: base64
          }
        });
      }
    });

    const response = await fetch(apiUrl + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 16000, system: systemPrompt, messages: [{ role: 'user', content: userContent }] })
    });
    if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  async function callOpenAICompatible(apiUrl, apiKey, model, systemPrompt, userMessage, imageRefs = []) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    };

    if (apiUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = window?.location?.href || 'https://notestash.io';
      headers['X-Title'] = 'NoteStash Extension';
    }

    const messageContent = [{ type: 'text', text: userMessage }];
    
    imageRefs.forEach(img => {
      if (img.fullDataUrl) {
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: img.fullDataUrl // OpenAI handles data URLs directly
          }
        });
      }
    });

    const response = await fetch(apiUrl + '/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ 
        model, 
        messages: [
          { role: 'system', content: systemPrompt }, 
          { role: 'user', content: messageContent }
        ], 
        max_tokens: 16000 
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async function getSelectedPrompt(index = 0) {
    try {
      const prompts = config?.get('exportPrompts');
      if (prompts && prompts[index] && prompts[index].prompt) {
        return prompts[index].prompt;
      }
    } catch (err) {}
    return DEFAULT_PROMPT;
  }

  function parseClipsFromContent(content) {
    if (!content) return [];
    const SEPARATOR_REGEX = /\n\n(?:---\n\n|<!-- NOTESTASH_CLIP_SEPARATOR -->\n\n)/;
    return content.split(SEPARATOR_REGEX).filter(p => p.trim()).map((part, index) => {
      const titleMatch = part.match(/^##\s+(.+)$/m);
      const urlMatch = part.match(/\*\*URL:\*\*\s*\[?([^\]\n]+)/);
      const capturedMatch = part.match(/\*\*Captured:\*\*\s*(.+)$/m);
      return { id: `clip-${index}`, title: titleMatch?.[1] || `Clip ${index + 1}`, url: urlMatch?.[1] || '', captured: capturedMatch?.[1] || '', fullText: part, index };
    });
  }

  function extractImageReferences(content) {
    const imageRefs = [];
    const imageRegex = /!\[([^\]]*)\]\(attachments\/([^)]+)\)/g;
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      imageRefs.push({ placeholder: `__IMAGE_${imageRefs.length}__`, original: match[0], alt: match[1], filename: match[2] });
    }
    return imageRefs;
  }

  async function checkApi(settings) {
    const aiSettings = settings || {
      provider: config?.get('aiProvider'),
      apiKey: config?.get('aiApiKey'),
      apiUrl: config?.get('aiApiUrl')
    };
    if (!aiSettings?.apiKey) return { success: false, error: 'No API key' };
    
    if (settings?.isFreeTest) {
      try {
        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const freeModel = 'openrouter/free';
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiSettings.apiKey}`,
            'HTTP-Referer': 'https://notestash.io',
            'X-Title': 'NoteStash Test'
          },
          body: JSON.stringify({
            model: freeModel,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 5
          })
        });
        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || 'Connection successful (no content returned)';
          return { success: true, provider: 'OpenRouter Free', testResult: content };
        }
        const data = await response.json().catch(() => ({}));
        return { success: false, error: data.error?.message || `HTTP ${response.status}` };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    const provider = aiSettings.provider || 'openrouter';
    try {
      if (provider === 'google') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models`;
        const resp = await fetch(url, { headers: { 'x-goog-api-key': aiSettings.apiKey } });
        return { success: resp.ok, provider: 'Google AI' };
      } else {
        const base = aiSettings.apiUrl || 'https://openrouter.ai/api/v1';
        const url = `${base.endsWith('/') ? base.slice(0,-1) : base}/models`;
        const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${aiSettings.apiKey}` } });
        return { success: resp.ok, provider };
      }
    } catch (err) { return { success: false, error: err.message }; }
  }

  async function init() {
    eventBus?.on('cleaner:check-api', async ({ settings, callback }) => {
      const result = await checkApi(settings);
      if (callback) callback(result);
    });
    eventBus?.on('cleaner:clean-requested', async ({ promptIndex, format, onComplete }) => {
      try {
        const session = await sessionManager?.getCurrentSession();
        if (!session || !session.content) throw new Error('No session content');
        const result = await clean(session.content, format || 'markdown', promptIndex || 0);
        if (result.cleaned) cleanerPopup?.setCleanedContent(result.cleaned);
      } catch (err) {
        eventBus?.emit('cleaner:error', { error: err.message });
      } finally { if (onComplete) onComplete(); }
    });
    logger('[NoteStash] AI Cleaner module initialized');
    return true;
  }

  return { init, clean, checkApi, extractImageReferences };
};
