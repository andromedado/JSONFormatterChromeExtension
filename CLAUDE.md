# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

No build step. Load the extension directly in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. "Load unpacked" → select this directory

To reload after changes: click the refresh icon on the extension card in `chrome://extensions/`.

There are no tests, no package.json, and no linting configuration.

## Architecture

This is a Manifest V3 Chrome extension with three JS files:

**`background.js`** — Service worker. Owns all default configuration data:
- `DEFAULT_SPECIFIC_CONFIGS` / `DEFAULT_CATCHALL_CONFIGS` → merged into `DEFAULT_SUMMARIZE_CONFIGS`: the built-in summarizer rules, evaluated in order (first match wins)
- `BOOLEAN_CONFIGS`: feature flags (alphabetizeKeys, hoistIdToTop, thumbnailImages, etc.)
- `COLOR_CONFIGS`: theme color customization
- Handles two Chrome messages: `getAllOptions` (returns raw config definitions for the options UI) and `getConfigs` (merges storage overrides with defaults, fetches style.css, injects color config as CSS, returns the full resolved config to content scripts)

**`content.js`** — Runs on every page. Detects JSON (body starting with `{` or `[`), rewrites the page as a Finder-style column navigator. Key classes:
- `JSONPredicate`: tests whether an object matches criteria (types: `keysPresent`, `anyKeyPresent`, `valueRegex`, `simpleObject`)
- `JSONSummarizer`: generates a summary string for an object (types: `static`, `keyValue`, `joinedValues`, `financialAmount`, `simpleObject`)
- `Application`: the main UI class — manages columns, navigation, breadcrumbs, search, and summarizer registration
- `Finder`: the Ctrl/Cmd+F search overlay

Config flow: `background.js` → `chrome.storage.sync` → `content.js` `loadConfigs()` on page load → predicates/summarizers instantiated from JSON config and registered on the `Application` instance.

**`options.js`** — Settings page logic (options.html). Lets users enable/disable the default config, write custom summarizer configs (JSON array), and toggle boolean/color settings. Custom config is prepended before the default config when both are enabled.

## Summarizer Configuration Format

Each entry in `DEFAULT_SUMMARIZE_CONFIGS` (and user custom configs) has:
```json
{
  "predicates": [ { "type": "...", ...options } ],
  "summarizer": { "type": "...", ...options }
}
```

All predicates must match for the summarizer to apply. The first matching config wins. Specific configs (`DEFAULT_SPECIFIC_CONFIGS`) are listed before catchall configs to ensure specificity ordering is preserved.
