/**
 * AstroTechnologies Portal — Documentation Engine
 * Interactive documentation with search, navigation, and code copy.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

(function () {
  'use strict';

  // ── DOM Ready ──
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupNavigation();
    setupSearch();
    setupEndpointToggles();
    setupCopyButtons();
    setupTabNavigation();
    setupMobileMenu();
    setupScrollSpy();
    highlightSyntax();
  }

  // ────────────────────────────────────────────────
  // Navigation — active link tracking
  // ────────────────────────────────────────────────
  function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          setActiveNav(link);
          // Close mobile sidebar
          document.querySelector('.sidebar')?.classList.remove('open');
        }
      });
    });
  }

  function setActiveNav(activeLink) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    activeLink.classList.add('active');
  }

  // ────────────────────────────────────────────────
  // Scroll Spy — auto-highlight current section
  // ────────────────────────────────────────────────
  function setupScrollSpy() {
    const sections = document.querySelectorAll('.doc-section[id]');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          const navLink = document.querySelector(`.nav-link[href="#${id}"]`);
          if (navLink) setActiveNav(navLink);
        }
      });
    }, { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 });

    sections.forEach(section => observer.observe(section));
  }

  // ────────────────────────────────────────────────
  // Search — filter documentation sections
  // ────────────────────────────────────────────────
  function setupSearch() {
    const searchInput = document.getElementById('doc-search');
    if (!searchInput) return;

    // Keyboard shortcut: Ctrl/Cmd + K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape') {
        searchInput.blur();
        searchInput.value = '';
        filterContent('');
      }
    });

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterContent(searchInput.value.trim().toLowerCase());
      }, 200);
    });
  }

  function filterContent(query) {
    const sections = document.querySelectorAll('.doc-section');
    const endpointBlocks = document.querySelectorAll('.endpoint-block');

    if (!query) {
      sections.forEach(s => s.style.display = '');
      endpointBlocks.forEach(e => e.style.display = '');
      return;
    }

    sections.forEach(section => {
      const text = section.textContent.toLowerCase();
      section.style.display = text.includes(query) ? '' : 'none';
    });

    endpointBlocks.forEach(block => {
      const text = block.textContent.toLowerCase();
      if (text.includes(query)) {
        block.style.display = '';
        block.classList.add('open');
      }
    });
  }

  // ────────────────────────────────────────────────
  // Endpoint Toggle — expand/collapse API details
  // ────────────────────────────────────────────────
  function setupEndpointToggles() {
    document.querySelectorAll('.endpoint-header').forEach(header => {
      header.addEventListener('click', () => {
        const block = header.closest('.endpoint-block');
        block.classList.toggle('open');
      });
    });
  }

  // ────────────────────────────────────────────────
  // Copy Buttons — clipboard copy for code blocks
  // ────────────────────────────────────────────────
  function setupCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const codeBlock = btn.closest('.code-header')?.nextElementSibling?.querySelector('code')
          || btn.closest('pre')?.querySelector('code');

        if (!codeBlock) return;

        try {
          await navigator.clipboard.writeText(codeBlock.textContent);
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          btn.style.color = 'var(--green)';
          btn.style.borderColor = 'var(--green)';
          setTimeout(() => {
            btn.textContent = original;
            btn.style.color = '';
            btn.style.borderColor = '';
          }, 2000);
        } catch {
          btn.textContent = 'Failed';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        }
      });
    });
  }

  // ────────────────────────────────────────────────
  // Tab Navigation — switch between tab content
  // ────────────────────────────────────────────────
  function setupTabNavigation() {
    document.querySelectorAll('.tabs').forEach(tabContainer => {
      const buttons = tabContainer.querySelectorAll('.tab-btn');
      const parentSection = tabContainer.parentElement;

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.tab;

          // Deactivate all
          buttons.forEach(b => b.classList.remove('active'));
          parentSection.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

          // Activate clicked
          btn.classList.add('active');
          const content = parentSection.querySelector(`.tab-content[data-tab="${target}"]`);
          if (content) content.classList.add('active');
        });
      });
    });
  }

  // ────────────────────────────────────────────────
  // Mobile Menu — sidebar toggle
  // ────────────────────────────────────────────────
  function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');

    if (btn && sidebar) {
      btn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open')
          && !sidebar.contains(e.target)
          && e.target !== btn) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  // ────────────────────────────────────────────────
  // Syntax Highlighting — lightweight token coloring
  // ────────────────────────────────────────────────
  function highlightSyntax() {
    document.querySelectorAll('pre code').forEach(block => {
      const lang = block.className || block.parentElement?.dataset?.lang;
      if (!lang) return;

      let html = escapeHtml(block.textContent);

      // JSON highlighting
      if (lang.includes('json')) {
        html = html
          .replace(/"([^"]+)"(?=\s*:)/g, '<span style="color: var(--accent)">"$1"</span>')
          .replace(/:\s*"([^"]*?)"/g, ': <span style="color: var(--green)">"$1"</span>')
          .replace(/:\s*(true|false|null)/g, ': <span style="color: var(--orange)">$1</span>')
          .replace(/:\s*(\d+\.?\d*)/g, ': <span style="color: var(--purple)">$1</span>');
      }

      // Python highlighting
      if (lang.includes('python') || lang.includes('py')) {
        html = html
          .replace(/(#.*)/gm, '<span style="color: var(--text-muted)">$1</span>')
          .replace(/\b(def|class|import|from|return|if|elif|else|for|while|try|except|raise|with|as|yield|async|await|None|True|False)\b/g,
            '<span style="color: var(--purple)">$1</span>')
          .replace(/'([^']*)'/g, '<span style="color: var(--green)">\'$1\'</span>')
          .replace(/"([^"]*)"/g, '<span style="color: var(--green)">"$1"</span>')
          .replace(/@(\w+)/g, '<span style="color: var(--orange)">@$1</span>');
      }

      // Bash/Shell highlighting
      if (lang.includes('bash') || lang.includes('shell')) {
        html = html
          .replace(/(#.*)/gm, '<span style="color: var(--text-muted)">$1</span>')
          .replace(/\b(curl|wget|npm|pip|python|node|flask)\b/g,
            '<span style="color: var(--green)">$1</span>')
          .replace(/(--?\w[\w-]*)/g, '<span style="color: var(--cyan)">$1</span>')
          .replace(/"([^"]*)"/g, '<span style="color: var(--orange)">"$1"</span>');
      }

      // TypeScript/JavaScript highlighting
      if (lang.includes('ts') || lang.includes('js') || lang.includes('typescript')) {
        html = html
          .replace(/(\/\/.*)/gm, '<span style="color: var(--text-muted)">$1</span>')
          .replace(/\b(const|let|var|function|return|if|else|for|while|class|interface|type|import|export|from|async|await|new|this)\b/g,
            '<span style="color: var(--purple)">$1</span>')
          .replace(/'([^']*)'/g, '<span style="color: var(--green)">\'$1\'</span>')
          .replace(/"([^"]*)"/g, '<span style="color: var(--green)">"$1"</span>')
          .replace(/`([^`]*)`/g, '<span style="color: var(--green)">`$1`</span>');
      }

      // SQL highlighting
      if (lang.includes('sql')) {
        html = html
          .replace(/(--.*)/gm, '<span style="color: var(--text-muted)">$1</span>')
          .replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|LEFT|RIGHT|INNER|ON|AND|OR|NOT|NULL|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|UNIQUE|CHECK|CASCADE|IF|EXISTS|BEGIN|END|COMMIT|ROLLBACK|VALUES|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|AS|IN|BETWEEN|LIKE|IS|UUID|TEXT|INTEGER|BOOLEAN|TIMESTAMP|JSONB|NUMERIC|SERIAL|BIGSERIAL)\b/gi,
            '<span style="color: var(--purple)">$&</span>')
          .replace(/'([^']*)'/g, '<span style="color: var(--green)">\'$1\'</span>');
      }

      block.innerHTML = html;
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

})();
