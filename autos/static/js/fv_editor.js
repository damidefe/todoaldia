// ══════════════════════════════════════════════
// FV EDITOR — Motor de dibujo canvas
// Todo @l Día
// v2.0 — 6 layouts STORY + 6 layouts POST
//
// Depende de fv_state.js (objeto FV, fvGetDims)
// ══════════════════════════════════════════════


// ══════════════════════════════════════════════
// HELPERS INTERNOS
// Funciones pequeñas que usan varios layouts.
// Al centralizarlas acá evitamos repetir código.
// ══════════════════════════════════════════════

// Devuelve el color de acento activo.
// Siempre leemos de FV.acento en lugar de
// hardcodear '#E31E24' en cada función.
function fvGetAccent() {
    return FV.acento || '#E31E24';
}

// Lee los textos actuales de los inputs del panel.
// Centralizar esto evita repetir getElementById
// en cada función de dibujo.
function fvGetTextos() {
    return {
        titulo:  (document.getElementById('fv-titulo').value   || 'MARCA MODELO AÑO').toUpperCase(),
        badge:   (document.getElementById('fv-badge').value    || 'NUEVO INGRESO').toUpperCase(),
        bullet1:  document.getElementById('fv-bullet-1').value || '• Característica 1',
        bullet2:  document.getElementById('fv-bullet-2').value || '• Característica 2',
        bullet3:  document.getElementById('fv-bullet-3').value || '• Característica 3',
    };
}

// Dibuja una imagen dentro de un rectángulo clipeado.
// Usamos ctx.save/restore para que el clip no afecte
// al resto del canvas. Esto es clave para los layouts
// de 2 fotos donde cada foto tiene su propia zona.
function fvDrawFoto(ctx, img, offsetX, offsetY, zoom, x, y, w, h) {
    if (!img) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const scale = Math.max(w / img.width, h / img.height) * zoom;
    const sw = img.width  * scale;
    const sh = img.height * scale;
    const sx = x + (w - sw) / 2 + offsetX;
    const sy = y + (h - sh) / 2 + offsetY;
    ctx.drawImage(img, sx, sy, sw, sh);
    ctx.restore();
}

// Dibuja el branding "TODO @L DÍA / AUTOS SELECCIONADOS".
// align puede ser 'center', 'left' o 'right'.
function fvDrawBranding(ctx, x, y, fontSize, align) {
    ctx.textAlign = align || 'center';
    ctx.font = `900 ${fontSize}px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText('TODO @L DÍA', x, y);
    ctx.font = `500 ${Math.round(fontSize * 0.55)}px Montserrat, sans-serif`;
    ctx.fillStyle = '#777';
    ctx.fillText('AUTOS SELECCIONADOS', x, y + Math.round(fontSize * 0.8));
}

// Dibuja el badge (rectángulo redondeado con texto).
// Solo se llama si FV.badgeVisible === true.
function fvDrawBadge(ctx, texto, x, y, fontSize) {
    if (!FV.badgeVisible) return;
    const acento = fvGetAccent();
    ctx.font = `900 ${fontSize}px Montserrat, sans-serif`;
    const tw  = ctx.measureText(texto).width;
    const pad = 28;
    const ph  = fontSize + 18;
    ctx.fillStyle = acento;
    ctx.beginPath();
    ctx.roundRect(x, y - ph + 4, tw + pad, ph, 7);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(texto, x + pad / 2, y);
}

// Dibuja los 3 bullets con punto de acento.
// lineH es el espacio entre líneas en píxeles.
function fvDrawBullets(ctx, b1, b2, b3, x, y, fontSize, lineH) {
    const acento = fvGetAccent();
    const lh = lineH || Math.round(fontSize * 1.6);
    [b1, b2, b3].forEach((txt, i) => {
        if (!txt) return;
        const cy = y + i * lh;
        ctx.beginPath();
        ctx.arc(x, cy - Math.round(fontSize * 0.28), Math.round(fontSize * 0.18), 0, Math.PI * 2);
        ctx.fillStyle = acento;
        ctx.fill();
        ctx.font = `700 ${fontSize}px Montserrat, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(txt, x + Math.round(fontSize * 0.5), cy);
    });
}

