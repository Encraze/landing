const SELECTORS = {
  bootSection: 'boot-sequence',
  bootLog: 'boot-log',
  terminal: 'terminal',
  output: 'terminal-output',
  form: 'terminal-form',
  input: 'terminal-command',
  suggestion: 'input-suggestion',
};

const MOTD_PATH = 'content/motd.html';
const SIMPLE_CONTENT_COMMANDS = {
  about: 'content/about.html',
  highlights: 'content/highlights.html',
  services: 'content/services.html',
  cases: 'content/cases.html',
  contact: 'content/contact.html',
  creds: 'content/creds.html',
};

const RESOURCE_TEMPLATES = {
  svc: (slug) => `content/service-${slug}.html`,
  case: (slug) => `content/case-${slug}.html`,
};

const DEFAULT_SERVICE_SLUGS = [
  'security',
  'perf',
  'avail',
  'strategy',
  'people',
  'proc',
  'infra',
  'cost',
  'ai',
];
const DEFAULT_CASE_SLUGS = ['sample'];

const AUTOCOMPLETE_COMMANDS = Array.from(
  new Set([
    ...Object.keys(SIMPLE_CONTENT_COMMANDS),
    'help',
    'clear',
    'svc',
    'case',
    'cat',
    'ai',
    'su',
    'sudo',
    'name',
    'whoami',
  ]),
);

const RESTRICTED_COMMANDS = new Set([
  'ls',
  'cd',
  'pwd',
  'rm',
  'mv',
  'cp',
  'touch',
  'mkdir',
  'chmod',
  'chown',
  'nano',
  'vim',
  'grep',
  'less',
  'tail',
  'head',
  'top',
  'ps',
  'kill',
]);

const ELEVATED_COMMANDS = new Set(['su', 'sudo']);

const BOOT_LINE_POOL = [
  ':: initializing secure shell modules…',
  ':: loading signal processors…',
  ':: mounting /opt/qult/services…',
  ':: syncing advisory cache…',
  ':: warming inference layers…',
  ':: establishing lattice handshake…',
  ':: compiling field notes…',
  ':: calibrating client matrix…',
];

const BOOT_LINE_END = ':: boot complete — handing off control.';

const EDGE_OPTIONS = ['top', 'right', 'bottom', 'left'];

function escapeHTML(value = '') {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char] ?? char;
  });
}

class TerminalLanding {
  constructor(root) {
    this.root = root;
    this.refs = {};
    this.bootTimer = null;
    this.history = [];
    this.historyIndex = 0;
    this.inputBound = false;
    this.awaitingPassword = false;
    this.pendingSuggestionValue = null;
    this.pendingSuggestionCursor = null;
    this.inPageNavMode = false;
    this.activePagedBlock = null;
    this.pageNavIndex = 0;
    this.pageNavCount = 0;
    this.currentUser = 'nobody';
    this.handlers = {
      submit: this.handleSubmit.bind(this),
      keydown: this.handleKeyDown.bind(this),
      input: this.handleInputChange.bind(this),
      terminalClick: () => this.focusInput(),
    };
  }

  init() {
    this.cacheRefs();
    if (!this.refs.bootSection || !this.refs.bootLog) {
      console.error('Boot placeholders missing');
      return;
    }
    this.startBootSequence();
  }

  cacheRefs() {
    this.refs.bootSection = document.getElementById(SELECTORS.bootSection);
    this.refs.bootLog = document.getElementById(SELECTORS.bootLog);
    this.refs.terminal = document.getElementById(SELECTORS.terminal);
    this.refs.output = document.getElementById(SELECTORS.output);
    this.refs.form = document.getElementById(SELECTORS.form);
    this.refs.input = document.getElementById(SELECTORS.input);
    this.refs.suggestion = document.getElementById(SELECTORS.suggestion);
    this.refs.prompt = document.querySelector('.prompt-label');
    this.updatePromptLabel();
  }

  startBootSequence() {
    const lines = this.generateBootLines();
    let index = 0;
    const emitLine = () => {
      this.appendBootLine(lines[index]);
      index += 1;
      if (index >= lines.length) {
        setTimeout(() => this.completeBoot(), 800);
        return;
      }
      const delay = this.randomBetween(200, 500);
      this.bootTimer = setTimeout(emitLine, delay);
    };
    emitLine();
  }

  generateBootLines() {
    const shuffled = [...BOOT_LINE_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 4);
    return [...selected, BOOT_LINE_END];
  }

