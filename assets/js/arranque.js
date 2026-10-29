/* Dayvilab — arranque.js
 * Cargar en <head>, justo después de https://cdn.tailwindcss.com.
 * 1) Configuración de colores y tipografías de Tailwind.
 * 2) Respaldo de imágenes: si una foto web no carga, se usa la imagen local
 *    (data-fallback) o un ícono (data-icon).
 */
window.tailwind = window.tailwind || {}; // evita errores si el CDN no responde
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: '#009FE3', 'brand-dark': '#0086C0', clinic: '#00989E',
        ink: '#1E293B', ink2: '#334155', steel: '#76777A', surface: '#F8FAFC', line: '#E2E8F0'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  }
};

(function () {
  window.__dvFailed = new Set();
  function fallback(img) {
    if (img.dataset.fbDone) return;
    img.dataset.fbDone = '1';
    window.__dvFailed.add(img.getAttribute('src'));
    if (img.dataset.fallback) {
      img.src = img.dataset.fallback;
      img.classList.add('is-fallback');
      return;
    }
    var box = img.parentNode;
    if (img.dataset.icon && box) {
      box.classList.add('is-icon');
      Array.prototype.slice.call(box.querySelectorAll('img, .ref-tag, .zoom-hint')).forEach(function (n) { n.remove(); });
      var i = document.createElement('i');
      i.setAttribute('data-lucide', img.dataset.icon);
      box.appendChild(i);
      if (window.lucide) window.lucide.createIcons();
    }
  }
  window.__dvFallback = fallback;
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-web')) fallback(t);
  }, true);
})();
