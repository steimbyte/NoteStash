# NoteStash Development Changelog

## [2026-02-09] - AI Cleaner Enhancements & Storage Sync Fixes

### Added
- **Interactive API Setup in Popup**: If no API key is configured, the Note Cleaner popup now shows an inline setup screen in the right panel, allowing users to paste and save their key directly without leaving the page.
- **Visual Feedback for AI Processing**: 
    - "Clean with AI" button now changes state to `⏳ sent and waiting for response` upon click.
    - Added a themed glassmorphism loading spinner inside the "Cleaned Note" box during AI generation.
- **Detailed API Error Display**: HTTP errors from AI providers (like 401 Unauthorized, 429 Rate Limit, or 500 Server Error) are now displayed directly in the cleaned note box with full technical details for easier debugging.
- **Test Free Models**: Added a "Test Free Models" button that specifically attempts to call the `openrouter/free` model to verify key functionality even without paid credits.
- **Settings Alignment**: Ensured all API calls in both UI and backend strictly adhere to the provider, URL, and model configured in the settings page.
- **Check API Integration**: Added a "Check API" button to both the Options page and the Cleaner Popup to verify connectivity with AI providers (OpenRouter, Google, Anthropic).
- **PayPal Link Update**: Updated all donation/support links to point to `https://www.paypal.me/bvsteimer`.
- **UI Clean-up**: Removed redundant format selector from the bottom left of the cleaner popup in favor of the glassmorphism header selector.

- **Error Recovery UI**: Added a "Try Again" button and detailed error messaging (including 401 Authentication failure detection) in the cleaner popup.



### Fixed
- **Storage Area Mismatch**: Unified settings storage to `chrome.storage.sync`. Previously, some modules looked in `local` while settings saved to `sync`, causing API keys and custom prompts to be "invisible" to the content script.
- **Config Module Refactoring**: Removed duplicate `saveSettings` and `set` functions in `config.mjs` that were causing build inconsistencies.
- **Module Initialization**: Fixed issues where AI settings weren't being correctly merged into the runtime configuration.
- **Syntax Errors**: Cleaned up dangling braces and improperly closed factory functions in `ai-cleaner.mjs` and `config.mjs` that were causing Vite build failures.

### Technical Improvements
- **ChromeAPI Wrapper Update**: Enhanced the storage abstraction to support explicit area selection (`sync` vs `local`).
- **Event Bus Integration**: Improved `cleaner:clean-requested` event to support completion callbacks for UI state resetting.
- **Build Process**: Verified clean build via Vite for all 36 modules.

## [2026-02-09] - Fix: Settings Migration & 401 Auth Recovery

### Fixed
- **Settings Migration Logic**: Added a fallback in `config.mjs` that checks `local` storage if `sync` is empty. This migrates existing user API keys and settings from the old storage system automatically.
- **OpenRouter 401 Error**: Added missing headers (`HTTP-Referer`, `X-Title`) to AI requests, which are often required by OpenRouter to prevent authentication rejections.
- **Storage Area Unification**: Ensured all settings-related modules consistently use the same storage area, preventing the "key not found" issue despite being set in the options page.

### Added
- **API Key Setup Polish**: Improved the inline setup interface with better validation, loading states, and success indicators.