// Dibuja la barra de degradado oscuro bottom.
// Es el overlay que oscurece la parte inferior
// de la foto para que el texto sea legible.
function fvDrawOverlayBottom(ctx, W, H, desde) {
    const grad = ctx.createLinearGradient(0, H * desde, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.93)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

// Dibuja overlay oscuro en la parte superior.
function fvDrawOverlayTop(ctx, W, H, hasta) {
    const grad = ctx.createLinearGradient(0, 0, 0, H * hasta);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

// Lee los valores de los sliders de posición Y.
// Devuelve coordenadas en píxeles del canvas.
function fvGetSliders(H) {
    return {
        tituloY:   parseFloat(document.getElementById('fv-titulo-y').value)   / 100 * H,
        bulletsY:  parseFloat(document.getElementById('fv-bullets-y').value)  / 100 * H,
        brandingY: parseFloat(document.getElementById('fv-branding-y').value) / 100 * H,
    };
}


// ══════════════════════════════════════════════
// DRAW PRINCIPAL
// Punto de entrada — decide qué función llamar
// según el modo y layout activos.
// ══════════════════════════════════════════════

function fvDraw() {
    if (!FV.canvas) return;
    const ctx = FV.ctx;
    const W = FV.W, H = FV.H;

    // Limpiar canvas y fondo base
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, W, H);

    const isPost      = FV.modo === 'post-principal' || FV.modo === 'post-logo';
    const esPrincipal = FV.modo === 'story-principal' || FV.modo === 'post-principal';

    if (!esPrincipal) {
        fvDrawSoloLogo(ctx, W, H);
        return;
    }

    // Llamar al layout correcto
    const layout = FV.layout || 1;
    if (isPost) {
        const fnPost = [null, fvDrawP1, fvDrawP2, fvDrawP3, fvDrawP4, fvDrawP5, fvDrawP6][layout];
        if (fnPost) fnPost(ctx, W, H);
    } else {
        const fnStory = [null, fvDrawS1, fvDrawS2, fvDrawS3, fvDrawS4, fvDrawS5, fvDrawS6][layout];
        if (fnStory) fnStory(ctx, W, H);
    }

    // Siempre dibujar los elementos arrastrables encima
    fvDrawElementosEditables(ctx);
}

// Dibuja el rectángulo de selección azul sobre el
// elemento que el usuario tiene seleccionado.
function fvDrawElementosEditables(ctx) {
    if (!FV.elSeleccionado) return;
    const el = FV.elSeleccionado;
    ctx.font = `${el.bold ? '900' : '500'} ${el.fontSize}px Montserrat, sans-serif`;
    const tw = ctx.measureText(el.texto).width;
    ctx.strokeStyle = '#1a8fe3';
    ctx.lineWidth   = 3;
    const x0 = el.esBranding ? el.x - tw / 2 - 10 : el.x - 10;
    ctx.strokeRect(x0, el.y - el.fontSize - 4, tw + 20, el.fontSize + 16);
}


// ══════════════════════════════════════════════
// MODO SOLO LOGO
// ══════════════════════════════════════════════

function fvDrawSoloLogo(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(0, 0, W, H);
    const logoEl = FV.elementos.find(e => e.id === 'logo');
    if (logoEl) fvDrawBranding(ctx, logoEl.x, logoEl.y, logoEl.fontSize, 'center');
}


// ══════════════════════════════════════════════
// STORY LAYOUTS (1080 × 1920)
// ══════════════════════════════════════════════

// ── S1: Foto full + overlay + título + bullets + logo ──
// El layout más clásico. Foto ocupa todo el canvas,
// overlay oscuro abajo, textos sobre el overlay.
function fvDrawS1(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const sl   = fvGetSliders(H);
    const ac   = fvGetAccent();

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    fvDrawOverlayTop(ctx, W, H, 0.25);
    fvDrawOverlayBottom(ctx, W, H, 0.45);

    // Línea vertical de acento a la izquierda de los bullets
    ctx.fillStyle = ac;
    ctx.fillRect(W * 0.05, sl.bulletsY - 130, 7, 220);

    // Título
    ctx.font      = `900 72px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(t.titulo, W * 0.07, sl.tituloY);

    // Badge
    fvDrawBadge(ctx, t.badge, W * 0.07, sl.bulletsY - 80, 30);

    // Bullets
    fvDrawBullets(ctx, t.bullet1, t.bullet2, t.bullet3, W * 0.08, sl.bulletsY, 34, 60);

    // Branding
    fvDrawBranding(ctx, W * 0.5, sl.brandingY, 38, 'center');
}

// ── S2: 2 fotos + banda central con título ──
// Foto 1 ocupa la mitad superior, foto 2 la inferior.
// En el medio una banda negra con el nombre del auto.
function fvDrawS2(ctx, W, H) {
    const zoom1 = parseFloat(document.getElementById('fv-zoom').value);
    const zoom2 = parseFloat(document.getElementById('fv-zoom2').value || '1');
    const t     = fvGetTextos();
    const ac    = fvGetAccent();

    const midY  = H * 0.47;
    const bandH = H * 0.1;

    // Foto 1 — zona superior
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom1, 0, 0, W, midY);

    // Foto 2 — zona inferior
    fvDrawFoto(ctx, FV.img2, FV.img2OffsetX, FV.img2OffsetY, zoom2, 0, midY + bandH, W, H - midY - bandH);

    // Banda negra central
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, midY, W, bandH);

    // Líneas de acento arriba y abajo de la banda
    ctx.fillStyle = ac;
    ctx.fillRect(0, midY, W, 6);
    ctx.fillRect(0, midY + bandH - 6, W, 6);

    // Título centrado en la banda
    ctx.font      = `900 58px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(t.titulo, W * 0.5, midY + bandH * 0.55);

    // Badge centrado debajo del título
    if (FV.badgeVisible) {
        ctx.font = `900 26px Montserrat, sans-serif`;
        const tw = ctx.measureText(t.badge).width;
        ctx.fillStyle = ac;
        ctx.beginPath();
        ctx.roundRect(W * 0.5 - tw / 2 - 14, midY + bandH * 0.62, tw + 28, 38, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(t.badge, W * 0.5, midY + bandH * 0.84);
    }

    // Branding en el fondo inferior
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, H - 80, W, 80);
    fvDrawBranding(ctx, W * 0.5, H - 36, 30, 'center');
}

// ── S3: Foto grande + franja diagonal roja + info ──
// La foto ocupa el 62% superior. Una franja roja en
// diagonal separa la foto del bloque de información.
function fvDrawS3(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const ac   = fvGetAccent();
    const sl   = fvGetSliders(H);

    const fotoH = H * 0.62;

    // Foto superior
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, fotoH);

    // Fondo negro inferior
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, fotoH, W, H - fotoH);

    // Franja diagonal — usamos un polígono (beginPath + lineTo)
    // para crear el efecto de corte en diagonal
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.moveTo(0,  fotoH - 30);
    ctx.lineTo(W,  fotoH + 10);
    ctx.lineTo(W,  fotoH + 50);
    ctx.lineTo(0,  fotoH + 10);
    ctx.closePath();
    ctx.fill();

    // Nombre del auto
    ctx.font      = `900 80px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(t.titulo, W * 0.05, fotoH + 120);

    // Specs en chips (usando los bullets como specs)
    const specs = [t.bullet1, t.bullet2, t.bullet3].filter(Boolean);
    let chipX = W * 0.05;
    const chipY = fotoH + 170;
    ctx.font = `700 24px Montserrat, sans-serif`;
    specs.forEach(spec => {
        const tw = ctx.measureText(spec).width;
        const cw = tw + 28;
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        ctx.roundRect(chipX, chipY, cw, 40, 4);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.fillStyle   = '#ccc';
        ctx.textAlign   = 'left';
        ctx.fillText(spec, chipX + 14, chipY + 27);
        chipX += cw + 12;
    });

    // Badge
    fvDrawBadge(ctx, t.badge, W * 0.05, fotoH + 260, 30);

    // Branding
    fvDrawBranding(ctx, W * 0.5, sl.brandingY, 36, 'center');
}

// ── S4: Foto con overlay oscuro + título tipográfico grande ──
// La foto es solo textura de fondo muy oscura.
// El protagonista es el tipográfico enorme.
function fvDrawS4(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const ac   = fvGetAccent();
    const sl   = fvGetSliders(H);

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);

    // Overlay muy oscuro — la foto es casi textura
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, H);

    // Eyebrow (texto pequeño sobre el título)
    ctx.font      = `700 28px Montserrat, sans-serif`;
    ctx.fillStyle = ac;
    ctx.textAlign = 'left';
    ctx.fillText('NUEVO INGRESO', W * 0.05, sl.bulletsY - 280);

    // Título partido en líneas — cada palabra en una línea
    // para lograr el efecto tipográfico editorial grande
    const palabras = t.titulo.split(' ');
    ctx.font      = `900 130px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    palabras.forEach((p, i) => {
        // La última palabra en color acento
        ctx.fillStyle = i === palabras.length - 1 ? ac : '#fff';
        ctx.fillText(p, W * 0.05, sl.bulletsY - 180 + i * 140);
    });

    // Línea divisoria
    ctx.fillStyle = ac;
    ctx.fillRect(W * 0.05, sl.bulletsY - 10, 80, 6);

    // Bullets debajo
    fvDrawBullets(ctx, t.bullet1, t.bullet2, t.bullet3, W * 0.07, sl.bulletsY + 40, 32, 58);

    // Branding
    fvDrawBranding(ctx, W * 0.5, sl.brandingY, 36, 'center');
}

