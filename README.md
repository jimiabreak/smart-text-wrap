<div align="center">

# Smart Text Wrap

**Automatically prevent orphans and balance text in Figma.**
Like CSS `text-wrap: pretty` and `text-wrap: balance` — but for your design tools.

[![Install on Figma](https://img.shields.io/badge/Install_on-Figma-black?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com/community)
[![License: MIT](https://img.shields.io/badge/License-MIT-7B61FF?style=for-the-badge)](LICENSE)

</div>

---

## The Problem

You're designing with a component-based design system. The text container has a fixed width. And there it is — a single lonely word dangling on the last line.

You can't resize the component. You can't break the instance. You just have to... live with it?

**Not anymore.**

## How It Works

Smart Text Wrap runs silently in the background. Edit text, click away, and orphans disappear.

| Mode | Best for | What it does |
|------|----------|-------------|
| **Pretty** | Body text, paragraphs | Joins the last two words so they always wrap together |
| **Balance** | Headlines, titles | Splits text into roughly equal line lengths |

The plugin **auto-detects** the right mode — no setup required:

- Text styles named "Heading", "Title", "Display", "H1"–"H6" → **Balance**
- All other text styles → **Pretty**
- No text style? Short text → Balance, long text → Pretty

## Features

**Zero config** — just works, no menus or settings to fuss with.

**Auto-fix on deselect** — select text, edit it, click away. Done.

**Fix This Page** — one button to clean up every text layer on the current page.

**Component-safe** — works inside component instances without detaching or breaking anything. Only modifies the text content itself.

**Design system friendly** — built specifically for the workflow where you can't adjust component widths to fix orphans.

## Quick Start

1. Install **Smart Text Wrap** from the [Figma Community](https://www.figma.com/community)
2. Run it from **Plugins > Smart Text Wrap**
3. Design as usual — orphans are fixed automatically when you click away
4. Hit **Fix This Page** to batch-fix an entire screen

## Before & After

```
BEFORE (ugly orphan)          AFTER (pretty)
┌──────────────────┐          ┌──────────────────┐
│ The quick brown  │          │ The quick brown   │
│ fox jumps over   │          │ fox jumps over    │
│ the              │  ──────> │ the lazy dog      │
│ lazy dog         │          │                   │
└──────────────────┘          └──────────────────┘

BEFORE (unbalanced)           AFTER (balanced)
┌──────────────────┐          ┌──────────────────┐
│ Welcome to our   │          │ Welcome to       │
│ product          │  ──────> │ our product      │
└──────────────────┘          └──────────────────┘
```

## Under the Hood

The plugin uses two strategies that mirror CSS `text-wrap` behavior:

- **Pretty mode** inserts a non-breaking space (`\u00A0`) between the last two words, preventing them from being split across lines
- **Balance mode** inserts a line break at the text midpoint to equalize line lengths

No containers are resized. No components are detached. Just the text string — the lightest possible touch.

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes during development
npm run watch

# Run tests
npm test
```

To load in Figma:
1. Open Figma Desktop
2. **Plugins > Development > Import plugin from manifest...**
3. Select `manifest.json` from this repo

## License

MIT

---

<div align="center">

Built by [Shirakaba Studio](https://github.com/jimiabreak)

</div>
