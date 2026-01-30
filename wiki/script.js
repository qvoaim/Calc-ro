// script.js - simple router + page loader + search
const contentEl = document.getElementById('content');
const searchInput = document.getElementById('search');
const pageListEl = document.getElementById('page-list');

const PAGES = {
  'ragnarok-online': 'pages/ragnarok-online.html',
  'prontera': 'pages/prontera.html',
  'weekend': 'pages/weekend.html',
  'friday': 'pages/friday.html'   // <-- añade esta línea
};

function loadPageFromHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const slug = hash || 'ragnarok-online';
  loadPage(slug);
}

async function loadPage(slug) {
  const path = PAGES[slug];
  if (!path) {
    contentEl.innerHTML = `<article><h2>Artículo no encontrado</h2><p>El artículo "${slug}" no existe.</p></article>`;
    return;
  }
  try {
    contentEl.innerHTML = `<div class="page-loading"><p>Cargando...</p></div>`;
    const res = await fetch(path);
    if (!res.ok) throw new Error('No se pudo cargar la página');
    const html = await res.text();
    contentEl.innerHTML = html;
    // move focus to main content for accessibility
    contentEl.querySelector('h1')?.focus?.();
  } catch (err) {
    contentEl.innerHTML = `<article><h2>Error</h2><p>${err.message}</p></article>`;
  }
}

// Wire navigation clicks for SPA behavior
pageListEl.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-page]');
  if (!a) return;
  e.preventDefault();
  const page = a.getAttribute('data-page');
  location.hash = `/${page}`;
});

// Simple search that filters sidebar links and also searches page titles
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  [...pageListEl.querySelectorAll('li')].forEach(li => {
    const text = li.textContent.toLowerCase();
    li.style.display = text.includes(q) ? '' : 'none';
  });
  // If one visible and q not empty, auto-load first match
  if (q) {
    const first = pageListEl.querySelector('li:not([style*="display: none"]) a');
    if (first) {
      const page = first.getAttribute('data-page');
      // do not change hash if current page already matches
      if (location.hash.replace(/^#\/?/, '') !== page) {
        location.hash = `/${page}`;
      }
    }
  }
}

);
(function () {
  const toggles = document.querySelectorAll('.category-toggle');
  if (!toggles || toggles.length === 0) return;

  toggles.forEach(btn => {
    const targetId = btn.getAttribute('aria-controls');
    if (!targetId) return;
    const list = document.getElementById(targetId);
    if (!list) return;

    // Click handler
    btn.addEventListener('click', (e) => {
      const isOpen = btn.classList.toggle('open'); // añado/remuevo clase para rotar icono
      // Toggle hidden attribute (accessible)
      if (isOpen) {
        list.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      } else {
        list.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Keyboard support (Enter / Space)
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();
document.addEventListener('DOMContentLoaded', function () {
  // Selecciona todos los bloques donde quieres control manual de saltos
  document.querySelectorAll('.manual-wrap').forEach(el => {
    // Reemplaza todas las ocurrencias de [[BR]] por <br>
    // Usamos innerHTML porque puede contener enlaces e imágenes
    el.innerHTML = el.innerHTML.replace(/\[\[BR\]\]/g, '<br>');
  });
});


// support back/forward
window.addEventListener('hashchange', loadPageFromHash);

// initial load
loadPageFromHash();