// ── S5: Foto con marco de acento + datos en esquinas ──
// Un marco del color de acento rodea toda la imagen.
// Los datos aparecen en las esquinas como si fuera
// una ficha técnica.
function fvDrawS5(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const ac   = fvGetAccent();

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);

    // Overlay suave
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, 0, W, H);

    // Marco de acento (4 rectángulos, uno por lado)
    const margen = 28;
    const grosor = 6;
    ctx.fillStyle = ac;
    ctx.fillRect(margen, margen, W - margen * 2, grosor);           // top
    ctx.fillRect(margen, H - margen - grosor, W - margen * 2, grosor); // bottom
    ctx.fillRect(margen, margen, grosor, H - margen * 2);           // left
    ctx.fillRect(W - margen - grosor, margen, grosor, H - margen * 2); // right

    // Esquina superior izquierda — modelo
    ctx.font      = `700 22px Montserrat, sans-serif`;
    ctx.fillStyle = ac;
    ctx.textAlign = 'left';
    ctx.fillText('MODELO', margen + 20, margen + 44);
    ctx.font      = `900 48px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(t.titulo.split(' ')[1] || t.titulo, margen + 20, margen + 94);

    // Esquina superior derecha — año
    const anio = t.titulo.split(' ').pop();
    ctx.font      = `700 22px Montserrat, sans-serif`;
    ctx.fillStyle = ac;
    ctx.textAlign = 'right';
    ctx.fillText('AÑO', W - margen - 20, margen + 44);
    ctx.font      = `900 48px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(anio, W - margen - 20, margen + 94);

    // Centro — nombre completo
    ctx.font      = `900 72px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(t.titulo, W * 0.5, H * 0.5);
    ctx.font      = `700 30px Montserrat, sans-serif`;
    ctx.fillStyle = ac;
    ctx.fillText(t.bullet1, W * 0.5, H * 0.5 + 56);

    // Badge
    fvDrawBadge(ctx, t.badge, margen + 20, H - margen - 60, 28);

    // Branding esquina inferior derecha
    ctx.font      = `900 28px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText('TODO @L DÍA', W - margen - 20, H - margen - 44);
    ctx.font      = `500 18px Montserrat, sans-serif`;
    ctx.fillStyle = '#777';
    ctx.fillText('AUTOS SELECCIONADOS', W - margen - 20, H - margen - 18);
}

