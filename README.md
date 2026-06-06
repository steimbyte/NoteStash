# NoteStash

📦 **Chrome MV3 extension for clipping web content to Markdown, with AI-powered cleaning.**

Stash any page as clean Markdown. Organize clips into sessions. Clean and merge with AI (OpenAI, Anthropic, Google, OpenRouter, custom). Export as `.md` or `.zip` with attached images.

## Features

- **One-click clipping** — floating button or `Alt+C` keyboard shortcut
- **Sessions** — multiple parallel clip collections
- **AI cleaning** — merge and rewrite clips with any LLM provider
- **Recording mode** — auto-capture page changes over time
- **Image extraction** — pull images, screenshots, and metadata
- **Full-text search** across all saved clips
- **Custom export prompts** — Markdown, Word, Plain Text, or your own
- **Export** — `.md` or `.zip` (with attached images)

## Install

### From source (developer)

```bash
git clone https://github.com/yourusername/notestash.git
cd notestash
npm install
npm run build
```

Then in Chrome:
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the `notestash/` directory
5. The 📦 icon appears in your toolbar

### From Chrome Web Store

(Coming soon — see releases page for signed `.crx`)

## Usage

| Action | How |
|--------|-----|
| Clip the current page | Click the floating button or press `Alt+C` |
| Browse saved clips | Click the floating button, then "View" in the arc menu |
| AI-clean your clips | In the popup, click "Clean & Merge" |
| Open settings | Click the toolbar icon (opens in a new tab) |
| Move the floating button | Drag it (5 px threshold) |
| Toggle dark/light mode | Settings → Theme |
| Export | In the popup, click "Download" (`.md` or `.zip`) |

## Architecture

- **Manifest V3** Chrome extension
- **36 modular ES6 modules** under `content/modules/`, bundled with **Vite** to a single IIFE
- **Factory pattern** with dependency injection
- **Event bus** for cross-module communication
- **Shadow DOM** for UI isolation from host pages (planned)

```
content/
├── bridge.mjs              # Module coordination
├── chrome-api.mjs          # chrome.* API wrapper with retry
├── events.mjs              # Event bus
└── modules/
    ├── core/               # config, state, utils
    ├── content/            # html-to-markdown, xpath-resolver
    ├── features/           # clip-capture, ai-cleaner, download-export
    ├── images/             # detector, processor
    ├── performance/        # event-controllers, element-registry
    ├── recording/          # mode, dom-observer, auto-capture
    ├── session/            # manager, clip-parser, data-processor
    └── ui/                 # popup, cleaner-popup, floating-buttons, arc-menu
        └── components/     # gallery, lightbox, toast, etc.
```

## Permissions

| Permission | Why |
|------------|-----|
| `downloads` | Save `.md` and `.zip` exports |
| `storage` | Persist settings, sessions, clips |
| `unlimitedStorage` | Allow large clip collections |
| `tabs` | Message routing between content and background |
| `activeTab` | Trigger clip on the current tab |
| `clipboardRead/Write` | Copy/paste clip content |
| `scripting` | Inject content scripts and read iframes |
| `<all_urls>` | Allow clipping on any website |

## Privacy

NoteStash does **not** send any data to external servers by default. The only outbound requests happen when you explicitly click "Clean with AI" — that sends your clip text (and optionally images) to the AI provider you configured. Your API key stays in `chrome.storage.sync` on your device.

## Build

```bash
npm run build
```

Output: `dist/content.iife.js` (~203 kB / gzip 56 kB)

## Development

```bash
npm run dev   # Vite HMR (requires page refresh for content scripts)
```

Syntax check a single module:

```bash
node --check content/modules/ui/popup.mjs
```

## Releases

Tagged `v10.x.y` — see [releases page](https://github.com/yourusername/notestash/releases).

| Tag | Highlights |
|-----|------------|
| v10.0.0 | Initial release (36 modules) |
| v10.0.1 | Security: Google API key moved to header |
| v10.0.2 | Security: CSP added to manifest |
| v10.0.3 | Security: 6 XSS sinks fixed |
| v10.0.4 | Refactor: storage area consistency |
| v10.0.5 | Cleanup: dead modules removed |
| v10.0.6 | Quality: debug logs gated, comments stripped |
| v10.0.7 | Feature: XPath text resolver |
| v10.0.8 | Cleanup: archive artifacts organized |
| v10.0.9 | Docs: audit + verification reports |

## License

ISC

## Author

Benjamin Steimer

---

## Hinweis zur KI-Unterstützung

Bei der Entwicklung dieses Projekts wurden teilweise oder vollständig KI-gestützte Tools und Technologien eingesetzt.