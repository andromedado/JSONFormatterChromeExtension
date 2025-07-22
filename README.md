# JSON Formatter Chrome Extension

When loaded page is detected to be valid JSON (Begins with either '[' or '{' and can be JSON.parse-d), this extension re-writes the page as a rich HTML JSON navigator in a similar style to MacOS Finder.

## Features

- **Finder-style Navigation**: Navigate through JSON objects and arrays
- **Search Functionality**: Find specific keys or values within the JSON structure
- **Breadcrumb Navigation**: See your current location in the JSON structure with [`jq`](https://jqlang.org/) compatible breadcrumbs
- **Customizable Snippets**: Configure how JSON objects are previewed

## Configuration

The extension includes a configuration with which you can customize how JSON objects are summarized. To access the configuration:

1. Click the extension icon in your browser toolbar
2. Click "Open Settings" to access the full configuration panel
3. Modify the JSON configuration to customize summaries
4. Click "Save Configuration" to apply your changes

### Configuration Format

The configuration uses an array of objects with `predicates` and `summarizers`:

```json
[
  {
    "predicates": [
      {"type": "keysPresent", "keys": ["apiType", "code"]},
      {"type": "valueRegex", "key": "apiType", "regex": "[Aa]ction"}
    ],
    "summarizer": {"type": "keyValue", "key": "code"}
  }
]
```

### Predicate Types

- **keysPresent**: Checks if specific keys exist in the object
- **valueRegex**: Tests if a key's value matches a regular expression
- **simpleObject**: Matches objects that only have a single key (configuration includes list of keys to ignore)

### Summarizer Types

- **keyValue**: Shows the value of a specific key
- **joinedValues**: Combines multiple key values with a separator
- **financialAmount**: Formats currency amounts with proper formatting
- **simpleObject**: Shows a key-value (configuration includes list of keys to ignore)

## Keyboard Shortcuts

- **Arrow Keys**: Navigate through JSON structure
- **Ctrl/Cmd + F**: Open search functionality
  - **Enter**: Navigate forward through results
  - **Shift + Enter**: Navigate backwards through results

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. The extension will now be available in your browser

### Inspired by [JSON Finder](https://chromewebstore.google.com/detail/json-finder/flhdcaebggmmpnnaljiajhihdfconkbj)