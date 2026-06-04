# NoteStash - Bilder-Download Feature

## Neue Funktionen

### Automatischer Bilder-Download
- **Bildererkennung**: Erkennt automatisch alle Bilder auf einer Webseite beim Clipping
- **Smart Filtering**: Filtert kleine Bilder (<50px) und Icons heraus
- **Canvas-Extraktion**: Kopiert Bilder direkt aus dem Viewport (umgeht CORS-Probleme)
- **Unicode-freie Dateinamen**: Generiert sichere ASCII-Dateinamen im Format `img-{index}-{hash}.{ext}`

### Lokale Bildreferenzen
- Bilder werden als lokale Referenzen gespeichert: `![alt](images/{clipId}-{filename})`
- Keine externen URLs mehr im Markdown
- Perfekt für Obsidian-Import

### ZIP-Export mit Bildern
- Alle Bilder werden in den `images/`-Ordner im ZIP gespeichert
- Markdown-Datei referenziert Bilder korrekt mit relativen Pfaden
- Screenshots und heruntergeladene Bilder werden zusammen exportiert

## Technische Details

### Neue Funktionen in content.js
1. `extractImages(element)` - Extrahiert Bilder mit DOM-Element-Referenzen
2. `generateImageFilename(url, index)` - Erzeugt sichere Dateinamen
3. `downloadImageAsBase64(imgElement)` - Kopiert Bilder via Canvas (CORS-frei)
4. `htmlToMarkdown(element, options)` - Erweitert um Bilder-Tracking

### Speicherstruktur
```javascript
session: {
  content: "# Markdown mit lokalen Bildreferenzen...",
  screenshots: { "screenshot-123": "data:image/png;base64,..." },
  images: {
    "https://example.com/img.jpg": {
      filename: "abc123-img-001-a1b2c3.png",
      dataUrl: "data:image/png;base64,...",
      alt: "Bildbeschreibung"
    }
  }
}
```

### Clip-Format
Jeder Clip enthält jetzt eine Clip-ID:
```markdown
<!-- clip-id: abc123 -->
## Seitentitel

**URL:** [https://example.com](https://example.com)
**Captured:** 01.01.2024, 12:00:00

![Bild](images/abc123-img-001-a1b2c3.png)

Inhalt...
```

## Verwendung in Obsidian

1. ZIP-Datei herunterladen
2. In Obsidian-Vault entpacken
3. Markdown-Datei öffnen - Bilder werden automatisch angezeigt

## Hinweise

- Bilder werden als PNG konvertiert (beste Kompatibilität)
- Bei CORS-geschützten Bildern wird ein Reload mit crossOrigin versucht
- Falls Bilder nicht extrahiert werden können, bleibt die Original-URL erhalten
- Beim Löschen eines Clips werden auch die zugehörigen Bilder entfernt
