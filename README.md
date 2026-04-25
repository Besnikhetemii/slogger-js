# slogger-js

> ☕ Logging in JavaScript is easy but with `slogger-js`, it's like logging with espresso shots.  
> No more `console.log()` spam. Just `slogger.log()`, `slogger.error()`, and chill.

**slogger-js** is a lightweight, vanilla JavaScript logging plugin that makes console logging cleaner and easier. It provides short method names (`slogger.log`, `slogger.error`, `slogger.info`), automatic message truncation, log level control, pretty printing for objects/arrays, custom tags, grouping support, and color-coded output all optimized for dark mode themes.

---

## 🌟 Features

- ✅ Short logging methods: `log`, `error`, `info`
- ✂️ Auto-truncates long messages (default: 100 characters) with toggle on/off
- 🎨 Color-coded console output (dark mode–friendly)
- 🕒 Optional timestamps
- 🔇 Enable/disable logging at runtime
- 🎚 Log level filtering: `none`, `error`, `info`, `log`, `all`
- 🏷️ Custom tags/prefixes support (e.g. `[LOG] [DB] message`)
- 🔍 Pretty printing for objects and arrays with `[TYPE]` label
- 🗂 Grouping support (`group`, `groupEnd`)
- 🧩 No dependencies works in any browser with vanilla JS
- 🖥️ Built-in UI panel for logs with:
  - Toggleable log panel with dark mode styling
  - 🔢 Live log counter
  - 🔍 Real-time search
  - 🎚 Filter logs by level (All / Log / Info / Error)
  - 🎨 Color-coded log levels (left border indicators)
  - 🧾 Expand/collapse detailed JSON views
  - 📦 Smart previews for objects and arrays
  - 🗂 Collapsible grouped logs with indentation hierarchy
  - 📋 Click-to-copy log entries
  - 🕒 Hover-revealed timestamps
  - 📉 Configurable max log limit (performance safe)
  - 🔄 Auto-scroll support
  - 🧼 Clear logs
  - 📤 Export logs to a text file



---

## 🚀 Getting Started

### 1. Install `slogger-js`

Clone the slogger-js into project folder directly by git or just use npm i slogger-js.


### 2. API Reference

| Method                        | Description                                              |
|-------------------------------|----------------------------------------------------------|
| `slogger.log(...args)`           | Logs a general message                                   |
| `slogger.error(...args)`         | Logs an error message                                    |
| `slogger.info(...args)`          | Logs an informational message                            |
| `slogger.setLevel(level)`        | Sets log level (`none`, `error`, `info`, `log`, `all`)   |
| `slogger.setDefaultLevel()`      | Resets log level to show all                             |
| `slogger.enable()`               | Enables logging                                          |
| `slogger.disable()`              | Disables logging                                         |
| `slogger.setTimestamps(bool)`    | Enables/disables timestamps in console logs              |
| `slogger.setAutoTruncatingOn()`  | Enables auto truncation of long messages                 |
| `slogger.setAutoTruncatingOff()` | Disables auto truncation                                 |
| `slogger.group(label)`           | Starts a grouped log section                             |
| `slogger.groupEnd()`             | Ends the current console group                           |
| `slogger.enableUI()`             | Enables the floating UI log panel                        |
| `slogger.setMaxUILogs(number)`   | Sets maximum number of logs kept in the UI               |
| `slogger.setUIAutoScroll(bool)`  | Enables/disables UI auto-scroll                          |
| `slogger.setUITimestamps(bool)`  | Shows/hides timestamps in the UI panel                   |
| `slogger.setStructured(bool)`    | Enables/disables structured logging output               |
| `slogger.clear()`                | Clears console and UI logs                               |
| `slogger.reset()`                | Resets logger settings to defaults                       |

### 3. Examples

```html
<script src="slogger.js"></script>
<script>
  // Enable UI panel
  slogger.enableUI();

  // Basic logs
  slogger.log('This is a regular log message.');
  slogger.error('Oops! Something went wrong.');
  slogger.info('FYI: Everything is working fine.');

  // Long message truncated (default 100 chars)
  slogger.log('LONG', 'This is a really long message that should be truncated after 100 characters to keep things neat in the console...');

  // Disable auto truncation
  slogger.setAutoTruncatingOff();
  slogger.log('LONG', 'This long message will NOT be truncated even if it is very long and verbose...');

  // Pretty print object with custom tag
  slogger.info('USER', { id: 123, name: 'Alice', roles: ['admin', 'editor'] });

  // Pretty print array
  slogger.log('DATA', [1, 2, 3, 4, 5]);

  // Enable timestamps (console)
  slogger.setTimestamps(true);
  slogger.log('Now with a timestamp!');

  // UI configuration
  slogger.setMaxUILogs(300);
  slogger.setUIAutoScroll(true);
  slogger.setUITimestamps(true);

  // Log level control
  slogger.setLevel('error'); // Only errors will show
  slogger.log('This log will NOT show');
  slogger.error('This error will show');

  slogger.setDefaultLevel(); // Reset to show all logs

  // Enable/disable logging
  slogger.disable();
  slogger.log('This will NOT show');
  slogger.enable();
  slogger.log('Logging enabled again');

  // Grouping logs (collapsible in UI)
  slogger.group('User Actions');
  slogger.log('Clicked button');
  slogger.error('Button action failed');
  slogger.groupEnd();
</script>