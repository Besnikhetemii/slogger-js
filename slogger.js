(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.slogger = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const MAX_LENGTH = 100;
  let maxUILogs = 200;
  let uiAutoScroll = true;
  let showUITimestamps = true;
  let uiGroupStack = [];
  const levelOrder = {
    none: 0,
    error: 1,
    info: 2,
    log: 3,
    all: 4,
  };
  let uiGroupDepth = 0;
  let currentLevel = 'all';
  let enabled = true;
  let useTimestamps = false;
  let autoTruncate = true;
  const timeLabels = new Map();
  let structured = false;
  let uiEnabled = false;
  let uiContainer = null;
  let uiLogList = null;
  let currentFilter = 'all';
  let currentSearch = '';

  function truncate(message, maxLength = MAX_LENGTH) {
    if (typeof message !== 'string') {
      try {
        message = JSON.stringify(message, null, 2);
      } catch {
        message = String(message);
      }
    }
    return autoTruncate && message.length > maxLength ? message.slice(0, maxLength) + '…' : message;
  }

  function getType(val) {
    if (Array.isArray(val)) return 'ARRAY';
    if (val === null) return 'NULL';
    return typeof val === 'object' ? 'OBJECT' : typeof val;
  }

  function formatMessage(level, args) {
    const tagColor = {
      log: '#61dafb',
      error: '#ff6b6b',
      info: '#4ecdc4',
      time: '#f39c12',
    };

    let tag = '';
    if (typeof args[0] === 'string' && !args[0].startsWith('[')) {
      tag = args.shift().toUpperCase();
    }

    const timestamp = useTimestamps ? `[${new Date().toLocaleTimeString()}] ` : '';
    const prefix = `[${level.toUpperCase()}]${tag ? ' [' + tag + ']' : ''}`;

    const messages = args.map(arg => {
      const type = `[${getType(arg).toUpperCase()}]`;
      const content = typeof arg === 'object' ? JSON.stringify(arg) : truncate(arg);

      return `${type} ${content}`;
    });

    const style1 = `color: ${tagColor[level] || '#aaa'}; font-weight: bold;`;
    const style2 = 'color: #ddd;';

    return [`%c${timestamp}${prefix}%c ${messages.join(' ')}`, style1, style2];
  }

  function shouldLog(level) {
    return enabled && levelOrder[level] <= levelOrder[currentLevel];
  }

  function log(...args) {
    if (!shouldLog('log')) return;

    if (structured) {
      let tag = '';
      if (typeof args[0] === 'string' && !args[0].startsWith('[')) {
        tag = args.shift().toUpperCase();
      }
      const logObj = buildStructuredLog('log', args, tag);
      console.log('%c[STRUCTURED]', 'color: #6a0dad; font-weight: bold;', logObj);
    } else {
      const formatted = formatMessage('log', [...args]);
      console.log(...formatted);
    }

    appendToUI('log', args);
  }

  function buildStructuredLog(level, args, tag = '') {
    const timestamp = new Date().toISOString();
    const messageParts = args.map(arg => {
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    });
    return {
      level,
      timestamp,
      tag,
      message: messageParts.join(' '),
    };
  }

  function enableUI() {
    if (uiEnabled) return;
    uiEnabled = true;

    uiContainer = document.createElement('div');
    uiContainer.id = 'slog-ui';
    uiContainer.innerHTML = `
      <div id="slog-toggle">Logs (<span id="slog-count">0</span>)</div>
      <div id="slog-panel">
        <div id="slog-header">
          <span>sLog Console</span>
          <div id="slog-controls">
            <button id="slog-clear">Clear</button>
            <button id="slog-export">Export</button>
          </div>
        </div>
        <div id="slog-toolbar">
          <input id="slog-search" placeholder="Search logs..." />
          <button data-filter="all">All</button>
          <button data-filter="log">Log</button>
          <button data-filter="info">Info</button>
          <button data-filter="error">Error</button>
        </div>
        <div id="slog-list"></div>
      </div>
    `;

    document.body.appendChild(uiContainer);

    const style = document.createElement('style');
    style.textContent = `
      #slog-ui {
        position: fixed;
        bottom: 20px;
        right: 20px;
        font-family: monospace;
        z-index: 9999;
      }
      #slog-ui #slog-toggle {
        background: #444;
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
      #slog-ui #slog-panel {
        display: none;
        flex-direction: column;
        width: 350px;
        max-height: 400px;
        margin-top: 10px;
        background: #111;
        color: #eee;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 0 10px rgba(0,0,0,0.4);
      }
      #slog-ui #slog-header {
        display: flex;
        justify-content: space-between;
        padding: 6px 10px;
        background: #222;
        font-weight: bold;
        border-bottom: 1px solid #444;
      }
      #slog-ui #slog-list {
        overflow-y: auto;
        max-height: 360px;
        padding: 8px;
        font-size: 12px;
      }
      #slog-ui #slog-list .slog-entry {
        border-bottom: 1px solid #333;
        padding: 4px 0;
      }
      #slog-ui #slog-list .error { color: #ff6b6b; }
      #slog-ui #slog-list .info { color: #4ecdc4; }
      #slog-ui #slog-list .log { color: #61dafb; }
      #slog-ui .slog-entry {
        position: relative;
        padding: 8px 40px 8px 12px; 
        margin-bottom: 6px;
        border-radius: 6px;
        background-color: #1a1a1a;
        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
        font-family: monospace;
        font-size: 13px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
      }

      #slog-ui .slog-entry .toggle-details {
        top: 8px;
        right: 12px;
        cursor: pointer;
        font-size: 12px;
        color: #61dafb;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 4px;
          flex-shrink: 0;
        user-select: none;
      }

      #slog-ui .slog-entry .toggle-details:hover {
        color: #4ecdc4;
      }

      #slog-ui .slog-entry .toggle-details .arrow {
        display: inline-block;
        transition: transform 0.25s ease;
        font-weight: bold;
      }

      #slog-ui .slog-entry.expanded .toggle-details .arrow {
        transform: rotate(90deg);
      }

      #slog-ui .slog-entry .details-content {
        margin-top: 8px;
        padding: 8px;
        background-color: #222;
        border-radius: 4px;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: monospace;
        box-shadow: inset 0 0 6px rgba(0,0,0,0.8);
      }

      #slog-ui .slog-main-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      #slog-ui .preview-text {
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #slog-ui #slog-controls {
        display: flex;
        gap: 8px;
      }

      #slog-ui #slog-controls button {
        background: #444;
        color: white;
        border: none;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: background-color 0.2s ease;
      }

      #slog-ui #slog-controls button:hover {
        background: #61dafb;
        color: #111;
      }

        #slog-ui .slog-entry::before {
            content: '';
            position: absolute;
            top: 0;
            left: -7px;
            width: 3px;
            height: 100%;
            border-radius: 2px;
        }

        #slog-ui .slog-entry.log::before {
            background: #61dafb;
        }

        #slog-ui .slog-entry.info::before {
            background: #4ecdc4;
        }

        #slog-ui .slog-entry.error::before {
            background: #ff6b6b;
        }

        #slog-ui .slog-entry {
            padding-left: 10px;
            position:relative;
        }
        #slog-ui .slog-entry {
          cursor: pointer;
        }

        #slog-ui .slog-entry.error::before {
            background: #ff6b6b;
            box-shadow: 0 0 6px rgba(255, 107, 107, 0.6);
        }

        #slog-ui #slog-toolbar {
            display: flex;
            gap: 6px;
            padding: 8px;
            border-bottom: 1px solid #333;
            background: #181818;
        }

        #slog-ui #slog-search {
            flex: 1;
            min-width: 0;
            background: #111;
            color: #eee;
            border: 1px solid #333;
            border-radius: 4px;
            padding: 4px 6px;
            font-family: monospace;
            font-size: 12px;
        }

        #slog-ui #slog-toolbar button {
          background: #2a2a2a;
          color: #aaa;
          border: 0;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s ease;
        }

        #slog-ui #slog-toolbar button:hover {
            background: #61dafb;
            color: #111;
        }


        #slog-ui #slog-toolbar button[data-filter="log"]:hover {
          background: rgba(97, 218, 251, 0.15);
          color: #61dafb;
        }

        #slog-ui #slog-toolbar button[data-filter="info"]:hover {
          background: rgba(78, 205, 196, 0.15);
          color: #4ecdc4;
        }

        #slog-ui #slog-toolbar button[data-filter="error"]:hover {
          background: rgba(255, 107, 107, 0.15);
          color: #ff6b6b;
        }

        #slog-ui #slog-toolbar button[data-filter="all"]:hover {
          background: #444;
          color: #fff;
        }

        #slog-ui #slog-toolbar button.active[data-filter="log"] {
          background: #61dafb;
          color: #111;
        }

        #slog-ui #slog-toolbar button.active[data-filter="info"] {
          background: #4ecdc4;
          color: #111;
        }

        #slog-ui #slog-toolbar button.active[data-filter="error"] {
          background: #ff6b6b;
          color: #fff;
        }

        #slog-ui #slog-toolbar button.active[data-filter="all"] {
          background: #666;
          color: #fff;
        }
          #slog-ui #slog-toolbar button.active {
          box-shadow: 0 0 6px rgba(255,255,255,0.1);
        }
       #slog-ui .slog-time {
          font-size: 10px;
          color: #aaa;
          text-align: right;

          max-height: 0;
          overflow: hidden;
          opacity: 0;

          transition: max-height 0.2s ease, opacity 0.15s ease;
        }

        #slog-ui .slog-entry:hover .slog-time {
          max-height: 20px; /* enough to fit one line */
          opacity: 0.6;
        }
        #slog-ui .slog-entry.group {
          color: #bbb;
          font-weight: 600;
          background: rgba(255,255,255,0.04);
          border: 1px dashed rgba(255,255,255,0.08);
        }
        #slog-ui .slog-entry.group::before {
          background: #888;
          box-shadow: none;
        }
        #slog-ui .slog-entry.group {
          cursor: pointer;
        }

        #slog-ui .slog-entry.group::after {
          content: '▼ Hide Details';
          float: right;
          opacity: 0.5;
        }

        #slog-ui .slog-entry.group.collapsed::after {
          content: '▶ Show Details';
        }
    `;
    document.head.appendChild(style);

    uiLogList = uiContainer.querySelector('#slog-list');
    uiLogList.onscroll = () => {
      uiAutoScroll =
        uiLogList.scrollTop + uiLogList.clientHeight >= uiLogList.scrollHeight - 10;
    };
    uiContainer.querySelector('[data-filter="all"]').classList.add('active');
    uiContainer.querySelectorAll('#slog-toolbar button').forEach(button => {
      button.onclick = () => {
        currentFilter = button.dataset.filter;

        uiContainer.querySelectorAll('#slog-toolbar button')
          .forEach(b => b.classList.remove('active'));

        button.classList.add('active');

        applyUIFilters();
      };
    });

    uiContainer.querySelector('#slog-search').oninput = event => {
      currentSearch = event.target.value.toLowerCase().trim();
      applyUIFilters();
    };
    uiContainer.querySelector('#slog-toggle').onclick = () => {
      const panel = uiContainer.querySelector('#slog-panel');
      panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    };
    uiContainer.querySelector('#slog-clear').onclick = () => {
      uiLogList.innerHTML = '';
      updateSlogCount();
    };

    uiContainer.querySelector('#slog-export').onclick = () => {
      if (!uiLogList) return;

      let logsText = '';

      uiLogList.querySelectorAll('.slog-entry').forEach(entry => {
        const details = entry.querySelector('.details-content');
        if (details) {
          // Export full details content (prettified JSON or full text)
          logsText += details.textContent + '\n\n';
        } else {
          // No details-content, export the whole entry text
          logsText += entry.textContent + '\n\n';
        }
      });

      const blob = new Blob([logsText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slog-export-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };

  }


  function error(...args) {
    if (!shouldLog('error')) return;

    const formatted = formatMessage('error', [...args]);
    console.error(...formatted);

    appendToUI('error', args);
  }

  function info(...args) {
    if (!shouldLog('info')) return;

    const formatted = formatMessage('info', [...args]);
    console.info(...formatted);

    appendToUI('info', args);
  }

  function setLevel(level) {
    if (levelOrder[level] !== undefined) currentLevel = level;
  }

  function setDefaultLevel() {
    currentLevel = 'all';
  }

  function disable() {
    enabled = false;
  }

  function enable() {
    enabled = true;
  }

  function timeStart(id, label) {
    const name = (label || id).toUpperCase();
    timeLabels.set(id, new Date());
    if (shouldLog('log')) {
      console.log(...formatMessage('time', [name, `Started at: ${new Date().toLocaleTimeString()}`]));
    }
  }

  function timeEnd(id, label) {
    const name = (label || id).toUpperCase();
    const start = timeLabels.get(id);
    const end = new Date();
    if (!start) {
      if (shouldLog('error')) {
        console.error(...formatMessage('error', [name, 'No start time found for this label. Did you call timeStart()?']));
      }
      return;
    }
    const diff = ((end - start) / 1000).toFixed(2);
    if (shouldLog('log')) {
      console.log(...formatMessage('time', [name, `Ended at: ${end.toLocaleTimeString()} (+${diff}s)`]));
    }
    timeLabels.delete(id);
  }

  function clear() {
    try {
      console.clear();
      console.info('%csLog UI cleared. Note: If you see "console.clear() was prevented due to Preserve log" warning, clearing console was blocked by browser settings.', 'color: #4ecdc4; font-weight: bold;');
    } catch (e) {
      console.error('sLog clear failed:', e);
    }
    if (uiEnabled && uiLogList) {
      uiLogList.innerHTML = '';
    }
  }

  function reset() {
    currentLevel = 'all';
    enabled = true;
    useTimestamps = false;
    autoTruncate = true;
    structured = false;
  }

  function appendToUI(level, args, options = {}) {
    if (!uiEnabled || !uiLogList) return;

    const message = args
      .map(a => (a !== null && typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
      .join(' ');

    if (!message.trim()) return;

    const entry = document.createElement('div');
    entry.className = 'slog-entry ' + level;
    entry.dataset.level = level;
    entry.dataset.search = message.toLowerCase();

    if (options?.isGroup) {
      entry.classList.add('group');
      entry.dataset.groupId = options.groupId;
    }

    if (!options?.isGroup && uiGroupStack.length) {
      entry.dataset.group = uiGroupStack[uiGroupStack.length - 1];
    }

    entry.style.paddingLeft = `${10 + uiGroupDepth * 12}px`;

    const hasObject = args.some(a => a !== null && typeof a === 'object');

    if (hasObject) {
      const mainRow = document.createElement('div');
      mainRow.className = 'slog-main-row';

      const previewText = document.createElement('div');
      previewText.className = 'preview-text';
      previewText.textContent = createPreview(args, message);

      const toggleBtn = document.createElement('div');
      toggleBtn.className = 'toggle-details';
      toggleBtn.innerHTML = `<span class="arrow">▶</span> Show Details`;

      const details = document.createElement('pre');
      details.className = 'details-content';
      details.textContent = message;
      details.style.display = 'none';

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        const isExpanded = entry.classList.toggle('expanded');
        details.style.display = isExpanded ? 'block' : 'none';

        toggleBtn.querySelector('.arrow').textContent = isExpanded ? '▼' : '▶';
        toggleBtn.childNodes[1].nodeValue = isExpanded ? ' Hide Details' : ' Show Details';
      });

      mainRow.appendChild(previewText);
      mainRow.appendChild(toggleBtn);

      entry.appendChild(mainRow);
      entry.appendChild(details);
    } else {
      entry.textContent = message;
    }

    if (options?.isGroup) {
      entry.addEventListener('click', (e) => {
        if (e.target.closest('.toggle-details')) return;
        e.stopPropagation();

        const groupId = entry.dataset.groupId;
        const collapsed = entry.classList.toggle('collapsed');

        uiLogList.querySelectorAll(`[data-group="${groupId}"]`).forEach(child => {
          child.style.display = collapsed ? 'none' : 'block';
        });
      });
    } else {
      entry.addEventListener('click', () => {
        entry.style.opacity = '0.6';

        if (navigator.clipboard) {
          navigator.clipboard.writeText(message).catch(() => { });
        }

        setTimeout(() => {
          entry.style.opacity = '1';
        }, 150);
      });
    }

    if (showUITimestamps) {
      const time = document.createElement('div');
      time.className = 'slog-time';
      time.textContent = new Date().toLocaleTimeString();
      entry.prepend(time);
    }

    uiLogList.appendChild(entry);

    while (uiLogList.children.length > maxUILogs) {
      uiLogList.removeChild(uiLogList.firstChild);
    }

    updateSlogCount();

    if (currentFilter !== 'all' || currentSearch) {
      applyUIFilters();
    }

    if (uiAutoScroll) {
      uiLogList.scrollTop = uiLogList.scrollHeight;
    }
  }
  function updateSlogCount() {
    const countEl = document.getElementById('slog-count');
    if (!countEl || !uiLogList) return;

    countEl.textContent = uiLogList.children.length;
  }

  function applyUIFilters() {
    if (!uiLogList) return;

    const collapsedGroups = {};

    uiLogList.querySelectorAll('.slog-entry.group.collapsed').forEach(group => {
      collapsedGroups[group.dataset.groupId] = true;
    });

    uiLogList.querySelectorAll('.slog-entry').forEach(entry => {
      const matchesLevel =
        currentFilter === 'all' || entry.dataset.level === currentFilter;

      const matchesSearch =
        !currentSearch || entry.dataset.search.includes(currentSearch);

      const isHiddenByGroup =
        entry.dataset.group && collapsedGroups[entry.dataset.group];

      entry.style.display =
        matchesLevel && matchesSearch && !isHiddenByGroup ? 'block' : 'none';
    });
  }

  function setTimestamps(value) {
    useTimestamps = !!value;
  }

  function setAutoTruncatingOn() {
    autoTruncate = true;
  }

  function setAutoTruncatingOff() {
    autoTruncate = false;
  }

  function group(label) {
    console.groupCollapsed(`[GROUP] ${label}`);

    const groupId = 'group-' + Date.now() + Math.random();
    uiGroupStack.push(groupId);
    uiGroupDepth++;

    appendToUI('group', [`[GROUP] ${label}`], {
      isGroup: true,
      groupId
    });
  }

  function groupEnd() {
    console.groupEnd();
    uiGroupStack.pop();
    uiGroupDepth = Math.max(0, uiGroupDepth - 1);
  }


  function setGroupCollapsedByDefault(value) {
    groupCollapsedByDefault = !!value;
  }

  function setStructured(value) {
    structured = !!value;
  }

  function setMaxUILogs(value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) return;

    maxUILogs = Math.floor(parsed);

    if (uiLogList) {
      while (uiLogList.children.length > maxUILogs) {
        uiLogList.removeChild(uiLogList.firstChild);
      }
    }
  }

  function setUIAutoScroll(value) {
    uiAutoScroll = !!value;
  }

  function setUITimestamps(value) {
    showUITimestamps = !!value;
  }


  function getComplexArg(args) {
    return args.find(a => a !== null && typeof a === 'object');
  }

  function getTagArg(args) {
    return typeof args[0] === 'string' && args.length > 1 ? args[0] : '';
  }

  function createPreview(args, message) {
    const tag = getTagArg(args);
    const complex = getComplexArg(args);

    if (Array.isArray(complex)) {
      return `${tag ? tag + ' ' : ''}[${complex.slice(0, 5).map(v => JSON.stringify(v)).join(', ')}${complex.length > 5 ? ', …' : ''}]`;
    }

    if (complex && typeof complex === 'object') {
      const keys = Object.keys(complex).slice(0, 3);

      return `${tag ? tag + ' ' : ''}{ ${keys.map(k => `${k}: ${JSON.stringify(complex[k])}`).join(', ')}${Object.keys(complex).length > 3 ? ', …' : ''} }`;
    }

    return message.split('\n')[0].slice(0, 100) + (message.length > 100 ? '…' : '');
  }

  return {
    log,
    error,
    info,
    setLevel,
    setDefaultLevel,
    enable,
    disable,
    setTimestamps,
    setAutoTruncatingOn,
    setAutoTruncatingOff,
    group,
    groupEnd,
    timeStart,
    timeEnd,
    setStructured,
    clear,
    reset,
    enableUI,
    setMaxUILogs,
    setUIAutoScroll,
    setUITimestamps,
  };
}));
