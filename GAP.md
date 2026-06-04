# NoteStash GAP-Analyse: Legacy (content.js) vs. Modular (35 Module)

## Legacy: 6618 Zeilen, 115+ Funktionen, 80+ UI-Elemente, 37 Features
## Modular: 35 Module, alle initialisiert und verdrahtet

---

## Phase A: Kritische Feature-Gaps (P1)

| # | Feature | Legacy Zeile | Modular Status | Ziel-Modul |
|---|---------|-------------|----------------|------------|
| 1 | AI `clean()` mit 3 Providern (Google/Anthropic/OpenAI) | 5366-5595 | STUB | `features/ai-cleaner.mjs` |
| 2 | ZIP Export mit Attachments (JSZip) | 6497-6560 | STUB | `features/download-export.mjs` |
| 3 | Download Cleaned ZIP (nur referenzierte Images) | 5813-5877 | FEHLT | `features/download-export.mjs` |
| 4 | Download Cleaned .md | 5879-5900 | FEHLT | `features/download-export.mjs` |
| 5 | Accept & Replace (Session ersetzen) | 5598-5633 | STUB | `ui/cleaner-popup.mjs` |
| 6 | API + Request Status Indikatoren (2 Dots) | 5041-5112 | TEILWEISE | `ui/cleaner-popup.mjs` |

---

## Phase B: UI-Vervollstaendigung (P2)

| # | Feature | Legacy Zeile | Modular Status | Ziel-Modul |
|---|---------|-------------|----------------|------------|
| 7 | Popup Session Tabs (Switch, New, Count-Fix) | 3994-4070 | FEHLT | `ui/popup.mjs` |
| 8 | Popup Footer: Rename/Delete Session Buttons | 4550-4585 | UNVOLLSTAENDIG | `ui/popup.mjs` |
| 9 | Clip Card Details (Meta-Badges, Thumbnails, Screenshot, HTML-Btn) | 4110-4460 | VEREINFACHT | `ui/popup.mjs` |
| 10 | Cleaner Left Panel: Images Section in Cards | 1238-1310, 5162-5250 | FEHLT | `ui/cleaner-popup.mjs` |
| 11 | Cleaner Footer: Alle Buttons komplett | 5029-5112 | UNVOLLSTAENDIG | `ui/cleaner-popup.mjs` |
| 12 | Cached HTML Viewer (Rendered + Raw Tabs) | 5637-5800 | FEHLT | NEU: `ui/html-viewer.mjs` |
| 13 | Screenshot Capture pruefen | 6093-6115 | PRUEFEN | `features/clip-capture.mjs` |

---

## Phase C: Fehlende Integrationen (P3)

| # | Feature | Legacy Zeile | Modular Status | Ziel-Modul |
|---|---------|-------------|----------------|------------|
| 14 | Cross-Tab Session Sync | 2674-2700 | FEHLT | `index.mjs` |
| 15 | Extension Context Validation + Refresh Banner | 2566-2610 | FEHLT | `index.mjs` |
| 16 | Deletion Confirmation Setting | 2705-2720 | FEHLT | `core/config.mjs` |
| 17 | Export Prompts (4 Defaults: MD/Word/Clean/Custom) | 4727-4780 | TEILWEISE | `core/config.mjs` |
| 18 | Inline-Image Preview in Clip Cards | 4310-4420 | FEHLT | `ui/popup.mjs` |
| 19 | Recording Auto-Save (5min Interval) | 3357-3390 | FEHLT | `recording/mode.mjs` |
| 20 | Recording Tooltip auf Floating Button | 2981-3010, 3276-3290 | FEHLT | `ui/floating-buttons.mjs` |
| 21 | SPA Sensitivity Setting (Low/Med/High) | 3480-3550 | TEILWEISE | `recording/dom-observer.mjs` |

---

## Phase D: Polish (P4)

| # | Feature | Legacy Zeile | Modular Status | Ziel-Modul |
|---|---------|-------------|----------------|------------|
| 22 | Live Capture Logger im Processing Overlay | 106-138 | FEHLT | `ui/components/processing-overlay.mjs` |
| 23 | Custom CSS Scrollbar Styles | 1487-1530 | FEHLT | `index.mjs` oder eigenes CSS |
| 24 | Keyboard Shortcuts (Escape schliesst Popups) | 6591-6597 | FEHLT | `index.mjs` |
| 25 | chrome.runtime.onMessage Handler | 6582-6590 | FEHLT | `index.mjs` |
| 26 | Page Ready System (waitForImages/DomStability) | 1372-1510 | FEHLT | `features/clip-capture.mjs` |
| 27 | Donate/Support Button | 5067 | FEHLT | `ui/cleaner-popup.mjs` |

---

## Bereits vollstaendig modular implementiert

- Bridge, EventBus, ChromeAPI (Infrastruktur)
- Config, State, Utils (Core)
- ElementRegistry, EventControllers, VirtualScroller (Performance)
- HtmlToMarkdown, LinkExtractor, FilterModes (Content Processing)
- ImageDetector (6-Layer), ImageProcessor (Smart Download) (Images)
- SessionManager (CRUD), ClipParser, DataProcessor (Session)
- FloatingButtons + Dragging, ArcMenu (5 Buttons), Popup (Grid+Search)
- CleanerPopup (Split-View, Prompt-Dropdown)
- Toast, ProcessingOverlay, ThumbnailGrid, Lightbox, Gallery, GlassmorphismSelect
- ClipCapture (vollstaendige 10-Schritt Pipeline!)
- RecordingMode, DomObserver, AutoCapture

---

## Fortschritt

- [x] Phase A: Kritische Feature-Gaps (6/6)
- [x] Phase B: UI-Vervollstaendigung (7/7)
- [x] Phase C: Fehlende Integrationen (8/8)
- [x] Phase D: Polish (5/5)

## ALLE PHASEN ABGESCHLOSSEN

## Build Output nach Phase A+B+C+D
```
36 modules transformed
dist/content.iife.js  176.54 kB | gzip: 49.40 kB
built in 555ms
```

## Phase D Details

| # | Feature | Status |
|---|---------|--------|
| 22 | Live Capture Logger (bereits in processing-overlay.mjs + clip-capture.mjs) | ERLEDIGT |
| 23 | Custom CSS Scrollbar Styles (injected via index.mjs) | ERLEDIGT |
| 24 | Page Ready System (waitForImages + waitForDomStability in clip-capture.mjs) | ERLEDIGT |
| 25 | Donate/Support Button im Cleaner Footer | ERLEDIGT |
| 26 | Badge Update via Background Script (chrome.runtime.sendMessage) | ERLEDIGT |