// ── S6: Foto grande + tira de chips abajo ──
// La foto ocupa casi todo el canvas.
// Una tira oscura abajo muestra los specs como chips.
// Ideal para fotos que se quieren mostrar sin mucho texto.
function fvDrawS6(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const ac   = fvGetAccent();

    const stripH = 120;

    // Foto — deja espacio para la tira abajo
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H - stripH);

    // Overlay en la zona inferior de la foto
    const grad = ctx.createLinearGradient(0, H - stripH - 100, 0, H - stripH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - stripH - 100, W, 100);

    // Nombre del auto sobre la foto
    ctx.font      = `900 68px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(t.titulo, W * 0.05, H - stripH - 24);

    // Tira oscura inferior
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, H - stripH, W, stripH);

    // Línea de acento arriba de la tira
    ctx.fillStyle = ac;
    ctx.fillRect(0, H - stripH, W, 5);

    // Chips de specs en la tira
    const specs = [t.bullet1, t.bullet2, t.bullet3].filter(Boolean);
    let chipX   = W * 0.04;
    const chipY = H - stripH + 20;
    ctx.font = `700 24px Montserrat, sans-serif`;
    specs.forEach(spec => {
        const tw = ctx.measureText(spec).width;
        const cw = tw + 28;
        ctx.fillStyle   = '#1a1a1a';
        ctx.strokeStyle = '#2e2e2e';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(chipX, chipY, cw, 44, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#bbb';
        ctx.textAlign = 'left';
        ctx.fillText(spec, chipX + 14, chipY + 29);
        chipX += cw + 14;
    });

    // Branding en la tira
    fvDrawBranding(ctx, W * 0.5, H - 22, 28, 'center');
}


// ══════════════════════════════════════════════
// POST LAYOUTS (1080 × 1350)
// La lógica es idéntica a STORY pero las
// proporciones cambian porque el canvas es más
// ancho y menos alto. 4:5 vs 9:16.
// ══════════════════════════════════════════════

// ── P1: Full foto + overlay + bullets + logo ──
function fvDrawP1(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const sl   = fvGetSliders(H);
    const ac   = fvGetAccent();

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    fvDrawOverlayTop(ctx, W, H, 0.3);
    fvDrawOverlayBottom(ctx, W, H, 0.5);

    // Título arriba izquierda
    ctx.font      = `900 68px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(t.titulo, W * 0.05, sl.tituloY);

    // Línea vertical acento
    ctx.fillStyle = ac;
    ctx.fillRect(W * 0.05, sl.bulletsY - 110, 7, 190);

    // Badge
    fvDrawBadge(ctx, t.badge, W * 0.07, sl.bulletsY - 70, 28);

    // Bullets
    fvDrawBullets(ctx, t.bullet1, t.bullet2, t.bullet3, W * 0.08, sl.bulletsY, 32, 55);

    // Branding
    fvDrawBranding(ctx, W * 0.5, sl.brandingY, 34, 'center');
}

// ── P2: 2 fotos lado a lado + banda inferior ──
function fvDrawP2(ctx, W, H) {
    const zoom1 = parseFloat(document.getElementById('fv-zoom').value);
    const zoom2 = parseFloat(document.getElementById('fv-zoom2').value || '1');
    const t     = fvGetTextos();
    const ac    = fvGetAccent();

    const fotoH = H * 0.75;
    const bandH = H - fotoH;

    // Foto 1 izquierda
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom1, 0, 0, W / 2 - 3, fotoH);

    // Foto 2 derecha
    fvDrawFoto(ctx, FV.img2, FV.img2OffsetX, FV.img2OffsetY, zoom2, W / 2 + 3, 0, W / 2 - 3, fotoH);

    // Línea vertical de acento entre las dos fotos
    ctx.fillStyle = ac;
    ctx.fillRect(W / 2 - 3, 0, 6, fotoH);

    // Banda inferior negra
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, fotoH, W, bandH);

    // Línea de acento arriba de la banda
    ctx.fillStyle = ac;
    ctx.fillRect(0, fotoH, W, 5);

    // Nombre centrado en la banda
    ctx.font      = `900 64px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(t.titulo, W * 0.5, fotoH + bandH * 0.5);

    // Badge centrado
    if (FV.badgeVisible) {
        ctx.font = `900 24px Montserrat, sans-serif`;
        const tw = ctx.measureText(t.badge).width;
        ctx.fillStyle = ac;
        ctx.beginPath();
        ctx.roundRect(W * 0.5 - tw / 2 - 14, fotoH + bandH * 0.6, tw + 28, 36, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(t.badge, W * 0.5, fotoH + bandH * 0.8);
    }
}

// ── P3: Foto superior + franja negra inferior con datos ──
function fvDrawP3(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const ac   = fvGetAccent();

    const fotoH = H * 0.62;

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, fotoH);

    // Fondo inferior
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, fotoH, W, H - fotoH);

    // Línea roja separadora
    ctx.fillStyle = ac;
    ctx.fillRect(W * 0.05, fotoH + 30, 70, 7);

    // Nombre
    ctx.font      = `900 80px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(t.titulo, W * 0.05, fotoH + 120);

    // Specs separados por punto medio
    ctx.font      = `500 30px Montserrat, sans-serif`;
    ctx.fillStyle = '#666';
    const specs = [t.bullet1, t.bullet2, t.bullet3].filter(Boolean).join('  ·  ');
    ctx.fillText(specs, W * 0.05, fotoH + 170);

    // Badge y branding
    fvDrawBadge(ctx, t.badge, W * 0.05, fotoH + 240, 28);
    fvDrawBranding(ctx, W - W * 0.05, H - 36, 30, 'right');
}

