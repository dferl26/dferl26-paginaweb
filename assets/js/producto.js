/* Dayvilab — producto.js (solo producto.html)
 * Lee ?id= de la URL, busca el producto en productos.json y arma la ficha técnica:
 * galería en alta resolución, datos, especificaciones, presentaciones, documentos y relacionados.
 */
(function () {
  'use strict';
  const DV = window.DV;
  const { $, $$, esc, icons, waLink, imgUrl, photoHTML, catInfo, cotizacion, fmt } = DV;

  const id = new URLSearchParams(location.search).get('id') || '';
  const root = $('#ficha');
  let P = null, fotos = [], fotoActual = 0;

  /* ================= Galería ================= */
  function galeriaHTML(p) {
    const c = catInfo(p.categoria);
    fotos = [p.imagen].concat(p.imagenes || []).filter(Boolean);
    const main = fotos.length ? photoHTML(imgUrl(fotos[0], 1400), { icon: c.icon, alt: p.nombre }) : null;
    const thumbs = fotos.length > 1
      ? '<div class="thumbs mt-3" role="group" aria-label="Fotografías del producto">' + fotos.map((u, i) =>
          '<button type="button" class="thumb" data-foto="' + i + '" aria-label="Ver foto ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : '') + '>' +
          (photoHTML(imgUrl(u, 200), { icon: c.icon }) || '<i data-lucide="' + c.icon + '"></i>') + '</button>').join('') + '</div>'
      : '';
    return (main
      ? '<button type="button" class="gallery-main" id="galleryMain" aria-label="Ampliar imagen de ' + esc(p.nombre) + '">' + main +
        '<span class="zoom-hint"><i data-lucide="zoom-in"></i>Ampliar</span></button>'
      : '<div class="gallery-main is-icon" aria-hidden="true"><i data-lucide="' + c.icon + '"></i></div>') +
      thumbs + '<p class="text-xs text-steel mt-3">Imágenes referenciales. Las características finales se confirman en la cotización.</p>';
  }
  function mostrarFoto(i) {
    fotoActual = i;
    const btn = $('#galleryMain'); if (!btn) return;
    const c = catInfo(P.categoria);
    const img = photoHTML(imgUrl(fotos[i], 1400), { icon: c.icon, alt: P.nombre });
    btn.classList.remove('is-icon');
    btn.innerHTML = (img || '<i data-lucide="' + c.icon + '"></i>') + (img ? '<span class="zoom-hint"><i data-lucide="zoom-in"></i>Ampliar</span>' : '');
    if (!img) btn.classList.add('is-icon');
    $$('.thumb').forEach(t => t.setAttribute('aria-current', String(+t.dataset.foto === i)));
    icons();
  }

  /* ================= Visor en alta resolución ================= */
  let lbReturn = null;
  function abrirVisor() {
    const btn = $('#galleryMain');
    if (!btn || btn.classList.contains('is-icon')) return;
    const img = btn.querySelector('img');
    if (!img) return;
    lbReturn = btn;
    const lb = $('#lightbox');
    $('#lightboxImg').src = img.classList.contains('is-fallback') ? img.src : imgUrl(fotos[fotoActual], 2400);
    $('#lightboxImg').alt = P.nombre;
    lb.hidden = false; DV.lockScroll();
    $('#lightboxClose').focus();
  }
  function cerrarVisor() {
    const lb = $('#lightbox'); if (lb.hidden) return;
    lb.hidden = true; DV.unlockScroll();
    if (lbReturn) lbReturn.focus();
  }

  /* ================= Mensaje de WhatsApp ================= */
  function presentacionSeleccionada() {
    const sel = $('#presSelect');
    if (!sel || sel.value === '') return null;
    return P.presentaciones[+sel.value];
  }
  function cantidad() { return Math.max(1, parseInt($('#qtyInput').value, 10) || 1); }
  function mensajeWa() {
    const pr = presentacionSeleccionada();
    return 'Hola Dayvilab, deseo solicitar una cotización técnica para:\n' +
      '*Producto:* ' + P.nombre + (P.marca ? ' – ' + P.marca : '') + '\n' +
      (P.codigo ? '*Código:* ' + P.codigo + '\n' : '') +
      (pr ? '*Presentación:* ' + pr.descripcion + (pr.codigo ? ' (Cód. ' + pr.codigo + ')' : '') + '\n' : '') +
      '*Cantidad:* ' + cantidad() + (pr && pr.unidad ? ' ' + pr.unidad.toLowerCase() : '') + '\n' +
      '*Ficha:* ' + location.href + '\n\nEmpresa: \nRUC: ';
  }
  function actualizarWa() { const a = $('#fichaWa'); if (a) a.href = waLink(mensajeWa()); }

  /* ================= Ficha ================= */
  function filaMeta(label, valor, mono) {
    return valor ? '<div class="meta-row"><dt>' + label + '</dt><dd' + (mono ? ' class="mono"' : '') + '>' + esc(valor) + '</dd></div>' : '';
  }

  function render(p, data) {
    P = p;
    const c = catInfo(p.categoria);
    const pres = p.presentaciones || [];
    const esp = p.especificaciones ? Object.entries(p.especificaciones) : [];
    const docs = p.documentos || [];
    const hayCodigos = pres.some(x => x.codigo);
    const catUrl = 'index.html?cat=' + encodeURIComponent(p.categoria) + '#catalogo';

    document.title = p.nombre + (p.marca ? ' – ' + p.marca : '') + ' | Dayvilab E.I.R.L.';
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', (p.resumen || p.nombre) + ' Cotización formal con factura electrónica. Envíos a Lima y provincias.');
    $('#crumbs').innerHTML = '<a href="index.html">Inicio</a><i data-lucide="chevron-right"></i>' +
      '<a href="' + catUrl + '">' + esc(c.label) + '</a><i data-lucide="chevron-right"></i>' +
      '<span aria-current="page" class="clamp-2">' + esc(p.nombre) + '</span>';

    root.innerHTML =
      '<div class="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">' +
        '<div class="min-w-0 lg:sticky lg:top-28">' + galeriaHTML(p) + '</div>' +
        '<div class="min-w-0">' +
          '<div class="flex flex-wrap gap-2"><span class="badge"><i data-lucide="' + c.icon + '" class="w-3.5 h-3.5"></i>' + esc(c.short) + '</span>' +
            (p.subcategoria ? '<span class="sub-badge">' + esc(p.subcategoria) + '</span>' : '') + '</div>' +
          '<h1 class="mt-4 font-extrabold leading-[1.15]" style="font-size:clamp(1.7rem,3.2vw,2.5rem)">' + esc(p.nombre) + '</h1>' +
          (p.resumen ? '<p class="mt-4 text-[17px] text-steel max-w-[60ch]">' + esc(p.resumen) + '</p>' : '') +
          '<dl class="mt-6">' + filaMeta('Marca', p.marca) + filaMeta('Modelo', p.modelo) + filaMeta('Código', p.codigo, true) +
            filaMeta('Categoría', c.label) + '</dl>' +

          '<div class="mt-8 rounded-2xl border border-line p-5 bg-surface">' +
            (pres.length
              ? '<div class="field mb-4"><label for="presSelect">Presentación</label><select id="presSelect" class="select w-full">' +
                  (pres.length > 1 ? '<option value="">Seleccione una presentación…</option>' : '') +
                  pres.map((x, i) => '<option value="' + i + '"' + (pres.length === 1 ? ' selected' : '') + '>' + esc(x.descripcion) +
                    (x.unidad ? ' · ' + esc(x.unidad) : '') + (x.codigo ? ' · Cód. ' + esc(x.codigo) : '') + '</option>').join('') +
                '</select></div>'
              : '') +
            '<div class="flex flex-col sm:flex-row gap-3">' +
              '<div class="field flex-none"><label for="qtyInput" class="sr-only">Cantidad</label>' +
                '<span class="qty !h-[46px]" role="group" aria-label="Cantidad">' +
                  '<button type="button" class="!h-[46px] !w-[42px]" data-qstep="-1" aria-label="Disminuir"><i data-lucide="minus"></i></button>' +
                  '<input id="qtyInput" type="number" min="1" value="1" class="!h-[46px] !w-[64px]">' +
                  '<button type="button" class="!h-[46px] !w-[42px]" data-qstep="1" aria-label="Aumentar"><i data-lucide="plus"></i></button>' +
                '</span></div>' +
              '<button type="button" class="btn btn-primary flex-1" id="fichaAdd"><i data-lucide="clipboard-plus" class="w-[18px] h-[18px]"></i>Añadir a cotización</button>' +
            '</div>' +
            '<p class="err mt-2" id="presErr"></p>' +
            '<a href="#" id="fichaWa" target="_blank" rel="noopener" class="btn btn-wa w-full mt-3"><span class="wa-glyph"></span>Consultar por WhatsApp</a>' +
            '<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">' +
              '<button type="button" class="font-semibold text-brand hover:text-brand-dark inline-flex items-center gap-1.5" data-open-drawer><i data-lucide="clipboard-list" class="w-4 h-4"></i>Ver mi lista (<span data-cart-count-inline>' + cotizacion.total() + '</span>)</button>' +
              '<a href="index.html#solicitar" class="font-semibold text-ink2 hover:text-brand inline-flex items-center gap-1.5">Solicitar cotización formal<i data-lucide="arrow-right" class="w-4 h-4"></i></a>' +
            '</div>' +
          '</div>' +

          '<ul class="mt-6 grid sm:grid-cols-3 gap-3 text-sm">' +
            '<li class="flex items-center gap-2"><i data-lucide="receipt" class="w-[18px] h-[18px] text-clinic flex-none"></i>Factura electrónica</li>' +
            '<li class="flex items-center gap-2"><i data-lucide="truck" class="w-[18px] h-[18px] text-clinic flex-none"></i>Lima y provincias</li>' +
            '<li class="flex items-center gap-2"><i data-lucide="shield-check" class="w-[18px] h-[18px] text-clinic flex-none"></i>Documentación técnica</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +

      '<div class="mt-16 grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-10 lg:gap-14 items-start">' +
        '<div class="space-y-12 min-w-0">' +
          (p.descripcion ? '<section aria-labelledby="t-desc"><h2 class="section-title" id="t-desc"><i data-lucide="file-text"></i>Descripción</h2>' +
            '<p class="mt-4 text-[16px] leading-relaxed max-w-[70ch]">' + esc(p.descripcion) + '</p></section>' : '') +
          (esp.length ? '<section aria-labelledby="t-esp"><h2 class="section-title" id="t-esp"><i data-lucide="list-checks"></i>Especificaciones técnicas</h2>' +
            '<div class="spec-wrap mt-4"><table class="spec-table"><tbody>' +
              esp.map(([k, v]) => '<tr><th scope="row">' + esc(k) + '</th><td>' + esc(v) + '</td></tr>').join('') +
            '</tbody></table></div></section>' : '') +
          (pres.length ? '<section aria-labelledby="t-pres"><h2 class="section-title" id="t-pres"><i data-lucide="package"></i>Presentaciones</h2>' +
            '<div class="table-wrap mt-4"><table class="pres-table"><thead><tr>' +
              (hayCodigos ? '<th scope="col">Código</th>' : '') + '<th scope="col">Presentación</th><th scope="col">Unidad de venta</th><th scope="col"><span class="sr-only">Acción</span></th>' +
            '</tr></thead><tbody>' +
              pres.map((x, i) => '<tr>' + (hayCodigos ? '<td class="num">' + esc(x.codigo || '—') + '</td>' : '') +
                '<td>' + esc(x.descripcion) + '</td><td>' + esc(x.unidad || '—') + '</td>' +
                '<td class="text-right"><button type="button" class="btn btn-outline btn-sm whitespace-nowrap" data-add-pres="' + i + '"><i data-lucide="plus" class="w-4 h-4"></i>Añadir</button></td></tr>').join('') +
            '</tbody></table></div></section>' : '') +
        '</div>' +
        '<aside class="space-y-6 min-w-0">' +
          (docs.length ? '<section aria-labelledby="t-docs"><h2 class="section-title" id="t-docs"><i data-lucide="file-down"></i>Documentos</h2><div class="mt-4 space-y-2.5">' +
            docs.map(d => '<a class="doc-link" href="' + esc(d.url) + '" target="_blank" rel="noopener"><i data-lucide="file-text" class="w-5 h-5 text-clinic flex-none"></i><span class="flex-1">' +
              esc(d.nombre || 'Documento') + '</span><i data-lucide="external-link" class="w-4 h-4 text-steel"></i></a>').join('') + '</div></section>' : '') +
          '<div class="rounded-2xl bg-ink text-slate-200 p-6">' +
            '<p class="text-white font-bold text-lg">¿Necesita asesoría técnica?</p>' +
            '<p class="text-sm mt-2">Le ayudamos a elegir la presentación y el modelo adecuados para su aplicación, licitación u orden de compra.</p>' +
            '<a href="#" data-wa="general" target="_blank" rel="noopener" class="btn btn-wa btn-sm mt-5"><span class="wa-glyph"></span>Hablar con un asesor</a>' +
            '<p class="text-xs text-slate-400 mt-4">Lun. a sáb., 9:00 a.m. – 7:00 p.m. · <span class="mono">+51 993 007 474</span></p>' +
          '</div>' +
        '</aside>' +
      '</div>';
    root.setAttribute('aria-busy', 'false');

    relacionados(p, data, catUrl);
    jsonLd(p);
    bindFicha();
    actualizarWa();
    DV.fillWaGlyphs(root);
    $$('[data-wa="general"]', root).forEach(a => { a.href = waLink(DV.WA_GENERAL); });
    icons();
  }

  function bindFicha() {
    const btn = $('#galleryMain');
    if (btn) btn.addEventListener('click', abrirVisor);
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-foto]'); if (t) mostrarFoto(+t.dataset.foto);
      const q = e.target.closest('[data-qstep]');
      if (q) { $('#qtyInput').value = Math.max(1, cantidad() + (+q.dataset.qstep)); actualizarWa(); }
      const ap = e.target.closest('[data-add-pres]');
      if (ap) {
        const x = P.presentaciones[+ap.dataset.addPres];
        cotizacion.agregar(P, { presentacion: x.descripcion + (x.unidad ? ' (' + x.unidad + ')' : ''), codigo: x.codigo });
      }
    });
    $('#qtyInput').addEventListener('input', actualizarWa);
    const sel = $('#presSelect');
    if (sel) sel.addEventListener('change', () => { $('#presErr').textContent = ''; sel.removeAttribute('aria-invalid'); actualizarWa(); });
    $('#fichaAdd').addEventListener('click', () => {
      const pres = P.presentaciones || [];
      const pr = presentacionSeleccionada();
      if (pres.length > 1 && !pr) {
        $('#presErr').textContent = 'Seleccione una presentación para añadirla a su lista.';
        sel.setAttribute('aria-invalid', 'true'); sel.focus();
        return;
      }
      cotizacion.agregar(P, {
        presentacion: pr ? pr.descripcion + (pr.unidad ? ' (' + pr.unidad + ')' : '') : '',
        codigo: pr ? pr.codigo : '', cantidad: cantidad()
      });
    });
  }

  function relacionados(p, data, catUrl) {
    const misma = data.productos.filter(x => x.categoria === p.categoria && x.id !== p.id);
    misma.sort((a, b) => ((b.subcategoria === p.subcategoria) - (a.subcategoria === p.subcategoria)) ||
      ((b.marca && b.marca === p.marca) - (a.marca && a.marca === p.marca)) || (a._i - b._i));
    const lista = misma.slice(0, 4);
    if (!lista.length) return;
    $('#relacionados').innerHTML = lista.map(DV.tarjeta).join('');
    $('#verCategoria').href = catUrl;
    $('#verCategoria').firstChild.textContent = 'Ver ' + fmt(misma.length + 1) + ' productos de ' + catInfo(p.categoria).short + ' ';
    $('#relacionadosWrap').hidden = false;
  }

  // Datos estructurados para buscadores (Google: rich results de producto).
  function jsonLd(p) {
    const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.nombre, sku: p.codigo || p.id,
      category: catInfo(p.categoria).label, url: location.href };
    if (p.resumen || p.descripcion) ld.description = p.descripcion || p.resumen;
    if (p.marca) ld.brand = { '@type': 'Brand', name: p.marca };
    if (fotos.length) ld.image = fotos.map(u => imgUrl(u, 1200));
    const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  function noEncontrado(msg) {
    document.title = 'Producto no encontrado | Dayvilab E.I.R.L.';
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = '<div class="max-w-xl mx-auto text-center py-16">' +
      '<span class="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-surface text-steel"><i data-lucide="package-search" class="w-8 h-8"></i></span>' +
      '<h1 class="mt-6 text-2xl font-extrabold">' + msg + '</h1>' +
      '<p class="mt-3 text-steel">Puede buscarlo en el catálogo o escribirnos: le confirmamos disponibilidad y le enviamos la ficha técnica.</p>' +
      '<div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">' +
        '<a href="index.html#catalogo" class="btn btn-primary">Ir al catálogo</a>' +
        '<a href="#" data-wa="general" target="_blank" rel="noopener" class="btn btn-wa"><span class="wa-glyph"></span>Consultar por WhatsApp</a>' +
      '</div></div>';
    DV.fillWaGlyphs(root);
    $$('[data-wa="general"]', root).forEach(a => { a.href = waLink(DV.WA_GENERAL); });
    icons();
  }

  /* ================= Inicio ================= */
  $('#lightboxClose').addEventListener('click', cerrarVisor);
  $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') cerrarVisor(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarVisor();
    if (!$('#lightbox').hidden && fotos.length > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      mostrarFoto((fotoActual + (e.key === 'ArrowRight' ? 1 : fotos.length - 1)) % fotos.length);
      $('#lightboxImg').src = imgUrl(fotos[fotoActual], 2400);
    }
  });

  if (!id) { noEncontrado('No se indicó ningún producto'); return; }
  DV.cargarProductos().then(data => {
    const p = data.porId.get(id);
    if (p) render(p, data); else noEncontrado('No encontramos el producto «' + esc(id) + '»');
  }).catch(err => {
    console.error('No se pudo cargar productos.json:', err);
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = '<div class="notice notice-error max-w-2xl"><i data-lucide="alert-circle"></i><div><strong>No se pudo cargar la ficha técnica.</strong> ' +
      (location.protocol === 'file:'
        ? 'El navegador no permite leer productos.json desde un archivo local. Abra el sitio desde su hosting o con un servidor local (por ejemplo: python3 -m http.server).'
        : 'Verifique su conexión y recargue la página.') + '</div></div>';
    icons();
  });
})();
