/* Dayvilab — comun.js
 * Código compartido por index.html y producto.html:
 * configuración, utilidades, carga de productos.json, lista de cotización
 * (sincronizada entre pestañas), panel "Mi cotización", botón flotante de WhatsApp.
 */
window.DV = (function () {
  'use strict';

  /* ================= Configuración ================= */
  const CONFIG = {
    WA_NUMBER: '51993007474',
    EMAIL: 'dayvilab2@gmail.com',
    // Reemplace "tu-endpoint" por el ID de su formulario en https://formspree.io
    FORMSPREE_ENDPOINT: 'https://formspree.io/f/tu-endpoint',
    PRODUCTOS_URL: 'productos.json',
    STORE_KEY: 'dayvilab-cotizacion-v2',
    POR_PAGINA: 24
  };

  const CATS = {
    equipos:    { label: 'Equipos de Laboratorio', short: 'Equipos', icon: 'microscope',
                  desc: 'Instrumentos de medición y análisis para rutina e investigación.' },
    materiales: { label: 'Cristalería, Plásticos y Materiales', short: 'Cristalería y Materiales', icon: 'flask-conical',
                  desc: 'Material de uso diario en vidrio, porcelana y polipropileno.' },
    reactivos:  { label: 'Reactivos y Consumibles Analíticos', short: 'Reactivos', icon: 'test-tubes',
                  desc: 'Reactivos grado analítico y consumibles para control de calidad.' },
    medico:     { label: 'Material Médico', short: 'Material Médico', icon: 'syringe',
                  desc: 'Insumos para toma de muestra y laboratorio clínico.' }
  };
  const OTROS = { label: 'Otros productos', short: 'Otros', icon: 'package', desc: '' };
  const catInfo = key => CATS[key] || OTROS;

  const WA_GENERAL = 'Hola Dayvilab, deseo solicitar una cotización técnica para mi empresa. RUC: ';
  const WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="width:1.15em;height:1.15em"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.880 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/></svg>';

  /* ================= Utilidades ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normalize = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };
  const waLink = text => 'https://wa.me/' + CONFIG.WA_NUMBER + '?text=' + encodeURIComponent(text);
  const fichaUrl = id => 'producto.html?id=' + encodeURIComponent(id);
  const fmt = n => Number(n).toLocaleString('es-PE');

  // Ajusta el ancho solicitado para fotos de Unsplash; otras URLs se usan tal cual.
  function imgUrl(url, w) {
    if (!url) return '';
    if (/^https:\/\/images\.unsplash\.com\//.test(url)) {
      try {
        const u = new URL(url);
        u.searchParams.set('auto', 'format');
        u.searchParams.set('fit', 'crop');
        u.searchParams.set('w', String(w || 800));
        u.searchParams.set('q', '80');
        return u.toString();
      } catch (e) { return url; }
    }
    return url;
  }

  // <img> con respaldo: imagen local (fallback) o ícono. Devuelve null si ya falló y no hay respaldo.
  function photoHTML(url, opts) {
    const o = opts || {};
    const alt = esc(o.alt || '');
    const cls = 'ph' + (o.cls ? ' ' + o.cls : '');
    if (!url || (window.__dvFailed && window.__dvFailed.has(url))) {
      return o.fallback ? '<img class="' + cls + ' is-fallback" src="' + esc(o.fallback) + '" alt="' + alt + '">' : null;
    }
    return '<img data-web class="' + cls + '" src="' + esc(url) + '" ' +
      (o.fallback ? 'data-fallback="' + esc(o.fallback) + '"' : 'data-icon="' + esc(o.icon || 'package') + '"') +
      ' alt="' + alt + '"' + (o.lazy ? ' loading="lazy" decoding="async"' : '') + '>';
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    $('#toastText').textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
  }
  function fillWaGlyphs(root) { $$('.wa-glyph', root || document).forEach(el => { if (!el.innerHTML) el.innerHTML = WA_SVG; }); }

  let locks = 0;
  const lockScroll = () => { locks += 1; document.body.style.overflow = 'hidden'; };
  const unlockScroll = () => { locks = Math.max(0, locks - 1); if (!locks) document.body.style.overflow = ''; };

  /* ================= Catálogo (productos.json) ================= */
  let productosPromise = null;
  function cargarProductos() {
    if (!productosPromise) {
      productosPromise = fetch(CONFIG.PRODUCTOS_URL, { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
          const lista = (Array.isArray(data) ? data : (data.productos || [])).filter(p => p && p.id != null && p.nombre);
          lista.forEach((p, i) => {
            p.id = String(p.id);
            p._i = i;
            p._search = normalize([p.id, p.codigo, p.nombre, p.marca, p.modelo, p.subcategoria, p.resumen,
              (p.etiquetas || []).join(' '), catInfo(p.categoria).label].join(' '));
          });
          return { productos: lista, porId: new Map(lista.map(p => [p.id, p])), actualizado: data.actualizado || '' };
        });
      productosPromise.catch(() => { productosPromise = null; });
    }
    return productosPromise;
  }

  /* ================= Lista de cotización ================= */
  let items = cargarLista();
  const subs = [];
  function cargarLista() {
    try {
      const v = JSON.parse(localStorage.getItem(CONFIG.STORE_KEY));
      return Array.isArray(v) ? v.filter(i => i && i.key && i.nombre && i.qty > 0) : [];
    } catch (e) { return []; }
  }
  function guardar() {
    try { localStorage.setItem(CONFIG.STORE_KEY, JSON.stringify(items)); } catch (e) { /* sin almacenamiento */ }
    emitir();
  }
  function emitir() { renderDrawer(); actualizarContadores(); refrescarBotones(); icons(); subs.forEach(fn => { try { fn(items); } catch (e) { console.error(e); } }); }
  // Otras pestañas (p. ej. una ficha técnica abierta) actualizan la misma lista.
  window.addEventListener('storage', e => { if (e.key === CONFIG.STORE_KEY) { items = cargarLista(); emitir(); } });

  const cotizacion = {
    items: () => items.slice(),
    total: () => items.length,
    onChange(fn) { subs.push(fn); },
    tiene: id => items.some(i => i.id === id),
    agregar(p, opts) {
      const o = opts || {};
      const pres = (o.presentacion || '').trim(), cod = (o.codigo || '').trim();
      const key = p.id + (cod || pres ? '::' + (cod || pres) : '');
      const qty = Math.max(1, parseInt(o.cantidad, 10) || 1);
      const ex = items.find(i => i.key === key);
      if (ex) ex.qty += qty;
      else items.push({ key, id: p.id, nombre: p.nombre, marca: p.marca || '', presentacion: pres, codigo: cod || p.codigo || '',
        qty, imagen: p.imagen || '', icon: catInfo(p.categoria).icon });
      guardar(); toast('Añadido a su lista de cotización');
    },
    agregarLibre(texto) {
      items.push({ key: 'libre-' + Date.now(), nombre: String(texto).slice(0, 160), qty: 1, libre: true, icon: 'package' });
      guardar(); toast('Ítem agregado a su lista');
    },
    cantidad(key, q) { const it = items.find(i => i.key === key); if (it) { it.qty = Math.max(1, parseInt(q, 10) || 1); guardar(); } },
    quitar(key) { items = items.filter(i => i.key !== key); guardar(); },
    vaciar() { items = []; guardar(); },
    etiqueta(i) {
      return i.nombre + (i.marca ? ' – ' + i.marca : '') + (i.presentacion ? ' – ' + i.presentacion : '') + (i.codigo ? ' (Cód. ' + i.codigo + ')' : '');
    },
    texto() { return items.map((i, n) => (n + 1) + '. ' + cotizacion.etiqueta(i) + ' — Cant.: ' + i.qty).join('\n'); }
  };

  /* ================= Tarjeta de producto (catálogo y relacionados) ================= */
  function botonAgregar(id) {
    return cotizacion.tiene(id) ? '<i data-lucide="check"></i>Añadido · Ver lista' : '<i data-lucide="plus"></i>Añadir a cotización';
  }
  function tarjeta(p) {
    const c = catInfo(p.categoria);
    const url = fichaUrl(p.id);
    const img = photoHTML(imgUrl(p.imagen, 600), { icon: c.icon, alt: p.nombre, lazy: true });
    const media = img
      ? '<a class="product-media" href="' + url + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">' + img + '<span class="ref-tag">Imagen referencial</span></a>'
      : '<a class="product-media is-icon" href="' + url + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"><i data-lucide="' + c.icon + '"></i></a>';
    const marca = [p.marca, p.codigo ? 'Cód. ' + p.codigo : ''].filter(Boolean).map(esc).join(' · ');
    const waText = 'Hola Dayvilab, deseo solicitar una cotización técnica para: ' + p.nombre + (p.marca ? ' – ' + p.marca : '') +
      (p.codigo ? ' (Cód. ' + p.codigo + ')' : '') + '. Cantidad: ';
    return '<article class="product-card">' + media +
      '<div class="product-body">' +
        '<div class="flex flex-wrap gap-1.5 min-w-0"><span class="badge">' + esc(c.short) + '</span>' +
          (p.subcategoria ? '<span class="sub-badge">' + esc(p.subcategoria) + '</span>' : '') + '</div>' +
        '<h3><a class="product-title" href="' + url + '" target="_blank" rel="noopener">' + esc(p.nombre) +
          '<span class="sr-only"> (abre la ficha técnica en una pestaña nueva)</span></a></h3>' +
        (marca ? '<p class="product-brand mono">' + marca + '</p>' : '') +
        (p.resumen ? '<p class="product-spec clamp-2">' + esc(p.resumen) + '</p>' : '') +
        '<a class="ficha-link" href="' + url + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">Ver ficha técnica<i data-lucide="external-link"></i></a>' +
        '<div class="product-actions">' +
          '<button type="button" class="btn-add' + (cotizacion.tiene(p.id) ? ' is-added' : '') + '" data-add="' + esc(p.id) + '">' + botonAgregar(p.id) + '</button>' +
          '<a class="btn-icon-wa" href="' + waLink(waText) + '" target="_blank" rel="noopener" aria-label="Cotizar ' + esc(p.nombre) + ' por WhatsApp">' + WA_SVG + '</a>' +
        '</div>' +
      '</div></article>';
  }
  function refrescarBotones() {
    $$('[data-add]').forEach(b => {
      b.classList.toggle('is-added', cotizacion.tiene(b.dataset.add));
      b.innerHTML = botonAgregar(b.dataset.add);
    });
  }

  /* ================= Componentes compartidos ================= */
  function inyectarShell() {
    const html = `
<a href="#" data-wa="general" target="_blank" rel="noopener" class="wa-float" aria-label="Solicitar cotización por WhatsApp">
  <span class="bubble hidden sm:block">¿Necesita una cotización? Escríbanos</span>
  <span class="disc relative"><span class="wa-glyph"></span></span>
</a>
<div class="overlay" id="drawerOverlay" hidden></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle" data-dialog hidden>
  <div class="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
    <div>
      <h2 id="drawerTitle" class="text-lg font-extrabold">Mi lista de cotización</h2>
      <p class="text-xs text-steel"><span data-cart-count-inline>0</span> ítems seleccionados</p>
    </div>
    <button type="button" class="w-10 h-10 grid place-items-center rounded-lg text-steel hover:text-ink hover:bg-surface" data-close-drawer aria-label="Cerrar lista"><i data-lucide="x" class="w-5 h-5"></i></button>
  </div>
  <div class="flex-1 overflow-y-auto px-5 py-4">
    <ul id="quoteItems" class="divide-y divide-line"></ul>
    <div id="quoteEmpty" class="text-center py-10" hidden>
      <span class="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-surface text-steel"><i data-lucide="clipboard-list" class="w-7 h-7"></i></span>
      <p class="mt-4 font-semibold text-ink">Su lista está vacía</p>
      <p class="text-sm text-steel mt-1 max-w-[30ch] mx-auto">Añada productos desde el catálogo o agregue un ítem que no esté publicado.</p>
      <a href="index.html#catalogo" class="btn btn-outline btn-sm mt-5" data-goto-catalog>Ir al catálogo</a>
    </div>
    <form id="customForm" class="mt-5 rounded-xl bg-surface border border-line p-4">
      <label for="customItem" class="text-sm font-bold text-ink">Agregar ítem no listado</label>
      <p class="text-xs text-steel mt-0.5">Producto, marca o código de referencia.</p>
      <div class="mt-3 flex gap-2">
        <input id="customItem" class="input !min-h-[42px] text-sm" placeholder="Ej.: Matraz Erlenmeyer 250 mL" autocomplete="off">
        <button type="submit" class="btn btn-primary btn-sm flex-none" aria-label="Agregar ítem"><i data-lucide="plus" class="w-4 h-4"></i></button>
      </div>
    </form>
  </div>
  <div class="border-t border-line px-5 py-4 space-y-2.5" id="drawerActions">
    <button type="button" class="btn btn-primary w-full" id="drawerQuote"><i data-lucide="file-text" class="w-[18px] h-[18px]"></i>Solicitar cotización formal</button>
    <div class="grid grid-cols-2 gap-2.5">
      <a href="#" id="drawerWa" target="_blank" rel="noopener" class="btn btn-wa btn-sm"><span class="wa-glyph"></span>WhatsApp</a>
      <a href="#" id="drawerMail" class="btn btn-outline btn-sm"><i data-lucide="mail" class="w-4 h-4"></i>Correo</a>
    </div>
    <div class="flex items-center justify-between gap-2 text-sm pt-1">
      <span class="text-steel text-xs">Correo: <span class="select-all">${CONFIG.EMAIL}</span></span>
      <span>
        <button type="button" class="btn-ghost text-xs inline-flex items-center gap-1" id="clearBtn"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Vaciar lista</button>
        <span id="clearConfirm" class="text-xs" hidden>¿Vaciar? <button type="button" class="font-bold text-[#B91C1C] ml-1" id="clearYes">Sí</button> <button type="button" class="font-semibold text-steel ml-1" id="clearNo">No</button></span>
      </span>
    </div>
  </div>
</aside>
<div class="toast" id="toast" role="status" hidden><i data-lucide="check-circle-2"></i><span id="toastText"></span></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function renderDrawer() {
    const list = $('#quoteItems'); if (!list) return;
    const n = items.length;
    $('#quoteEmpty').hidden = n > 0;
    $('#drawerActions').hidden = n === 0;
    list.innerHTML = items.map(i => {
      const thumb = (i.imagen && photoHTML(imgUrl(i.imagen, 160), { icon: i.icon })) ||
        '<i data-lucide="' + esc(i.icon || 'package') + '" class="w-6 h-6 text-clinic"></i>';
      const nombre = i.libre ? esc(i.nombre)
        : '<a class="hover:text-brand" href="' + fichaUrl(i.id) + '" target="_blank" rel="noopener">' + esc(i.nombre) + '</a>';
      const sub = i.libre ? 'Ítem adicional' : [i.marca, i.presentacion, i.codigo ? 'Cód. ' + i.codigo : ''].filter(Boolean).map(esc).join(' · ');
      return '<li class="py-4 flex gap-3 items-start">' +
        '<span class="w-14 h-14 flex-none rounded-lg border border-line bg-white grid place-items-center overflow-hidden">' + thumb + '</span>' +
        '<div class="flex-1 min-w-0">' +
          '<p class="font-semibold text-ink text-[15px] leading-snug">' + nombre + '</p>' +
          (sub ? '<p class="text-xs text-steel mt-0.5">' + sub + '</p>' : '') +
          '<div class="mt-2.5 flex items-center justify-between gap-2">' +
            '<span class="qty" role="group" aria-label="Cantidad">' +
              '<button type="button" data-step="-1" data-key="' + esc(i.key) + '" aria-label="Disminuir"><i data-lucide="minus"></i></button>' +
              '<input type="number" min="1" value="' + i.qty + '" data-qty-key="' + esc(i.key) + '" aria-label="Cantidad de ' + esc(i.nombre) + '">' +
              '<button type="button" data-step="1" data-key="' + esc(i.key) + '" aria-label="Aumentar"><i data-lucide="plus"></i></button>' +
            '</span>' +
            '<button type="button" class="text-xs font-semibold text-steel hover:text-[#B91C1C] inline-flex items-center gap-1" data-remove="' + esc(i.key) + '"><i data-lucide="x" class="w-3.5 h-3.5"></i>Quitar</button>' +
          '</div>' +
        '</div></li>';
    }).join('');
    const txt = 'Hola Dayvilab, solicito cotización de los siguientes productos:\n' + cotizacion.texto() + '\n\nEmpresa: \nRUC: ';
    $('#drawerWa').href = waLink(txt);
    $('#drawerMail').href = 'mailto:' + CONFIG.EMAIL + '?subject=' + encodeURIComponent('Solicitud de cotización – Web Dayvilab') +
      '&body=' + encodeURIComponent('Estimados Dayvilab:\n\nSolicito cotización de los siguientes productos:\n' + cotizacion.texto() +
      '\n\nRazón social:\nRUC:\nContacto:\nTeléfono:\n\nSaludos cordiales.');
    fillWaGlyphs($('#drawer'));
    icons();
  }

  function actualizarContadores() {
    const n = items.length;
    $$('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = n === 0; });
    $$('[data-cart-count-inline]').forEach(el => { el.textContent = n; });
  }

  let drawerReturn = null;
  function openDrawer(trigger, focusCustom) {
    drawerReturn = trigger || document.activeElement;
    const d = $('#drawer');
    d.hidden = false; $('#drawerOverlay').hidden = false; d.classList.add('drawer-in');
    lockScroll();
    setTimeout(() => (focusCustom ? $('#customItem') : $('[data-close-drawer]')).focus(), 30);
  }
  function closeDrawer() {
    const d = $('#drawer'); if (d.hidden) return;
    d.hidden = true; $('#drawerOverlay').hidden = true; d.classList.remove('drawer-in');
    unlockScroll();
    if (drawerReturn && drawerReturn.focus) drawerReturn.focus();
  }

  function bindDrawer() {
    $('#drawerOverlay').addEventListener('click', closeDrawer);
    $('[data-close-drawer]').addEventListener('click', closeDrawer);
    $('#quoteItems').addEventListener('click', e => {
      const st = e.target.closest('[data-step]'), rm = e.target.closest('[data-remove]');
      if (st) { const it = items.find(i => i.key === st.dataset.key); if (it) cotizacion.cantidad(it.key, it.qty + (+st.dataset.step)); }
      if (rm) cotizacion.quitar(rm.dataset.remove);
    });
    $('#quoteItems').addEventListener('change', e => {
      const inp = e.target.closest('[data-qty-key]'); if (inp) cotizacion.cantidad(inp.dataset.qtyKey, inp.value);
    });
    $('#customForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#customItem').value.trim();
      if (!v) { $('#customItem').focus(); return; }
      $('#customItem').value = ''; cotizacion.agregarLibre(v);
    });
    $('#clearBtn').addEventListener('click', () => { $('#clearBtn').hidden = true; $('#clearConfirm').hidden = false; });
    $('#clearNo').addEventListener('click', () => { $('#clearBtn').hidden = false; $('#clearConfirm').hidden = true; });
    $('#clearYes').addEventListener('click', () => { cotizacion.vaciar(); $('#clearBtn').hidden = false; $('#clearConfirm').hidden = true; });
    $('#drawerQuote').addEventListener('click', () => {
      if (typeof api.openQuote === 'function') { closeDrawer(); api.openQuote(); }
      else window.location.href = 'index.html#solicitar';
    });
    $('[data-goto-catalog]').addEventListener('click', e => {
      if (document.getElementById('catalogo')) { e.preventDefault(); closeDrawer(); document.getElementById('catalogo').scrollIntoView(); }
    });
  }

  function bindHeader() {
    const header = $('#header');
    if (header) {
      const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }
    const btn = $('#menuBtn'), menu = $('#mobileMenu');
    if (btn && menu) {
      btn.addEventListener('click', () => api.setMenu(menu.hidden));
      $$('a, [data-open-quote]', menu).forEach(a => a.addEventListener('click', () => api.setMenu(false)));
    }
  }
  function setMenu(open) {
    const btn = $('#menuBtn'), menu = $('#mobileMenu'); if (!btn || !menu) return;
    menu.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    btn.innerHTML = '<i data-lucide="' + (open ? 'x' : 'menu') + '" class="w-6 h-6"></i>'; icons();
  }

  function bindGlobal() {
    document.addEventListener('click', e => {
      const od = e.target.closest('[data-open-drawer]');
      if (od) { e.preventDefault(); openDrawer(od, od.hasAttribute('data-focus-custom')); return; }
      const wa = e.target.closest('[data-wa="general"]');
      if (wa) wa.href = waLink(WA_GENERAL);
      const cp = e.target.closest('[data-copy]');
      if (cp) copiar(cp);
      const add = e.target.closest('[data-add]');
      if (add) {
        if (cotizacion.tiene(add.dataset.add)) { openDrawer(add); return; }
        cargarProductos().then(d => { const p = d.porId.get(add.dataset.add); if (p) cotizacion.agregar(p); });
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!$('#drawer').hidden) closeDrawer();
        else { const menu = $('#mobileMenu'); if (menu && !menu.hidden) setMenu(false); }
      }
      if (e.key === 'Tab') atraparFoco(e);
    });
  }

  // Mantiene el foco dentro del diálogo visible más reciente (drawer, modal, visor de imagen).
  function atraparFoco(e) {
    const abiertos = $$('[data-dialog]').filter(d => !d.hidden);
    const box = abiertos[abiertos.length - 1]; if (!box) return;
    const f = $$('a[href], button:not([disabled]), input:not([type=hidden]):not([tabindex="-1"]), select, textarea', box)
      .filter(el => el.getClientRects().length > 0);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function copiar(b) {
    const text = b.dataset.copy;
    const fallback = () => {
      const target = b.previousElementSibling; if (!target) return;
      const range = document.createRange(); range.selectNodeContents(target);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      toast('Texto seleccionado: cópielo con Ctrl/Cmd + C');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Copiado: ' + text)).catch(fallback);
    } else fallback();
  }

  function renderFooter() {
    const fc = $('#footerCats');
    if (fc) fc.innerHTML = Object.entries(CATS).map(([k, c]) =>
      '<li><a class="hover:text-white" href="index.html?cat=' + k + '#catalogo" data-filter-link="' + k + '">' + esc(c.label) + '</a></li>').join('');
    const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  }

  function init() {
    inyectarShell();
    bindDrawer(); bindHeader(); bindGlobal(); renderFooter();
    renderDrawer(); actualizarContadores();
    $$('[data-wa="general"]').forEach(a => { a.href = waLink(WA_GENERAL); });
    fillWaGlyphs(); icons();
  }

  const api = {
    CONFIG, CATS, catInfo, WA_SVG, WA_GENERAL,
    $, $$, esc, normalize, icons, waLink, fichaUrl, fmt, imgUrl, photoHTML, toast, fillWaGlyphs, tarjeta,
    lockScroll, unlockScroll, setMenu, openDrawer, closeDrawer,
    cargarProductos, cotizacion,
    openQuote: null // index.html lo define (modal del formulario)
  };
  init();
  return api;
})();