// ── P4: Overlay + bloque de acento con datos ──
// La foto es el fondo. Un bloque del color de acento
// en la parte inferior contiene todos los datos.
function fvDrawP4(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const ac   = fvGetAccent();

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);

    // Overlay oscuro sobre toda la foto
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);

    // Logo arriba
    ctx.font      = `900 34px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('TODO @L DÍA', W * 0.05, 60);

    // Bloque de acento abajo
    const bloqY = H * 0.62;
    const bloqH = H - bloqY;
    ctx.fillStyle = ac;
    ctx.beginPath();
    ctx.roundRect(W * 0.04, bloqY, W * 0.92, bloqH - 30, 12);
    ctx.fill();

    // Nombre dentro del bloque
    ctx.font      = `900 72px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(t.titulo, W * 0.08, bloqY + 90);

    // Badge dentro del bloque (color oscuro)
    if (FV.badgeVisible) {
        ctx.font = `900 26px Montserrat, sans-serif`;
        const tw = ctx.measureText(t.badge).width;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.roundRect(W * 0.08, bloqY + 110, tw + 28, 40, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(t.badge, W * 0.08 + 14, bloqY + 136);
    }

    // Specs en chips oscuros dentro del bloque
    const specs = [t.bullet1, t.bullet2, t.bullet3].filter(Boolean);
    let chipX   = W * 0.08;
    const chipY = bloqY + 170;
    ctx.font = `700 24px Montserrat, sans-serif`;
    specs.forEach(spec => {
        const tw = ctx.measureText(spec).width;
        const cw = tw + 24;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.roundRect(chipX, chipY, cw, 40, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(spec, chipX + 12, chipY + 27);
        chipX += cw + 12;
    });
}

// ── P5: Editorial — foto arriba, texto en fondo blanco ──
// El único layout con fondo claro. Ideal para dar
// un respiro visual y parecer más premium/revista.
function fvDrawP5(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const ac   = fvGetAccent();

    const fotoH = H * 0.56;

    // Foto superior
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, fotoH);

    // Fondo blanco inferior
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, fotoH, W, H - fotoH);

    // Eyebrow rojo
    ctx.font      = `700 26px Montserrat, sans-serif`;
    ctx.fillStyle = ac;
    ctx.textAlign = 'left';
    ctx.fillText('NUEVO INGRESO', W * 0.05, fotoH + 52);

    // Título oscuro grande
    ctx.font      = `900 82px Montserrat, sans-serif`;
    ctx.fillStyle = '#111';
    ctx.fillText(t.titulo, W * 0.05, fotoH + 140);

    // Línea divisoria
    ctx.fillStyle = '#ddd';
    ctx.fillRect(W * 0.05, fotoH + 160, W * 0.9, 2);

    // Specs como columnas
    const specs = [
        { label: t.bullet1.replace('•', '').trim(), val: '' },
        { label: t.bullet2.replace('•', '').trim(), val: '' },
        { label: t.bullet3.replace('•', '').trim(), val: '' },
    ].filter(s => s.label);

    specs.forEach((s, i) => {
        const sx = W * 0.05 + i * (W * 0.3);
        ctx.font      = `900 28px Montserrat, sans-serif`;
        ctx.fillStyle = '#111';
        ctx.textAlign = 'left';
        ctx.fillText(s.label, sx, fotoH + 220);
    });

    // Branding abajo en oscuro
    ctx.font      = `900 30px Montserrat, sans-serif`;
    ctx.fillStyle = ac;
    ctx.textAlign = 'left';
    ctx.fillText('TODO @L DÍA', W * 0.05, H - 40);
    ctx.font      = `500 20px Montserrat, sans-serif`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('AUTOS SELECCIONADOS', W * 0.05 + 270, H - 40);
}

