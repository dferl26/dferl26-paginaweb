/* Dayvilab — catalogo.js (solo index.html)
 * Catálogo paginado desde productos.json, filtros, búsqueda, orden,
 * estado en la URL (?cat=&marca=&q=&orden=&pag=) y formulario de cotización.
 */
(function () {
  'use strict';
  const DV = window.DV;
  const { $, $$, esc, normalize, icons, waLink, fmt, imgUrl, photoHTML, CATS, catInfo, CONFIG, cotizacion } = DV;
  const POR_PAGINA = CONFIG.POR_PAGINA;

  /* ================= Estado ================= */
  const state = { cat: 'all', marca: '', q: '', orden: 'relevancia', pag: 1 };
  let DATA = null;
  let resultado = { list: [], counts: {} };

  function leerURL() {
    const sp = new URLSearchParams(location.search);
    state.cat = CATS[sp.get('cat')] ? sp.get('cat') : 'all';
    state.marca = sp.get('marca') || '';
    state.q = sp.get('q') || '';
    state.orden = ['az', 'za', 'marca'].includes(sp.get('orden')) ? sp.get('orden') : 'relevancia';
    state.pag = Math.max(1, parseInt(sp.get('pag'), 10) || 1);
  }
  function escribirURL() {
    const sp = new URLSearchParams();
    if (state.cat !== 'all') sp.set('cat', state.cat);
    if (state.marca) sp.set('marca', state.marca);
    if (state.q.trim()) sp.set('q', state.q.trim());
    if (state.orden !== 'relevancia') sp.set('orden', state.orden);
    if (state.pag > 1) sp.set('pag', state.pag);
    const qs = sp.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) { /* p. ej. file:// */ }
  }

  /* ================= Tarjetas de categoría ================= */
  const CAT_FOTOS = {
    equipos: ['1518152006812-edab29b069ac', 'assets/img/referencia/micro.jpg'],
    materiales: ['1532094349884-543bc11b234d', 'assets/img/referencia/porcelana.jpg'],
    reactivos: ['1554475900-0a0350e3fc7b', 'assets/img/referencia/react.jpg'],
    medico: ['1606206591513-adbfbdd7a177', '']
  };
  function renderCategorias() {
    $('#catTiles').innerHTML = Object.entries(CATS).map(([key, c]) => {
      const url = imgUrl('https://images.unsplash.com/photo-' + CAT_FOTOS[key][0], 700);
      const media = photoHTML(url, { fallback: CAT_FOTOS[key][1], icon: c.icon, lazy: true });
      const n = DATA ? (DATA.porCat[key] || 0) : null;
      return '<button type="button" class="cat-tile" data-filter-go="' + key + '">' +
        '<div class="cat-media' + (media ? '' : ' is-icon') + '" aria-hidden="true">' + (media || '<i data-lucide="' + c.icon + '"></i>') + '</div>' +
        '<div class="p-5 flex flex-col gap-2 flex-1">' +
          '<span class="badge self-start"><i data-lucide="' + c.icon + '" class="w-3.5 h-3.5"></i>' + esc(c.short) + '</span>' +
          '<h3 class="font-bold text-[17px] leading-snug mt-1">' + esc(c.label) + '</h3>' +
          '<p class="text-sm text-steel">' + esc(c.desc) + '</p>' +
          '<span class="mt-auto pt-3 text-sm font-bold text-brand inline-flex items-center gap-1.5">Ver productos' +
            (n != null ? ' <span class="mono text-steel font-medium">(' + fmt(n) + ')</span>' : '') +
            '<i data-lucide="arrow-right" class="w-4 h-4"></i></span>' +
        '</div></button>';
    }).join('');
    icons();
  }

  /* ================= Filtros ================= */
  function renderPills() {
    const c = resultado.counts;
    const opts = [['all', 'Todos', c.all || 0]].concat(Object.entries(CATS).map(([k, v]) => [k, v.short, c[k] || 0]));
    $('#filterPills').innerHTML = opts.map(([k, label, n]) =>
      '<button type="button" class="pill" data-filter="' + k + '" aria-pressed="' + (state.cat === k) + '">' + esc(label) +
      '<span class="count">' + (DATA ? fmt(n) : '–') + '</span></button>').join('');
  }

  function renderMarcas() {
    const sel = $('#brandFilter');
    const marcas = [...DATA.porMarca.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
    sel.innerHTML = '<option value="">Todas las marcas (' + fmt(marcas.length) + ')</option>' +
      marcas.map(([m, n]) => '<option value="' + esc(m) + '">' + esc(m) + ' (' + fmt(n) + ')</option>').join('');
    if (state.marca && !DATA.porMarca.has(state.marca)) state.marca = '';
    sel.value = state.marca;
  }

  function filtrar() {
    const terms = normalize(state.q).split(/\s+/).filter(Boolean);
    const base = DATA.productos.filter(p =>
      (!state.marca || p.marca === state.marca) && terms.every(t => p._search.includes(t)));
    const counts = { all: base.length };
    base.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
    const list = state.cat === 'all' ? base : base.filter(p => p.categoria === state.cat);

    const byName = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    if (state.orden === 'az') list.sort(byName);
    else if (state.orden === 'za') list.sort((a, b) => byName(b, a));
    else if (state.orden === 'marca') list.sort((a, b) => (a.marca || '~').localeCompare(b.marca || '~', 'es') || byName(a, b));
    else {
      // Relevancia: coincidencia en el nombre/código primero, luego destacados, luego orden del archivo.
      const score = p => {
        let s = p.destacado ? 1 : 0;
        if (terms.length) {
          const n = normalize(p.nombre + ' ' + (p.codigo || '') + ' ' + p.id);
          if (terms.every(t => n.includes(t))) s += 4;
          if (n.startsWith(terms[0])) s += 2;
        }
        return s;
      };
      list.forEach(p => { p._s = score(p); });
      list.sort((a, b) => (b._s - a._s) || (a._i - b._i));
    }
    resultado = { list, counts };
  }

  function skeleton(n) {
    const card = '<div class="product-card" aria-hidden="true"><div class="skeleton" style="height:190px;border-radius:0"></div>' +
      '<div class="product-body"><div class="skeleton" style="height:18px;width:40%"></div><div class="skeleton" style="height:20px;width:85%"></div>' +
      '<div class="skeleton" style="height:14px;width:60%"></div><div class="skeleton" style="height:42px;margin-top:12px"></div></div></div>';
    return Array(n).fill(card).join('');
  }

  /* ================= Render del catálogo ================= */
  function totalPaginas() { return Math.max(1, Math.ceil(resultado.list.length / POR_PAGINA)); }

  function render(opts) {
    const o = opts || {};
    if (!DATA) return;
    filtrar();
    const total = resultado.list.length;
    state.pag = Math.min(state.pag, totalPaginas());
    const ini = (state.pag - 1) * POR_PAGINA;
    const pagina = resultado.list.slice(ini, ini + POR_PAGINA);

    const grid = $('#productGrid');
    grid.innerHTML = pagina.map(DV.tarjeta).join('');
    grid.setAttribute('aria-busy', 'false');
    $('#emptyState').hidden = total > 0;

    const ambito = (state.cat !== 'all' ? ' en ' + catInfo(state.cat).label : '') +
      (state.marca ? ' · ' + state.marca : '') + (state.q.trim() ? ' para «' + state.q.trim() + '»' : '');
    $('#resultCount').textContent = total
      ? 'Mostrando ' + fmt(ini + 1) + '–' + fmt(ini + pagina.length) + ' de ' + fmt(total) + ' productos' + ambito
      : '0 productos' + ambito;
    $('#clearFilters').hidden = state.cat === 'all' && !state.marca && !state.q.trim() && state.orden === 'relevancia';

    renderPills();
    renderPager();
    escribirURL();
    icons();
    if (o.scroll) {
      document.getElementById('catalogo').scrollIntoView();
      $('#resultCount').focus({ preventScroll: true });
    }
  }

  function renderPager() {
    const tp = totalPaginas(), p = state.pag, el = $('#pager');
    if (tp <= 1) { el.innerHTML = ''; return; }
    const base = [...new Set([1, tp, p - 1, p, p + 1].filter(n => n >= 1 && n <= tp))].sort((a, b) => a - b);
    // Si entre dos números solo falta una página, se muestra en lugar de "…".
    const sorted = [];
    base.forEach((n, i) => { if (i && n - base[i - 1] === 2) sorted.push(n - 1); sorted.push(n); });
    let html = '<button type="button" class="nav" data-page="' + (p - 1) + '"' + (p === 1 ? ' disabled' : '') + ' aria-label="Página anterior"><i data-lucide="chevron-left"></i><span class="hidden sm:inline">Anterior</span></button>';
    sorted.forEach((n, i) => {
      if (i && n - sorted[i - 1] > 1) html += '<span aria-hidden="true">…</span>';
      html += '<button type="button" data-page="' + n + '"' + (n === p ? ' aria-current="page"' : '') + ' aria-label="Página ' + n + '">' + n + '</button>';
    });
    html += '<button type="button" class="nav" data-page="' + (p + 1) + '"' + (p === tp ? ' disabled' : '') + ' aria-label="Página siguiente"><span class="hidden sm:inline">Siguiente</span><i data-lucide="chevron-right"></i></button>';
    el.innerHTML = html;
  }

  function setFiltro(cambios, opts) {
    Object.assign(state, cambios);
    if (!('pag' in cambios)) state.pag = 1;
    render(opts);
  }

  /* ================= Carga de datos ================= */
  function cargar() {
    $('#loadError').hidden = true;
    $('#productGrid').innerHTML = skeleton(8);
    $('#productGrid').setAttribute('aria-busy', 'true');
    DV.cargarProductos().then(data => {
      const porCat = {}, porMarca = new Map();
      data.productos.forEach(p => {
        porCat[p.categoria] = (porCat[p.categoria] || 0) + 1;
        if (p.marca) porMarca.set(p.marca, (porMarca.get(p.marca) || 0) + 1);
      });
      DATA = Object.assign({}, data, { porCat, porMarca });
      $('#catalogMeta').textContent = fmt(data.productos.length) + ' productos' +
        (data.actualizado ? ' · Actualizado: ' + data.actualizado.split('-').reverse().join('/') : '');
      renderMarcas();
      renderCategorias();
      render();
    }).catch(err => {
      console.error('No se pudo cargar productos.json:', err);
      $('#productGrid').innerHTML = '';
      $('#resultCount').textContent = '';
      $('#loadErrorMsg').textContent = location.protocol === 'file:'
        ? 'El navegador no permite leer productos.json desde un archivo local. Abra el sitio desde su hosting o con un servidor local (por ejemplo: python3 -m http.server).'
        : 'Verifique su conexión y recargue la página.';
      $('#loadError').hidden = false;
      icons();
    });
  }

  /* ================= Eventos del catálogo ================= */
  let debounce;
  function bindCatalogo() {
    const search = $('#catalogSearch');
    search.value = state.q;
    search.addEventListener('input', e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => setFiltro({ q: e.target.value }), 180);
    });
    $('#sortSelect').value = state.orden;
    $('#sortSelect').addEventListener('change', e => setFiltro({ orden: e.target.value }));
    $('#brandFilter').addEventListener('change', e => setFiltro({ marca: e.target.value }));
    $('#filterPills').addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (b) setFiltro({ cat: b.dataset.filter }); });
    $('#pager').addEventListener('click', e => {
      const b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
      setFiltro({ pag: +b.dataset.page }, { scroll: true });
    });
    $('#clearFilters').addEventListener('click', () => {
      search.value = ''; $('#brandFilter').value = ''; $('#sortSelect').value = 'relevancia';
      setFiltro({ cat: 'all', marca: '', q: '', orden: 'relevancia' });
    });
    $('#retryLoad').addEventListener('click', cargar);
    $('#resultCount').setAttribute('tabindex', '-1');

    document.addEventListener('click', e => {
      const go = e.target.closest('[data-filter-go], [data-filter-link]');
      if (go) {
        e.preventDefault();
        setFiltro({ cat: go.dataset.filterGo || go.dataset.filterLink });
        document.getElementById('catalogo').scrollIntoView();
      }
    });
    cotizacion.onChange(actualizarFormLista);
  }

  /* ================= Enlace activo del menú ================= */
  function bindNavActivo() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.nav-link');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['catalogo', 'marcas', 'sectores', 'proceso', 'nosotros', 'cotizar'].forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
  }

  /* ================= Modal + formulario de cotización ================= */
  const modal = $('#quoteModal'), modalOverlay = $('#modalOverlay'), modalPanel = $('#modalPanel');
  const formWrap = $('#quoteFormWrap'), formHome = $('#formHome');
  const form = $('#quoteForm'), req = $('#f-req');
  let modalTrigger = null, lastAuto = '';

  function openQuote(trigger) {
    modalTrigger = trigger || document.activeElement;
    DV.setMenu(false);
    fillRequirements(false);
    modalPanel.appendChild(formWrap);
    formWrap.classList.remove('form-card'); formWrap.classList.add('p-6', 'md:p-8');
    $('[data-close-quote]').hidden = false;
    modal.hidden = false; modalOverlay.hidden = false; modalPanel.classList.add('modal-in');
    DV.lockScroll(); modal.scrollTop = 0;
    setTimeout(() => $('#f-ruc').focus(), 30);
  }
  function closeQuote() {
    if (modal.hidden) return;
    formHome.appendChild(formWrap);
    formWrap.classList.add('form-card'); formWrap.classList.remove('p-6', 'md:p-8');
    $('[data-close-quote]').hidden = true;
    modal.hidden = true; modalOverlay.hidden = true; modalPanel.classList.remove('modal-in');
    DV.unlockScroll();
    if (modalTrigger && modalTrigger.focus) modalTrigger.focus();
  }
  DV.openQuote = openQuote;

  function fillRequirements(force) {
    if (!cotizacion.total()) return;
    const t = cotizacion.texto();
    if (force || !req.value.trim() || req.value === lastAuto) { req.value = t; lastAuto = t; clearErr('f-req'); }
  }
  function actualizarFormLista() { $('#fillFromList').hidden = cotizacion.total() === 0; }

  const ERR_IDS = { 'f-ruc': 'e-ruc', 'f-razon': 'e-razon', 'f-contacto': 'e-contacto', 'f-telefono': 'e-telefono', 'f-correo': 'e-correo',
    'f-tipo': 'e-tipo', 'f-entrega': 'e-entrega', 'f-ciudad': 'e-ciudad', 'f-req': 'e-req', 'f-consent': 'e-consent' };
  function setErr(id, msg) { document.getElementById(id).setAttribute('aria-invalid', 'true'); document.getElementById(ERR_IDS[id]).textContent = msg; }
  function clearErr(id) { document.getElementById(id).removeAttribute('aria-invalid'); document.getElementById(ERR_IDS[id]).textContent = ''; }

  function validate() {
    const v = id => document.getElementById(id).value.trim();
    const errs = [];
    if (!/^(10|15|17|20)\d{9}$/.test(v('f-ruc'))) errs.push(['f-ruc', 'Ingrese un RUC válido de 11 dígitos (inicia en 10, 15, 17 o 20).']);
    if (v('f-razon').length < 3) errs.push(['f-razon', 'Ingrese la razón social de su empresa o institución.']);
    if (v('f-contacto').length < 3) errs.push(['f-contacto', 'Ingrese el nombre de la persona de contacto.']);
    const tel = v('f-telefono').replace(/[^\d]/g, '');
    if (tel.length < 7 || tel.length > 12) errs.push(['f-telefono', 'Ingrese un teléfono válido, por ejemplo 987 654 321.']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('f-correo'))) errs.push(['f-correo', 'Ingrese un correo válido, por ejemplo compras@empresa.com.pe.']);
    if (!v('f-tipo')) errs.push(['f-tipo', 'Seleccione el tipo de institución.']);
    if (!v('f-entrega')) errs.push(['f-entrega', 'Seleccione el lugar de entrega.']);
    if (v('f-entrega') === 'Provincia' && v('f-ciudad').length < 2) errs.push(['f-ciudad', 'Indique la ciudad o departamento de destino.']);
    if (v('f-req').length < 3) errs.push(['f-req', 'Detalle al menos un producto con su cantidad.']);
    if (!$('#f-consent').checked) errs.push(['f-consent', 'Debe aceptar el tratamiento de datos para enviar la solicitud.']);
    Object.keys(ERR_IDS).forEach(clearErr);
    errs.forEach(([id, m]) => setErr(id, m));
    if (errs.length) document.getElementById(errs[0][0]).focus();
    return errs.length === 0;
  }

  function formMessage() {
    const v = id => document.getElementById(id).value.trim();
    const lines = [
      'Hola Dayvilab, solicito una cotización formal:', '',
      '*Razón social:* ' + v('f-razon'),
      '*RUC:* ' + v('f-ruc'),
      '*Contacto:* ' + v('f-contacto') + (v('f-cargo') ? ' (' + v('f-cargo') + ')' : ''),
      '*Teléfono:* ' + v('f-telefono'),
      '*Correo:* ' + v('f-correo'),
      '*Tipo de institución:* ' + v('f-tipo'),
      '*Lugar de entrega:* ' + v('f-entrega') + (v('f-entrega') === 'Provincia' && v('f-ciudad') ? ' – ' + v('f-ciudad') : '')
    ];
    if (v('f-fecha')) lines.push('*Fecha requerida:* ' + v('f-fecha').split('-').reverse().join('/'));
    if (v('f-obs')) lines.push('*Referencia / N.º de proceso:* ' + v('f-obs'));
    lines.push('', '*Requerimientos:*', v('f-req'));
    if (v('f-notas')) lines.push('', '*Observaciones:* ' + v('f-notas'));
    return lines.join('\n');
  }

  function showStatus(kind, html) {
    $('#formStatus').innerHTML = '<div class="notice ' + (kind === 'error' ? 'notice-error' : 'notice-info') + '"><i data-lucide="' +
      (kind === 'error' ? 'alert-circle' : 'info') + '"></i><div>' + html + '</div></div>';
    icons();
  }

  function bindForm() {
    $$('[data-open-quote]').forEach(b => b.addEventListener('click', () => openQuote(b)));
    $('[data-close-quote]').addEventListener('click', closeQuote);
    modalOverlay.addEventListener('click', closeQuote);
    modal.addEventListener('click', e => { if (e.target === modal) closeQuote(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQuote(); });

    $('#fillFromList').addEventListener('click', () => {
      const t = cotizacion.texto();
      req.value = (!req.value.trim() || req.value === lastAuto) ? t : req.value.trimEnd() + '\n' + t;
      lastAuto = req.value; clearErr('f-req'); req.focus();
    });
    $('#f-entrega').addEventListener('change', e => {
      const prov = e.target.value === 'Provincia';
      $('#ciudadWrap').hidden = !prov; $('#f-ciudad').required = prov;
      if (!prov) clearErr('f-ciudad');
    });
    $('#f-ruc').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11); });
    Object.keys(ERR_IDS).forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => clearErr(id));
    });

    $('#formWa').addEventListener('click', e => {
      if (!validate()) { e.preventDefault(); return; }
      e.currentTarget.href = waLink(formMessage());
    });

    form.addEventListener('submit', async e => {
      e.preventDefault(); $('#formStatus').innerHTML = '';
      if (!validate()) return;
      $('#f-subject').value = 'Solicitud de cotización – ' + $('#f-razon').value.trim() + ' – RUC ' + $('#f-ruc').value.trim();
      if (CONFIG.FORMSPREE_ENDPOINT.includes('tu-endpoint')) {
        showStatus('info', '<strong>Formulario pendiente de configuración.</strong> El envío por correo se activará al registrar el endpoint de Formspree en assets/js/comun.js. Mientras tanto, use <strong>Enviar requerimiento por WhatsApp</strong>.');
        return;
      }
      const btn = $('#submitBtn'); btn.disabled = true; btn.querySelector('span').textContent = 'Enviando…';
      try {
        const r = await fetch(CONFIG.FORMSPREE_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        form.reset(); lastAuto = ''; $('#ciudadWrap').hidden = true;
        form.hidden = true; $('#formSuccess').hidden = false; $('#formSuccess').focus();
        cotizacion.vaciar();
      } catch (err) {
        showStatus('error', '<strong>No pudimos enviar su solicitud.</strong> Verifique su conexión e inténtelo nuevamente, o envíe su requerimiento por WhatsApp al <span class="mono">+51 993 007 474</span>.');
      } finally {
        btn.disabled = false; btn.querySelector('span').textContent = 'Enviar solicitud de cotización';
      }
    });
    $('#newRequest').addEventListener('click', () => { $('#formSuccess').hidden = true; form.hidden = false; $('#formStatus').innerHTML = ''; $('#f-ruc').focus(); });
  }

  // index.html#solicitar abre el formulario (se usa desde la ficha técnica).
  function revisarHash() {
    if (location.hash === '#solicitar') {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* noop */ }
      openQuote();
    }
  }

  /* ================= Inicio ================= */
  leerURL();
  renderCategorias();
  renderPills();
  bindCatalogo();
  bindForm();
  bindNavActivo();
  actualizarFormLista();
  cargar();
  revisarHash();
  window.addEventListener('hashchange', revisarHash);
  $$('img[data-web]').forEach(i => { if (i.complete && i.naturalWidth === 0) window.__dvFallback(i); });
})();
