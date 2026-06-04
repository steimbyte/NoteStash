# NoteStash Extension - Agent Guide

This document defines the technical standards and workflows for AI agents operating in the NoteStash repository. NoteStash is a modular Chrome Extension (MV3) built with Vite and ES6 modules.

## 1. Development Workflows

### Build & Validation Commands
Always run the build after any modification to verify that the 36+ modules compile correctly into the IIFE bundle.

```bash
# Build production bundle (outputs to dist/content.iife.js)
npm run build

# Development mode with HMR (Note: Extension HMR requires page refresh)
npm run dev

# Syntax Check (Use this as a lightweight lint for single files)
node --check content/modules/path/to/module.mjs

# Build Verification
# After 'npm run build', verify that dist/content.iife.js exists and is ~150KB
```

### Running Tests
Currently, the project uses manual verification and syntax checks. To "test" a single module's syntax:
```bash
node --check content/modules/core/utils.mjs
```
*Note: If unit tests are added (e.g., Vitest), this section should be updated.*

---

## 2. Code Style & Architecture

### Module Pattern (Factory Functions)
**Mandatory:** Every module must be a factory function. This enables dependency injection and avoids global state.

```javascript
/**
 * @param {Object} deps - Injected dependencies
 * @param {Object} deps.bridge - Module loader
 * @param {Object} deps.eventBus - Typed event bus
 * @param {Object} deps.utils - Helper functions (nsLog, etc.)
 */
export const createModuleName = ({ bridge, eventBus, chromeApi, config, state, utils }) => {
  const logger = utils?.nsLog || console.log;
  const MODULE_ID = 'ModuleName';

  // Private state
  let isActive = false;

  async function init() {
    logger(`[${MODULE_ID}] Initialized`);
    isActive = true;
  }

  function destroy() {
    isActive = false;
  }

  // Public API
  return { init, destroy };
};
```

### Imports & Path Aliases
Use Vite path aliases for clean imports. Never use deep relative paths (e.g., `../../../../`).

| Alias | Path |
| :--- | :--- |
| `@` | `content/` |
| `@core` | `content/modules/core/` |
| `@ui` | `content/modules/ui/` |
| `@features` | `content/modules/features/` |
| `@session` | `content/modules/session/` |
| `@images` | `content/modules/images/` |
| `@content` | `content/modules/content/` |
| `@performance` | `content/modules/performance/` |

**Example:**
```javascript
import { createUtils } from '@core/utils.mjs';
import CONTENT_FORMAT from '@content/content-format.mjs';
```

### Naming Conventions
- **Files:** `kebab-case.mjs` for modules.
- **Factory Functions:** `createModuleName` (camelCase with 'create' prefix).
- **Internal Variables:** `camelCase`.
- **Constants:** `UPPER_SNAKE_CASE`.
- **UI Elements:** `lowerCamelCase` (e.g., `downloadBtn`).

### Types & Documentation
Use JSDoc for parameter types and return values since this is a JavaScript project.
```javascript
/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} content - Markdown content
 */

/** @returns {Promise<Session>} */
async function getCurrentSession() { ... }
```

### Error Handling
- Never crash the main thread.
- Use `try/catch` in all async operations.
- Always log errors with the module prefix.
- Use optional chaining (`?.`) for all injected dependencies.

```javascript
try {
  await chromeApi?.storage?.local?.set({ key: value });
} catch (err) {
  logger(`[${MODULE_ID}] Error saving to storage:`, err);
  toast?.show?.('Save failed', 'error');
}
```

---

## 3. Project Structure

- `manifest.json`: Extension entry point. MV3.
- `background.js`: Service worker for screenshots and global events.
- `content/`: Source for the content script.
  - `bridge.mjs`: Central registry and dependency injector.
  - `modules/`: Feature-specific modules (Core, UI, Session, etc.).
- `dist/`: Built output (DO NOT EDIT FILES HERE).
- `src/`: Legacy/Alternate source files (Prioritize `content/` for logic).

---

## 4. Critical Constraints

1. **No Direct DOM Manipulation in Core:** Logic modules should emit events; UI modules should handle the DOM.
2. **Event Bus Communication:** Prefer `eventBus.emit('event', data)` over direct module-to-module calls for cross-feature logic.
3. **Storage Consistency:** Always use `sessionManager` to touch session data. Do not use `chrome.storage.local` directly for session content.
4. **No Comments:** Do not add explanatory comments to code unless explicitly requested. The code should be self-documenting through clear naming.
5. **Vite Build:** Always run `npm run build` before considering a task complete to ensure no bundling errors were introduced.

---

## 5. Deployment Checklist
- [ ] `node --check` passed for all modified files.
- [ ] `npm run build` succeeded without warnings.
- [ ] `manifest.json` version incremented (if applicable).
- [ ] No secrets or hardcoded API keys left in code.
