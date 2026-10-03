<div align="center">

# Smart Text Wrap

**Prevent orphans and balance text in Figma.**
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

Select any text layer, frame, component or instance, then pick an action. Smart Text Wrap finds every text layer inside your selection.

| Action | Best for | What it does |
|--------|----------|-------------|
| **Balance** | Headlines, titles | Breaks text that wraps into lines of roughly equal length |
| **Pretty** | Body text, paragraphs | Keeps the last words of each paragraph together so no word is left alone |
| **Reset text** | Anything the plugin changed | Removes the plugin's non-breaking spaces and line breaks, and keeps any edits you made since |

## Features

**Works on whole frames** — select a card, a screen or a component and every text layer inside is handled.

**Keeps your formatting** — bold words, links and colored text keep their styles.

**Keeps your edits** — rewrite text after wrapping it and the plugin works from your new copy. Reset never throws your edits away.

**Component-safe** — works inside component instances without detaching them. Only the text content changes.

**One undo per click** — press ⌘Z (Ctrl+Z) to undo the last action.

**Follows your Figma theme** — light or dark, matching Figma's own setting.

## Good to know

- Balance only changes text that actually wraps. A heading that fits on one line stays on one line.
- Balance works on text without line breaks of its own (Return or Shift+Return), up to 6 lines, like browsers do for `text-wrap: balance`.
- Auto-width text layers never wrap, so both actions skip them.
- Text set in a font that isn't installed is skipped. Install or replace the font, then run the action again.
- Balance breaks lines with a regular line break. If your text style adds paragraph spacing, that would make the text taller, so Balance leaves it alone.

## Quick Start

1. Install **Smart Text Wrap** from the [Figma Community](https://www.figma.com/community)
2. Run it from **Plugins > Smart Text Wrap**
3. Select the text, frame or component you want to fix
4. Click **Balance** for headlines or **Pretty** for body text

## Before & After

```
BEFORE (ugly orphan)          AFTER (pretty)
┌──────────────────┐          ┌──────────────────┐
│ The quick brown  │          │ The quick brown  │
│ fox jumps over   │          │ fox jumps over   │
│ the lazy         │  ──────> │ the              │
│ dog              │          │ lazy dog         │
└──────────────────┘          └──────────────────┘

BEFORE (unbalanced)           AFTER (balanced)
┌──────────────────┐          ┌──────────────────┐
│ Welcome to our   │          │ Welcome to       │
│ product          │  ──────> │ our product      │
└──────────────────┘          └──────────────────┘
```

## Under the Hood

The plugin uses two strategies that mirror CSS `text-wrap` behavior:

- **Pretty** swaps the space before the last word of each paragraph for a non-breaking space (`\u00A0`), so the last two words always wrap together. When those two words are long, it joins the last three.
- **Balance** measures how many lines the text wraps to, then swaps spaces for line breaks so every line is about the same length. If balancing would make the text box taller, the text is left as it was.

Every change swaps one character for another in place, so styles applied to parts of the text survive. No containers are resized. No components are detached. The original text is stored on the layer so **Reset text** can put it back.

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes during development
npm run watch

# Type-check
npm run typecheck

# Run tests
npm test

# Check the UI's color contrast in both themes
npm run check:contrast
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
