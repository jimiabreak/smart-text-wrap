# Smart Text Wrap

Automatically prevents orphans and balances text in Figma — like CSS `text-wrap: pretty` and `text-wrap: balance`.

## Features

- **Zero config** — auto-detects headlines vs body text
- **Auto-fix on deselect** — edit text, click away, orphans disappear
- **Fix This Page** — one-click batch fix for all text on the current page
- **Works with components** — fixes text inside component instances without breaking them
- **CSS-aligned** — mirrors `text-wrap: balance` (headlines) and `text-wrap: pretty` (body text)

## How It Works

**Pretty mode** (body text): Joins the last two words with a non-breaking space so they always wrap together — no more single-word last lines.

**Balance mode** (headlines): Splits text at the midpoint so lines are roughly equal length — no more lopsided headings.

The plugin automatically chooses the right mode:
1. Text styles with "heading", "title", "display", or "h1"–"h6" in the name → Balance
2. All other text styles → Pretty
3. No text style applied → short text gets Balance, long text gets Pretty

## Usage

1. Install from the Figma Community
2. Run from **Plugins > Smart Text Wrap**
3. Edit text normally — orphans are fixed automatically when you click away
4. Click **Fix This Page** to batch-fix all text on the current page
5. Toggle **Auto-fix on deselect** on/off as needed
