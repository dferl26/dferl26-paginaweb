# Sitio web Dayvilab E.I.R.L.

Catálogo B2B con fichas técnicas, lista de cotización y solicitud formal (Formspree + WhatsApp).
Los productos se cargan desde `productos.json`, así que el catálogo crece sin tocar el HTML.

## Estructura

```
dayvilab-web/
├── index.html              Landing + catálogo paginado (24 por página) + formulario de cotización
├── producto.html           Ficha técnica: producto.html?id=ID_DEL_PRODUCTO
├── productos.json          Catálogo (se genera desde Excel/CSV)
├── assets/
│   ├── css/estilos.css     Estilos propios (además de Tailwind CDN)
│   ├── js/arranque.js      Configuración de Tailwind + respaldo de imágenes
│   ├── js/comun.js         CONFIGURACIÓN, lista de cotización, panel lateral, utilidades
│   ├── js/catalogo.js      Catálogo, filtros, paginación, formulario (solo index.html)
│   ├── js/producto.js      Ficha técnica (solo producto.html)
│   └── img/                Logo, logos de marcas e imágenes de respaldo
└── herramientas/
    ├── excel_a_json.py         Convertidor Excel/CSV → productos.json
    └── plantilla-productos.xlsx Plantilla con datos de ejemplo
```

## Probar en su computadora

Los navegadores no permiten leer `productos.json` abriendo el archivo con doble clic (`file://`).
Use un servidor local:

```bash
cd dayvilab-web
python3 -m http.server 8000
# abra http://localhost:8000
```

En su hosting funciona directamente: suba la carpeta completa.

## Configuración (assets/js/comun.js)

```js
const CONFIG = {
  WA_NUMBER: '51993007474',
  EMAIL: 'dayvilab2@gmail.com',
  FORMSPREE_ENDPOINT: 'https://formspree.io/f/tu-endpoint', // ← reemplace "tu-endpoint"
  PRODUCTOS_URL: 'productos.json',
  STORE_KEY: 'dayvilab-cotizacion-v2',
  POR_PAGINA: 24
};
```

## Actualizar el catálogo (Excel → JSON)

1. Llene `herramientas/plantilla-productos.xlsx` (una vez: `pip install openpyxl`).
   - **productos**: una fila por producto. Obligatorios: `id`, `nombre`, `categoria`.
   - **especificaciones**: `producto_id`, `atributo`, `valor` (una fila por dato técnico, en orden).
   - **presentaciones**: `producto_id`, `codigo`, `descripcion`, `unidad`.
2. Convierta:
   ```bash
   python3 herramientas/excel_a_json.py herramientas/plantilla-productos.xlsx
   ```
   Con CSV exportados desde Excel (acepta `;` o `,`, UTF-8 o Windows-1252):
   ```bash
   python3 herramientas/excel_a_json.py productos.csv \
     --especificaciones especificaciones.csv --presentaciones presentaciones.csv
   ```
3. Suba el nuevo `productos.json` al hosting. Los visitantes verán el cambio al recargar.

El convertidor valida IDs duplicados, categorías inválidas y filas incompletas; si hay errores no genera
el archivo (use `--forzar` para omitir esas filas). `--legible` genera el JSON con sangría.

**Importante:** el `id` forma parte del enlace `producto.html?id=…`. No lo cambie una vez publicado,
o los enlaces compartidos dejarán de funcionar. Use su código interno (sin espacios).

`categoria` acepta: `equipos`, `materiales` (cristalería y plásticos), `reactivos`, `medico`.

## Estructura de productos.json

```json
{
  "version": 1,
  "actualizado": "2026-10-27",
  "total": 1,
  "productos": [
    {
      "id": "DV-RE-0001",
      "codigo": "DV-RE-0001",
      "nombre": "Ácido clorhídrico 37 % p.a.",
      "categoria": "reactivos",
      "subcategoria": "Ácidos",
      "marca": "Merck",
      "modelo": "",
      "resumen": "Texto corto para la tarjeta del catálogo (1–2 líneas).",
      "descripcion": "Texto completo para la ficha técnica.",
      "imagen": "https://images.unsplash.com/photo-...  o  assets/img/productos/DV-RE-0001.jpg",
      "imagenes": ["URL de foto adicional", "..."],
      "etiquetas": ["hcl", "acido muriatico"],
      "destacado": true,
      "especificaciones": {
        "Concentración": "37 %",
        "Grado": "Analítico (p.a.)"
      },
      "presentaciones": [
        { "codigo": "1.00317.1000", "descripcion": "Frasco de vidrio 1 L", "unidad": "Unidad" },
        { "codigo": "1.00317.2500", "descripcion": "Frasco de vidrio 2,5 L", "unidad": "Unidad" }
      ],
      "documentos": [
        { "nombre": "Ficha técnica", "url": "https://..." },
        { "nombre": "Hoja de seguridad (SDS)", "url": "https://..." }
      ]
    }
  ]
}
```

Solo `id`, `nombre` y `categoria` son obligatorios. Los campos vacíos se omiten en la ficha.
Los ejemplos de arriba (códigos, concentración) son ilustrativos.

## Imágenes

- Use URLs (`https://…`) o rutas locales (`assets/img/productos/ID.jpg`).
- Recomendado: 1200 × 1200 px, JPG o WebP de menos de 200 KB, nombrado con el `id`.
- Si una imagen no carga, se muestra automáticamente el ícono de su categoría.

## Rendimiento con miles de productos

- El navegador descarga `productos.json` una vez y solo dibuja 24 tarjetas por página.
  En una prueba local con 2,500 productos, el catálogo estuvo listo en menos de 1 segundo.
- Active la compresión gzip/brotli en su hosting: reduce el JSON entre 80 % y 90 %.
- Filtros, búsqueda y página se guardan en la URL (`index.html?cat=reactivos&marca=Merck&pag=3`),
  así un enlace compartido abre el mismo resultado.

## Datos de ejemplo

`productos.json` y la plantilla contienen 17 productos **de ejemplo** con especificaciones genéricas
y fotos referenciales de Unsplash. Reemplácelos por su catálogo real antes de publicar.