// ── P6: Geométrico — foto con clip diagonal + fondo acento ──
// El fondo es del color de acento. La foto está
// recortada con un clip diagonal para dar dinamismo.
function fvDrawP6(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const t    = fvGetTextos();
    const ac   = fvGetAccent();

    // Fondo de acento
    ctx.fillStyle = ac;
    ctx.fillRect(0, 0, W, H);

    // Foto con clip diagonal — el polígono corta la foto
    // en diagonal dejando el fondo de acento visible a la derecha
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.78, 0);
    ctx.lineTo(W * 0.65, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.clip();
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    // Overlay oscuro leve sobre la foto
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Texto vertical en la zona de acento (derecha)
    // Rotamos el contexto para escribir de abajo hacia arriba
    const textX = W * 0.82;
    ctx.save();
    ctx.translate(textX, H * 0.7);
    ctx.rotate(-Math.PI / 2);
    ctx.font      = `900 90px Montserrat, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.textAlign = 'center';
    ctx.fillText(t.titulo, 0, 0);
    ctx.restore();

    // Nombre del auto en la zona derecha, legible
    const palabras = t.titulo.split(' ');
    ctx.font      = `900 56px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    palabras.forEach((p, i) => {
        ctx.fillText(p, W * 0.7, H * 0.3 + i * 68);
    });

    // Badge
    fvDrawBadge(ctx, t.badge, W * 0.05, H - 120, 26);

    // Branding
    ctx.font      = `900 26px Montserrat, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('TODO @L DÍA', W * 0.05, H - 50);
}


// ══════════════════════════════════════════════
// INTERACCIÓN CON EL CANVAS
// Touch, mouse, drag, pinch — exactamente igual
// que antes. No cambiamos nada de esta sección
// para no romper lo que ya funciona.
// ══════════════════════════════════════════════

function fvGetCanvasPos(clientX, clientY) {
    const rect   = FV.canvas.getBoundingClientRect();
    const scaleX = FV.W / rect.width;
    const scaleY = FV.H / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function fvHitTest(cx, cy) {
    for (let i = FV.elementos.length - 1; i >= 0; i--) {
        const el = FV.elementos[i];
        FV.ctx.font = `${el.bold ? '900' : '500'} ${el.fontSize}px Montserrat, sans-serif`;
        const tw = FV.ctx.measureText(el.texto).width;
        const x0 = el.esBranding ? el.x - tw / 2 - 10 : el.x - 10;
        const y0 = el.y - el.fontSize - 4;
        const x1 = x0 + tw + 20;
        const y1 = y0 + el.fontSize + 20;
        if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) return el;
    }
    return null;
}

function fvBindCanvas() {
    const canvasViejo = FV.canvas;
    const nuevo = canvasViejo.cloneNode(true);
    canvasViejo.parentNode.replaceChild(nuevo, canvasViejo);
    FV.canvas = nuevo;
    FV.ctx    = nuevo.getContext('2d');

    let dragStart = null;

    // ── MOUSE ──
    nuevo.addEventListener('mousedown', e => {
        const pos = fvGetCanvasPos(e.clientX, e.clientY);
        const hit = fvHitTest(pos.x, pos.y);
        if (hit) {
            FV.elSeleccionado = hit;
            dragStart = { mx: e.clientX, my: e.clientY, ex: hit.x, ey: hit.y, isImg: false };
            fvMostrarToolbar(); fvDraw();
        } else {
            FV.elSeleccionado = null;
            dragStart = { mx: e.clientX, my: e.clientY, isImg: true, ox: FV.imgOffsetX, oy: FV.imgOffsetY };
            fvOcultarToolbar(); fvDraw();
        }
    });

    nuevo.addEventListener('mousemove', e => {
        if (!dragStart) return;
        const rect   = FV.canvas.getBoundingClientRect();
        const scaleX = FV.W / rect.width;
        const scaleY = FV.H / rect.height;
        const dx = (e.clientX - dragStart.mx) * scaleX;
        const dy = (e.clientY - dragStart.my) * scaleY;
        if (dragStart.isImg) {
            FV.imgOffsetX = dragStart.ox + dx;
            FV.imgOffsetY = dragStart.oy + dy;
        } else if (FV.elSeleccionado) {
            FV.elSeleccionado.x = dragStart.ex + dx;
            FV.elSeleccionado.y = dragStart.ey + dy;
        }
        fvDraw();
    });

    nuevo.addEventListener('mouseup',    () => { dragStart = null; });
    nuevo.addEventListener('mouseleave', () => { dragStart = null; });

    nuevo.addEventListener('dblclick', e => {
        const pos = fvGetCanvasPos(e.clientX, e.clientY);
        const hit = fvHitTest(pos.x, pos.y);
        if (hit) fvAbrirEditorTexto(hit, e.clientX, e.clientY);
    });

    // ── TOUCH ──
    // Un dedo = drag (foto o elemento)
    // Dos dedos = pinch zoom (siempre sobre foto 1)
    let touchStart = null, lastPinch = null;

    nuevo.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const t   = e.touches[0];
            const pos = fvGetCanvasPos(t.clientX, t.clientY);
            const hit = fvHitTest(pos.x, pos.y);
            touchStart = {
                tx: t.clientX, ty: t.clientY, hit,
                ex: hit ? hit.x : FV.imgOffsetX,
                ey: hit ? hit.y : FV.imgOffsetY,
            };
            if (hit) { FV.elSeleccionado = hit; fvMostrarToolbar(); fvDraw(); }
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinch = Math.sqrt(dx * dx + dy * dy);
        }
    }, { passive: false });

    nuevo.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && touchStart) {
            const t      = e.touches[0];
            const rect   = FV.canvas.getBoundingClientRect();
            const scaleX = FV.W / rect.width;
            const scaleY = FV.H / rect.height;
            const dx = (t.clientX - touchStart.tx) * scaleX;
            const dy = (t.clientY - touchStart.ty) * scaleY;
            if (touchStart.hit) {
                touchStart.hit.x = touchStart.ex + dx;
                touchStart.hit.y = touchStart.ey + dy;
            } else {
                FV.imgOffsetX = touchStart.ex + dx;
                FV.imgOffsetY = touchStart.ey + dy;
            }
            fvDraw();
        } else if (e.touches.length === 2 && lastPinch !== null) {
            const dx   = e.touches[0].clientX - e.touches[1].clientX;
            const dy   = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const sl   = document.getElementById('fv-zoom');
            sl.value   = Math.min(3, Math.max(0.5, parseFloat(sl.value) + (dist - lastPinch) * 0.003));
            lastPinch  = dist;
            fvDraw();
        }
    }, { passive: false });

    nuevo.addEventListener('touchend', e => {
        if (e.touches.length === 0 && touchStart && touchStart.hit) {
            const t = e.changedTouches[0];
            if (Math.abs(t.clientX - touchStart.tx) < 8 && Math.abs(t.clientY - touchStart.ty) < 8)
                fvAbrirEditorTexto(touchStart.hit, t.clientX, t.clientY);
        }
        touchStart = null; lastPinch = null;
    });
}


// ══════════════════════════════════════════════
// EDITOR DE TEXTO INLINE
// ══════════════════════════════════════════════

function fvAbrirEditorTexto(el, clientX, clientY) {
    const input = document.getElementById('fv-texto-input');
    const wrap  = document.getElementById('fv-canvas-wrap');
    const rect  = FV.canvas.getBoundingClientRect();
    const wrapR = wrap.getBoundingClientRect();
    input.value            = el.texto;
    input.style.display    = 'block';
    input.style.fontSize   = Math.round(el.fontSize * (rect.width / FV.W)) + 'px';
    input.style.fontWeight = el.bold ? '900' : '500';
    input.style.left       = (clientX - wrapR.left - 60) + 'px';
    input.style.top        = (clientY - wrapR.top  - 20) + 'px';
    input._el = el;
    input.focus(); input.select();
}

function fvTextoInputChange() {
    const input = document.getElementById('fv-texto-input');
    if (!input._el) return;
    input._el.texto = input.value;
    const map = { titulo:'fv-titulo', bullet1:'fv-bullet-1', bullet2:'fv-bullet-2', bullet3:'fv-bullet-3', badge:'fv-badge' };
    if (map[input._el.id]) document.getElementById(map[input._el.id]).value = input.value;
    fvDraw();
}

function fvTextoInputBlur() {
    document.getElementById('fv-texto-input').style.display = 'none';
}


// ══════════════════════════════════════════════
// TOOLBAR CONTEXTUAL
// ══════════════════════════════════════════════

function fvMostrarToolbar() { document.getElementById('fv-toolbar').style.display = 'flex'; }
function fvOcultarToolbar() { document.getElementById('fv-toolbar').style.display = 'none'; }
function fvDeseleccionar()  { FV.elSeleccionado = null; fvOcultarToolbar(); fvDraw(); }
function fvToolbarFontSize(delta) {
    if (FV.elSeleccionado) { FV.elSeleccionado.fontSize = Math.max(14, FV.elSeleccionado.fontSize + delta); fvDraw(); }
}
function fvToolbarColor(color) {
    if (FV.elSeleccionado) { FV.elSeleccionado.color = color; fvDraw(); }
}


// ══════════════════════════════════════════════
// FOTO 2 — carga y swap
// ══════════════════════════════════════════════

// Carga foto 2 desde un input file del panel.
// Igual que fvCargarFotoNueva pero guarda en FV.img2.
function fvCargarFoto2Nueva(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => fvCargarFoto2URL(e.target.result);
    reader.readAsDataURL(file);
}

function fvCargarFoto2URL(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        FV.img2        = img;
        FV.img2OffsetX = 0;
        FV.img2OffsetY = 0;
        FV.img2Zoom    = 1;
        const sl = document.getElementById('fv-zoom2');
        if (sl) sl.value = 1;
        fvDraw();
    };
    img.src = url;
}

// Intercambia foto 1 y foto 2 con todos sus offsets.
// Útil cuando querés ver cuál queda mejor en cada posición.
function fvSwapFotos() {
    const tmpImg = FV.imgFondo,  tmpX = FV.imgOffsetX, tmpY = FV.imgOffsetY;
    FV.imgFondo   = FV.img2;     FV.imgOffsetX = FV.img2OffsetX; FV.imgOffsetY = FV.img2OffsetY;
    FV.img2       = tmpImg;      FV.img2OffsetX = tmpX;           FV.img2OffsetY = tmpY;
    fvDraw();
}


// ══════════════════════════════════════════════
// COLOR ACENTO
// ══════════════════════════════════════════════

function fvResetAccento() {
    FV.acento = '#E31E24';
    document.getElementById('fv-acento').value       = '#E31E24';
    document.getElementById('fv-acento-label').textContent = '#E31E24';
    fvSetLayout(FV.layout);
}


// ══════════════════════════════════════════════
// BULLETS IA
// ══════════════════════════════════════════════

async function fvGenerarBulletsIA() {
    if (!FV.autoData) { alert('Elegí un auto primero'); return; }
    const d = FV.autoData;
    document.getElementById('fv-loading-bullets').style.display = 'block';
    const prompt = `Generá 3 bullets cortos (máximo 6 palabras cada uno) para una placa de Instagram de este auto usado:\n${d.marca} ${d.modelo} ${d.anio} · ${Number(d.km).toLocaleString('es-AR')} km\nDetalles: ${d.detalles || ''}\nFormato: devolvé solo los 3 bullets, uno por línea, sin numeración, sin guiones, empezando con punto bullet •`;
    try {
        const res  = await fetch('/api/claude/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
        const data = await res.json();
        const texto  = data.respuesta || data.texto || data.content || '';
        const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 3);
        if (lineas[0]) { document.getElementById('fv-bullet-1').value = lineas[0]; }
        if (lineas[1]) { document.getElementById('fv-bullet-2').value = lineas[1]; }
        if (lineas[2]) { document.getElementById('fv-bullet-3').value = lineas[2]; }
        fvDraw();
    } catch(err) { console.error('Error bullets IA:', err); }
    finally { document.getElementById('fv-loading-bullets').style.display = 'none'; }
}


// ══════════════════════════════════════════════
// FOTOS DEL CRM
// ══════════════════════════════════════════════

function fvCargarFotosCRM(d) {
    const cont  = document.getElementById('fv-fotos-crm');
    const fotos = d.fotos || [];
    if (!fotos.length) { cont.innerHTML = '<div style="color:#444;font-size:10px;">Sin fotos</div>'; return; }
    cont.innerHTML = fotos.map(f => `
        <img src="${f.imagen_url}"
             onclick="fvCargarFotoURL('${f.imagen_url}')"
             style="width:52px;height:40px;object-fit:cover;border-radius:5px;cursor:pointer;border:2px solid transparent;"
             onmouseover="this.style.borderColor='${fvGetAccent()}'"
             onmouseout="this.style.borderColor='transparent'">`
    ).join('');
}

function fvCargarFotoNueva(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => fvCargarFotoURL(e.target.result);
    reader.readAsDataURL(file);
}

function fvCargarFotoURL(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        FV.imgFondo   = img;
        FV.imgOffsetX = 0;
        FV.imgOffsetY = 0;
        document.getElementById('fv-zoom').value = 1;
        fvDraw();
    };
    img.onerror = () => {
        const img2 = new Image();
        img2.onload = () => {
            FV.imgFondo   = img2;
            FV.imgOffsetX = 0;
            FV.imgOffsetY = 0;
            document.getElementById('fv-zoom').value = 1;
            fvDraw();
        };
        img2.src = url + '?nocache=' + Date.now();
    };
    img.src = url + '?t=' + Date.now();
}


// ══════════════════════════════════════════════
// SELECTOR DE AUTO
// ══════════════════════════════════════════════

async function fvPoblarSelectorAutos() {
    const sel = document.getElementById('fv-selector-auto');
    if (!sel) return;
    let todos = [];
    for (const tab of ['disponible', 'reservado', 'vendido']) {
        try {
            const r = await fetch(`/?tab=${tab}&solo_grid=1`);
            if (r.ok) {
                const data = await r.json();
                todos = todos.concat((data.autos || []).map(a => ({ ...a, _tab: tab })));
            }
        } catch(e) {}
    }
    sel.innerHTML = '<option value="">— Elegir auto —</option>';
    todos.forEach(a => {
        const opt = document.createElement('option');
        opt.value       = a.id;
        opt.textContent = `${a.marca} ${a.modelo} ${a.anio} · ${a.estado_display}`;
        if (typeof AUTO_ID_ACTUAL !== 'undefined' && AUTO_ID_ACTUAL && a.id == AUTO_ID_ACTUAL) opt.selected = true;
        sel.appendChild(opt);
    });
    FV.todosLosAutos = todos;
    if (typeof AUTO_ID_ACTUAL !== 'undefined' && AUTO_ID_ACTUAL) fvCambiarAuto(AUTO_ID_ACTUAL);
}

async function fvCambiarAuto(autoId) {
    if (!autoId) return;
    const res = await fetch(`/auto/${autoId}/json/`);
    const d   = await res.json();
    FV.autoData = d;
    document.getElementById('fv-titulo').value  = `${d.marca} ${d.modelo} ${d.anio}`.toUpperCase();
    document.getElementById('fv-badge').value   = 'NUEVO INGRESO';
    document.getElementById('fv-bullet-1').value = '';
    document.getElementById('fv-bullet-2').value = '';
    document.getElementById('fv-bullet-3').value = '';
    fvCargarFotosCRM(d);
    const principal = (d.fotos || []).find(f => f.es_principal) || (d.fotos || [])[0];
    if (principal) fvCargarFotoURL(principal.imagen_url);
    fvSetModo(FV.modo);
}


// ══════════════════════════════════════════════
// DESCARGA Y ASIGNACIÓN
// ══════════════════════════════════════════════

function fvDescargar() {
    if (!FV.canvas) return;
    const nombre = FV.autoData
        ? `${FV.autoData.marca}_${FV.autoData.modelo}_${FV.autoData.anio}_layout${FV.layout}_${FV.modo}`
        : `placa_layout${FV.layout}_${FV.modo}`;
    const link      = document.createElement('a');
    link.download   = nombre.replace(/\s/g, '_') + '.png';
    link.href       = FV.canvas.toDataURL('image/png');
    link.click();
}

function fvAsignarAuto() {
    const modal = document.getElementById('fv-asignar-modal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    fvFiltrarAutos('');
}

function fvFiltrarAutos(q) {
    const lista     = document.getElementById('fv-asignar-lista');
    const filtrados = FV.todosLosAutos.filter(a =>
        `${a.marca} ${a.modelo} ${a.anio}`.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 20);
    lista.innerHTML = filtrados.map(a => `
        <div onclick="fvSeleccionarAutoAsignar(${a.id})"
             style="padding:7px 10px; border-radius:6px; cursor:pointer;
                    background:${FV.autoAsignarId === a.id ? fvGetAccent() : '#1a1a1a'};
                    border:1px solid ${FV.autoAsignarId === a.id ? fvGetAccent() : '#2a2a2a'};
                    font-size:10px; color:#fff; font-weight:700; font-family:'Montserrat',sans-serif;">
            ${a.marca} ${a.modelo} ${a.anio}
            <span style="color:#999; font-weight:400;">· ${a._tab}</span>
        </div>`
    ).join('');
}

function fvSeleccionarAutoAsignar(id) {
    FV.autoAsignarId = id;
    fvFiltrarAutos(document.getElementById('fv-asignar-buscar').value);
}

async function fvGuardarEnAuto() {
    if (!FV.autoAsignarId) { alert('Seleccioná un auto primero'); return; }
    FV.canvas.toBlob(async blob => {
        const form = new FormData();
        form.append('foto', blob, `placa_layout${FV.layout}_${FV.modo}.png`);
        form.append('tipo', FV.modo);
        try {
            const res = await fetch(`/auto/${FV.autoAsignarId}/subir-foto/`, {
                method: 'POST', body: form,
                headers: { 'X-CSRFToken': getCookie('csrftoken') }
            });
            if (res.ok) {
                alert('✅ Foto guardada en el auto');
                document.getElementById('fv-asignar-modal').style.display = 'none';
            } else {
                alert('❌ Error al guardar');
            }
        } catch(e) { alert('❌ Error de red'); }
    }, 'image/png');
}


// ══════════════════════════════════════════════
// CERRAR PANEL
// ══════════════════════════════════════════════

function fvCerrar() {
    document.getElementById('panel-fotos-vehiculo').style.display = 'none';
    if (document.getElementById('grid-section'))
        document.getElementById('grid-section').style.display = 'block';
    document.querySelectorAll('.tab-mkt').forEach(t => t.className = 'tab-mkt inactivo');
}