  appendBootLine(line) {
    if (!this.refs.bootLog) return;
    const node = document.createElement('div');
    node.textContent = line;
    this.refs.bootLog.appendChild(node);
    this.refs.bootLog.scrollTop = this.refs.bootLog.scrollHeight;
  }

  completeBoot() {
    if (this.refs.bootSection) {
      this.refs.bootSection.classList.add('boot-complete');
      setTimeout(() => {
        this.refs.bootSection.classList.add('hidden');
        this.showTerminal();
      }, 320);
    } else {
      this.showTerminal();
    }
  }

  showTerminal() {
    if (!this.refs.terminal) return;
    this.refs.terminal.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.refs.terminal?.classList.add('is-active');
    });
    this.appendOutputBlock('<p class="terminal-heading">The rift is calling you…</p>');
    this.loadMotd();
    this.bindInput();
    this.focusInput();
  }

  bindInput() {
    if (this.inputBound) return;
    if (!this.refs.form || !this.refs.input) {
      console.warn('Input bindings unavailable.');
      return;
    }
    this.refs.form.addEventListener('submit', this.handlers.submit);
    this.refs.input.addEventListener('keydown', this.handlers.keydown);
    this.refs.input.addEventListener('input', this.handlers.input);
    this.refs.terminal?.addEventListener('click', this.handlers.terminalClick);
    this.setInputMode('text');
    this.updateSuggestionState();
    this.inputBound = true;
  }

  focusInput() {
    this.refs.input?.focus();
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (!this.refs.input) return;
    const rawValue = this.refs.input.value;

    if (this.awaitingPassword) {
      this.resolvePasswordAttempt();
      this.refs.input.value = '';
      this.clearSuggestion();
      return;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) return;

    this.appendCommandEcho(trimmed);
    this.history.push(trimmed);
    this.historyIndex = this.history.length;
    this.refs.input.value = '';
    this.clearSuggestion();
    await this.delay(300);
    await this.routeCommand(trimmed);
  }

  handleKeyDown(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (this.inPageNavMode && this.activePagedBlock) {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        this.stepPage(direction);
        return;
      }
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.handleAutocomplete();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.stepHistory(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.stepHistory(1);
      return;
    }
    if (event.key === 'Escape') {
      if (this.refs.input) {
        this.refs.input.value = '';
        this.historyIndex = this.history.length;
        this.clearSuggestion();
      }
      this.inPageNavMode = false;
      this.activePagedBlock = null;
    }
  }

  handleInputChange() {
    this.inPageNavMode = false;
    this.activePagedBlock = null;
    this.updateSuggestionState();
  }

  async routeCommand(rawValue) {
    const [commandToken = '', ...rest] = rawValue.split(/\s+/);
    const command = commandToken.toLowerCase();
    const argString = rest.join(' ').trim();

    if (!command) return;

    try {
      if (ELEVATED_COMMANDS.has(command)) {
        this.promptForPassword();
        return;
      }

      if (command === 'clear') {
        this.clearOutput();
        return;
      }

      if (command === 'help') {
        this.appendOutputBlock(this.buildHelpMarkup());
        return;
      }

      if (command === 'ai') {
        this.appendSystemMessage('<p>coming soon...</p>');
        return;
      }

      if (command === 'cat') {
        this.renderCatImage();
        return;
      }

      if (command === 'svc') {
        await this.handleResourceDetail('svc', argString);
        return;
      }

      if (command === 'case') {
        await this.handleResourceDetail('case', argString);
        return;
      }

      if (command === 'name') {
        this.handleNameCommand(argString);
        return;
      }

      if (command === 'whoami') {
        this.handleWhoAmI();
        return;
      }

      if (Object.prototype.hasOwnProperty.call(SIMPLE_CONTENT_COMMANDS, command)) {
        await this.handleContentCommand(command);
        return;
      }

      if (this.isRestrictedCommand(command)) {
        this.appendPermissionDenied();
        return;
      }

      this.appendNotFound(commandToken);
    } catch (error) {
      console.error(error);
      this.appendError('Command failed. Please try again.');
    }
  }

  stepHistory(direction) {
    if (!this.history.length || !this.refs.input) return;
    const nextIndex = Math.min(
      Math.max(this.historyIndex + direction, 0),
      this.history.length,
    );
    this.historyIndex = nextIndex;
    const nextValue =
      nextIndex === this.history.length ? '' : this.history[nextIndex];
    this.refs.input.value = nextValue;
    const cursorPos = nextValue.length;
    this.refs.input.setSelectionRange(cursorPos, cursorPos);
    this.updateSuggestionState();
  }

  handleAutocomplete() {
    if (!this.refs.input || this.awaitingPassword) return;
    if (!this.pendingSuggestionValue) {
      this.updateSuggestionState();
    }
    if (this.pendingSuggestionValue) {
      this.applyPendingSuggestion();
      return;
    }
    const inputEl = this.refs.input;
    const caret = inputEl.selectionStart ?? inputEl.value.length;
    const prefix = inputEl.value.slice(0, caret).trim();
    if (!prefix || prefix.includes(' ')) {
      return;
    }
    const suggestion = this.findSuggestion(prefix.toLowerCase(), AUTOCOMPLETE_COMMANDS);
    if (!suggestion || suggestion === prefix.toLowerCase()) return;
    const remainder = suggestion.slice(prefix.length);
    const fullValue = prefix + remainder;
    inputEl.value = fullValue;
    inputEl.setSelectionRange(fullValue.length, fullValue.length);
    this.clearSuggestion();
  }

  appendCommandEcho(command) {
    const safe = escapeHTML(command);
    this.appendOutputBlock(
      `<p><span class="prompt-label">${this.buildPromptLabel()}</span> ${safe}</p>`,
    );
  }

  appendOutputBlock(html, options = {}) {
    if (!this.refs.output) return null;
    const block = document.createElement('article');
    block.className = 'output-block';
    if (options.variant) {
      block.classList.add(`is-${options.variant}`);
    }
    block.innerHTML = html;
    this.refs.output.appendChild(block);
    if (options.autoScroll !== false) {
      this.scrollToBottom();
    }
    return block;
  }

  appendSystemMessage(html) {
    this.appendOutputBlock(html, { variant: 'system' });
  }

  appendError(message) {
    this.appendOutputBlock(`<p class="error">${message}</p>`, {
      variant: 'error',
    });
  }

  appendPermissionDenied() {
    this.appendError("You don't have permissions to perform this command");
  }

  appendNotFound(command) {
    const safe = escapeHTML(command);
    this.appendError(`command not found: <code>${safe}</code>`);
  }

  clearOutput() {
    if (this.refs.output) {
      this.refs.output.innerHTML = '';
    }
  }

  isRestrictedCommand(command) {
    return RESTRICTED_COMMANDS.has(command);
  }

  promptForPassword() {
    this.awaitingPassword = true;
    this.setInputMode('password');
    if (this.refs.input) {
      this.refs.input.value = '';
    }
    this.appendSystemMessage('<p>Password:</p>');
    this.focusInput();
    this.clearSuggestion();
  }

  resolvePasswordAttempt() {
    this.awaitingPassword = false;
    this.setInputMode('text');
    this.appendError('Incorrect password');
    this.focusInput();
    this.clearSuggestion();
  }

  async handleContentCommand(command) {
    const path = SIMPLE_CONTENT_COMMANDS[command];
    if (!path) return;
    try {
      const html = await this.loadFragment(path);
      this.renderHtmlContent(html);
    } catch (error) {
      console.warn(error);
      this.appendError('Content is unavailable right now.');
    }
  }

  async handleResourceDetail(kind, query) {
    if (!query) {
      this.appendError(`Usage: ${kind} <name>`);
      return;
    }
    const slug = this.slugify(query);
    if (!slug) {
      this.appendError('resource not found.');
      return;
    }
    const template = RESOURCE_TEMPLATES[kind];
    if (!template) return;
    const path = template(slug);
    try {
      const html = await this.loadFragment(path);
      this.renderHtmlContent(html);
    } catch (error) {
      if (error?.code === 'not-found') {
        this.appendError('resource not found.');
      } else {
        console.warn(error);
        this.appendError('Unable to load resource right now.');
      }
    }
  }

  renderCatImage() {
    const catUrl = `https://cataas.com/cat?ts=${Date.now()}`;
    const html = `
      <figure class="cat-block">
        <img src="${catUrl}" alt="Here's a cat for you" loading="lazy" />
        <figcaption>Here's a cat for you</figcaption>
      </figure>
    `;
    const block = this.appendOutputBlock(html);
    const img = block?.querySelector('img');
    if (img) {
      if (img.complete) {
        this.scrollToBottom();
      } else {
        img.addEventListener(
          'load',
          () => {
            this.scrollToBottom();
          },
          { once: true },
        );
      }
    }
  }

  renderHtmlContent(html) {
    if (!html) return;
    if (html.includes('<hr')) {
      this.renderPagedBlock(html);
    } else {
      this.appendOutputBlock(html);
    }
  }

  renderPagedBlock(html) {
    if (!this.refs.output) return;

    const rawSegments = html.split(/<hr\b[^>]*>/i);
    const pages = rawSegments
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .map((segment) => {
        const page = document.createElement('div');
        page.className = 'page-chunk';
        page.innerHTML = segment;
        return page;
      });

    if (pages.length <= 1) {
      this.appendOutputBlock(html);
      return;
    }

    const block = document.createElement('article');
    block.className = 'output-block paged-block';

    const body = document.createElement('div');
    body.className = 'paged-body';
    pages.forEach((page, index) => {
      if (index !== 0) {
        page.classList.add('hidden');
      }
      page.dataset.pageIndex = String(index);
      body.appendChild(page);
    });

    const nav = document.createElement('div');
    nav.className = 'page-nav';
    nav.innerHTML = `
      <button type="button" class="page-btn prev" data-role="prev">&larr;</button>
      <span class="page-counter" data-role="counter">1 / ${pages.length}</span>
      <button type="button" class="page-btn next" data-role="next">&rarr;</button>
    `;

    block.dataset.pageIndex = '0';
    block.dataset.pageCount = String(pages.length);

    block.appendChild(body);
    block.appendChild(nav);
    this.refs.output.appendChild(block);

    const viewportHeight = this.refs.output?.clientHeight || 0;
    if (viewportHeight) {
      const navHeight = nav.offsetHeight || 0;
      const verticalPadding = 16; // approx extra padding/margins
      const bodyMin = Math.max(
        0,
        viewportHeight - navHeight - verticalPadding,
      );
      block.style.minHeight = `${viewportHeight}px`;
      body.style.minHeight = `${bodyMin}px`;
    }

    this.scrollToBottom();

    const prevBtn = nav.querySelector('[data-role="prev"]');
    const nextBtn = nav.querySelector('[data-role="next"]');

    prevBtn?.addEventListener('click', () => {
      this.enterPageNav(block);
      this.stepPage(-1);
    });
    nextBtn?.addEventListener('click', () => {
      this.enterPageNav(block);
      this.stepPage(1);
    });

    this.enterPageNav(block);
    this.updatePageNavigation(block);
  }

  enterPageNav(block) {
    this.inPageNavMode = true;
    this.activePagedBlock = block;
    this.pageNavIndex = Number(block.dataset.pageIndex) || 0;
    this.pageNavCount = Number(block.dataset.pageCount) || 0;
  }

  stepPage(direction) {
    if (!this.inPageNavMode || !this.activePagedBlock) return;
    const count = this.pageNavCount;
    if (!count) return;
    let index = this.pageNavIndex + direction;
    index = Math.max(0, Math.min(count - 1, index));
    if (index === this.pageNavIndex) return;
    this.pageNavIndex = index;
    this.activePagedBlock.dataset.pageIndex = String(index);
    this.updatePageNavigation(this.activePagedBlock);
    this.scrollToBottom();
  }

  updatePageNavigation(block) {
    const count = Number(block.dataset.pageCount) || 0;
    const current = Number(block.dataset.pageIndex) || 0;
    const pages = block.querySelectorAll('.page-chunk');
    pages.forEach((page, idx) => {
      if (idx === current) {
        page.classList.remove('hidden');
      } else {
        page.classList.add('hidden');
      }
    });
    const counter = block.querySelector('[data-role="counter"]');
    if (counter) {
      counter.textContent = `${current + 1} / ${count}`;
    }
    const prevBtn = block.querySelector('[data-role="prev"]');
    const nextBtn = block.querySelector('[data-role="next"]');
    if (prevBtn) {
      prevBtn.disabled = current === 0;
    }
    if (nextBtn) {
      nextBtn.disabled = current >= count - 1;
    }
  }

  handleNameCommand(argString) {
    const next = argString.trim();
    if (!next) {
      this.appendSystemMessage(
        '<p>Usage: <code>name &lt;username&gt;</code> &mdash; choose something worthy.</p>',
      );
      return;
    }
    const sanitized = this.sanitizeUsername(next);
    if (!sanitized) {
      this.appendError('That name is not acceptable. Use letters, numbers, dot, dash or underscore.');
      return;
    }
    this.setUserName(sanitized);
    this.appendSystemMessage(
      `<p>You now walk as <strong>${escapeHTML(
        this.currentUser,
      )}</strong>. The terminal remembers.</p>`,
    );
  }

  handleWhoAmI() {
    if (this.currentUser === 'nobody') {
      this.appendSystemMessage('<p>You are nobody. But you can become somebody.</p>');
    } else {
      this.appendSystemMessage(
        `<p>You are <strong>${escapeHTML(
          this.currentUser,
        )}</strong> &mdash; the greatest of your kind.</p>`,
      );
    }
  }

  setUserName(name) {
    this.currentUser = name || 'nobody';
    this.updatePromptLabel();
  }

  sanitizeUsername(value) {
    return value.trim().replace(/[^\w.-]/g, '');
  }

  updatePromptLabel() {
    if (this.refs.prompt) {
      this.refs.prompt.textContent = this.getPromptText();
    }
  }

  getPromptText() {
    return `${this.currentUser}@qult>`;
  }

  buildPromptLabel() {
    return `${escapeHTML(this.currentUser)}@qult&gt;`;
  }

  buildHelpMarkup() {
    return `
      <section class="content-block">
        <h2>qult command reference</h2>
        <ul class="command-list">
          <li><code>help</code> — list available commands</li>
          <li><code>clear</code> — clear screen</li>
          <li><code>about</code> · <code>highlights</code> · <code>services</code> · <code>cases</code> · <code>creds</code> — various angles of Qult</li>
          <li><code>svc &lt;name&gt;</code> — open a specific service detail</li>
          <li><code>case &lt;name&gt;</code> — open a case study</li>
          <li><code>cat</code> — a cat is a cat</li>
          <li><code>ai</code> — future AI assistant (coming soon)</li>
          <li><code>contact</code> — guess...</li>
          <li><code>name &lt;username&gt;</code> — claim your identity</li>
          <li><code>whoami</code> — remind yourself who walks this terminal</li>
        </ul>
        <p class="muted">Tip: press Tab to autocomplete and use ↑/↓ for history.</p>
      </section>
    `;
  }

  slugify(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  commonPrefix(list) {
    if (!list.length) return '';
    let prefix = list[0];
    for (let i = 1; i < list.length; i += 1) {
      const candidate = list[i];
      while (!candidate.startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return '';
      }
    }
    return prefix;
  }

  setInputMode(mode) {
    if (!this.refs.input) return;
    const isPassword = mode === 'password';
    this.refs.input.type = isPassword ? 'password' : 'text';
    this.refs.input.setAttribute(
      'aria-label',
      isPassword ? 'Password input' : 'Terminal command input',
    );
  }

  updateSuggestionState() {
    if (!this.refs.input || this.awaitingPassword) {
      this.clearSuggestion();
      return;
    }
    const value = this.refs.input.value;
    const caretAtEnd =
      this.refs.input.selectionStart === value.length &&
      this.refs.input.selectionEnd === value.length;
    if (!caretAtEnd) {
      this.clearSuggestion();
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      this.clearSuggestion();
      return;
    }
    const parts = trimmed.split(/\s+/);
    const commandToken = parts[0];
    const commandLower = commandToken.toLowerCase();

    if (parts.length === 1 && !value.endsWith(' ')) {
      const suggestion = this.findSuggestion(commandLower, AUTOCOMPLETE_COMMANDS);
      if (suggestion && suggestion !== commandLower) {
        const remainder = suggestion.slice(commandLower.length);
        const fullValue = commandToken + remainder;
        this.setPendingSuggestion(fullValue, fullValue.length);
        return;
      }
    } else if (
      (commandLower === 'svc' || commandLower === 'case') &&
      trimmed.includes(' ') &&
      !value.endsWith(' ')
    ) {
      const argFragment = trimmed.slice(trimmed.indexOf(' ') + 1);
      if (argFragment) {
        const pool = this.getArgumentPool(commandLower);
        const suggestion = this.findSuggestion(argFragment.toLowerCase(), pool);
        if (suggestion && suggestion !== argFragment.toLowerCase()) {
          const remainder = suggestion.slice(argFragment.toLowerCase().length);
          const fullArg = argFragment + remainder;
          const fullValue = `${commandToken} ${fullArg}`;
          this.setPendingSuggestion(fullValue, fullValue.length);
          return;
        }
      }
    }
    this.clearSuggestion();
  }

  getArgumentPool(command) {
    if (command === 'svc') return DEFAULT_SERVICE_SLUGS;
    if (command === 'case') return DEFAULT_CASE_SLUGS;
    return [];
  }

  setPendingSuggestion(value, cursor) {
    this.pendingSuggestionValue = value;
    this.pendingSuggestionCursor = cursor;
    this.updateSuggestionDisplay(value);
  }

  clearSuggestion() {
    this.pendingSuggestionValue = null;
    this.pendingSuggestionCursor = null;
    this.updateSuggestionDisplay('');
  }

  updateSuggestionDisplay(text) {
    if (!this.refs.suggestion) return;
    this.refs.suggestion.textContent = text || '';
  }

  applyPendingSuggestion() {
    if (!this.refs.input || !this.pendingSuggestionValue) return;
    this.refs.input.value = this.pendingSuggestionValue;
    const cursor =
      this.pendingSuggestionCursor ?? this.refs.input.value.length;
    this.refs.input.setSelectionRange(cursor, cursor);
    this.clearSuggestion();
  }

  findSuggestion(fragment, pool) {
    if (!fragment) return '';
    const matches = pool.filter((item) => item.startsWith(fragment));
    if (!matches.length) return '';
    if (matches.length === 1) return matches[0];
    return this.commonPrefix(matches);
  }

  delay(duration) {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  }

  randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  scrollToBottom() {
    if (!this.refs.output) return;
    this.refs.output.scrollTop = this.refs.output.scrollHeight;
  }

  async loadFragment(path) {
    const response = await fetch(`${path}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (response.status === 404) {
      const error = new Error('Not found');
      error.code = 'not-found';
      throw error;
    }
    if (!response.ok) {
      const error = new Error('Failed to load');
      error.code = 'fetch-error';
      throw error;
    }
    return response.text();
  }

  async loadMotd() {
    try {
      const html = await this.loadFragment(MOTD_PATH);
      this.appendOutputBlock(html);
    } catch (error) {
      console.warn(error);
      this.appendSystemMessage(
        '<p>Message of the day is unavailable. Try again later.</p>',
      );
    }
  }
}

class LogoDrifter {
  constructor(node) {
    this.node = node;
    this.currentEdge = null;
    this.timeout = null;
    if (this.node) {
      this.init();
    }
  }

  init() {
    this.currentEdge = this.randomEdge();
    const startPos = this.positionForEdge(this.currentEdge);
    this.applyPosition(startPos, true);
    requestAnimationFrame(() => this.scheduleNextHop());
  }

  scheduleNextHop() {
    const nextEdge = this.pickNextEdge();
    const targetPos = this.positionForEdge(nextEdge);
    const travelMs = this.randomBetween(90000, 120000);
    requestAnimationFrame(() => {
      this.node.style.transition = `transform ${travelMs}ms linear`;
      this.node.style.transform = this.buildTransform(targetPos);
    });
    this.timeout = setTimeout(() => {
      this.currentEdge = nextEdge;
      this.scheduleNextHop();
    }, travelMs + this.randomBetween(500, 1500));
  }

  pickNextEdge() {
    const options = EDGE_OPTIONS.filter((edge) => edge !== this.currentEdge);
    return options[this.randomBetween(0, options.length - 1)];
  }

  positionForEdge(edge) {
    const range = (min, max) => this.randomBetween(min, max);
    switch (edge) {
      case 'top':
        return { x: range(-10, 110), y: -55 };
      case 'bottom':
        return { x: range(-10, 110), y: 105 };
      case 'left':
        return { x: -55, y: range(-10, 110) };
      case 'right':
      default:
        return { x: 105, y: range(-10, 110) };
    }
  }

  applyPosition(pos, immediate = false) {
    if (immediate) {
      this.node.style.transition = 'none';
    }
    this.node.style.transform = this.buildTransform(pos);
  }

  buildTransform(pos) {
    return `translate(${pos.x}vw, ${pos.y}vh)`;
  }

  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomEdge() {
    return EDGE_OPTIONS[this.randomBetween(0, EDGE_OPTIONS.length - 1)];
  }
}

function init() {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    const landing = new TerminalLanding(appRoot);
    landing.init();
  }
  const logo = document.querySelector('.logo-satellite');
  if (logo) {
    new LogoDrifter(logo);
  }
}

document.addEventListener('DOMContentLoaded', init);
