// ══════════════════════════════════════════════
// FV EDITOR — Motor de dibujo canvas TOUCH
// Todo @l Día
// v3.0 — Elementos dinámicos, libres y arrastrables
// ══════════════════════════════════════════════

function fvGetAccent() { return FV.acento || '#E31E24'; }

function fvGetTextos() {
    return {
        titulo:  (document.getElementById('fv-titulo').value   || 'MARCA MODELO AÑO').toUpperCase(),
        badge:   (document.getElementById('fv-badge').value    || 'NUEVO INGRESO').toUpperCase(),
        bullet1:  document.getElementById('fv-bullet-1').value || '• Característica 1',
        bullet2:  document.getElementById('fv-bullet-2').value || '• Característica 2',
        bullet3:  document.getElementById('fv-bullet-3').value || '• Característica 3',
    };
}

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

function fvDrawOverlayBottom(ctx, W, H, desde) {
    const grad = ctx.createLinearGradient(0, H * desde, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.93)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

function fvDrawOverlayTop(ctx, W, H, hasta) {
    const grad = ctx.createLinearGradient(0, 0, 0, H * hasta);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

function fvGetSliders(H) {
    return {
        tituloY:   parseFloat(document.getElementById('fv-titulo-y').value)   / 100 * H,
        bulletsY:  parseFloat(document.getElementById('fv-bullets-y').value)  / 100 * H,
        brandingY: parseFloat(document.getElementById('fv-branding-y').value) / 100 * H,
    };
}

function fvSliderMoved(sliderKey) {
    // Cuando el usuario mueve un slider, reseteamos hasMoved
    // del elemento correspondiente para que el slider tenga prioridad
    const mapaSliderElemento = {
        'fv-titulo-y':   ['titulo'],
        'fv-bullets-y':  ['bullet1', 'bullet2', 'bullet3', 'badge'],
        'fv-branding-y': ['branding'],
    };
    const ids = mapaSliderElemento[sliderKey] || [];
    ids.forEach(id => {
        const el = FV.elementos.find(e => e.id === id);
        if (el) el.hasMoved = false;
    });
    fvDraw();
}


// ══════════════════════════════════════════════
// NUEVOS HELPERS INTELIGENTES (Soporte Táctil)
// ══════════════════════════════════════════════

// Prepara el texto respetando si el usuario lo movió o le cambió el tamaño a mano
function fvPrepararElemento(id, defX, defY, defSize, defAlign = 'left', defColor = '#fff') {
    const el = FV.elementos.find(e => e.id === id);
    if (!el) return null;
    
    if (!el.hasMoved) { el.x = defX; el.y = defY; }
    if (!el.hasResized) { el.fontSize = defSize; }
    
    el.textAlign = defAlign;
    el.color = el.color || defColor;
    
    FV.ctx.font = `${el.bold ? '900' : '500'} ${el.fontSize}px Montserrat, sans-serif`;
    FV.ctx.fillStyle = el.color;
    FV.ctx.textAlign = el.textAlign;
    return el;
}

function fvDrawTitulo(ctx, defX, defY, defSize, defAlign = 'left', defColor = '#fff') {
    const el = fvPrepararElemento('titulo', defX, defY, defSize, defAlign, defColor);
    if (el && el.texto) ctx.fillText(el.texto, el.x, el.y);
    return el;
}

function fvDrawBadge(ctx, defX, defY, defSize, bgColor = null, textColor = '#fff', defAlign = 'left') {
    if (!FV.badgeVisible) return;
    const el = fvPrepararElemento('badge', defX, defY, defSize, defAlign, textColor);
    if (!el || !el.texto) return;
    
    const acento = bgColor || fvGetAccent();
    const tw  = ctx.measureText(el.texto).width;
    const pad = 28;
    const ph  = el.fontSize + 18;

    // rx = esquina izquierda del rectángulo
    // tx = centro del texto, siempre en el centro del rectángulo
    let rx, tx;
    if (el.textAlign === 'center') {
        rx = el.x - tw / 2 - pad / 2;
    } else if (el.textAlign === 'right') {
        rx = el.x - tw - pad;
    } else {
        rx = el.x;
    }
    // El texto siempre va centrado dentro del rectángulo
    tx = rx + (tw + pad) / 2;

    ctx.fillStyle = acento;
    ctx.beginPath();
    ctx.roundRect(rx, el.y - ph + 4, tw + pad, ph, 7);
    ctx.fill();
    ctx.fillStyle = el.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.texto, tx, el.y - ph / 2 + 4 + ph / 2);
    ctx.textBaseline = 'alphabetic';
    return el;
}

function fvDrawBullet(ctx, id, defX, defY, defSize, textColor = '#fff', dotColor = null) {
    const el = fvPrepararElemento(id, defX, defY, defSize, 'left', textColor);
    if (!el || !el.texto) return;
    
    const acento = dotColor || fvGetAccent();
    if (acento !== 'transparent') {
        ctx.beginPath();
        ctx.arc(el.x, el.y - Math.round(el.fontSize * 0.28), Math.round(el.fontSize * 0.18), 0, Math.PI * 2);
        ctx.fillStyle = acento;
        ctx.fill();
    }
    
    ctx.fillStyle = el.color;
    ctx.fillText(el.texto, el.x + Math.round(el.fontSize * 0.5), el.y);
    return el;
}

function fvDrawBranding(ctx, defX, defY, defSize, defAlign = 'center', mainColor = '#fff', subColor = '#777') {
    const el = fvPrepararElemento('branding', defX, defY, defSize, defAlign, mainColor);
    if (!el) return;
    
    ctx.fillText('TODO @L DÍA', el.x, el.y);
    ctx.font = `500 ${Math.round(el.fontSize * 0.55)}px Montserrat, sans-serif`;
    ctx.fillStyle = subColor;
    ctx.fillText('AUTOS SELECCIONADOS', el.x, el.y + Math.round(el.fontSize * 0.8));
    return el;
}

// ══════════════════════════════════════════════
// DRAW PRINCIPAL
// ══════════════════════════════════════════════

function fvSincronizarTextos() {
    const map = {
        'titulo':  'fv-titulo',
        'badge':   'fv-badge',
        'bullet1': 'fv-bullet-1',
        'bullet2': 'fv-bullet-2',
        'bullet3': 'fv-bullet-3',
    };
    FV.elementos.forEach(el => {
        if (map[el.id]) {
            const input = document.getElementById(map[el.id]);
            if (input) el.texto = input.value;
        }
    });
}

function fvDraw() {
    if (!FV.canvas) return;
    fvSincronizarTextos();
    const ctx = FV.ctx;
    const W = FV.W, H = FV.H;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#cccccc'; // Fondo gris claro de contraste
    ctx.fillRect(0, 0, W, H);

    const isPost      = FV.modo === 'post-principal' || FV.modo === 'post-logo';
    const esPrincipal = FV.modo === 'story-principal' || FV.modo === 'post-principal';

    if (!esPrincipal) {
        fvDrawSoloLogo(ctx, W, H);
        fvDrawElementosEditables(ctx);
        return;
    }

    const layout = FV.layout || 1;
    if (isPost) {
        const fnPost = [null, fvDrawP1, fvDrawP2, fvDrawP3, fvDrawP4, fvDrawP5, fvDrawP6][layout];
        if (fnPost) fnPost(ctx, W, H);
    } else {
        const fnStory = [null, fvDrawS1, fvDrawS2, fvDrawS3, fvDrawS4, fvDrawS5, fvDrawS6][layout];
        if (fnStory) fnStory(ctx, W, H);
    }

    fvDrawElementosEditables(ctx);
}

function fvGetBoundingBox(el) {
    FV.ctx.font = `${el.bold ? '900' : '500'} ${el.fontSize}px Montserrat, sans-serif`;
    const tw = FV.ctx.measureText(el.texto || '').width;
    let x0 = el.x - 10;
    if (el.textAlign === 'center' || el.esBranding) {
        x0 = el.x - (tw / 2) - 10;
    } else if (el.textAlign === 'right') {
        x0 = el.x - tw - 10;
    }
    const y0 = el.y - el.fontSize - 4;
    return { x0, y0, w: tw + 20, h: el.fontSize + 16 };
}

function fvDrawElementosEditables(ctx) {
    if (!FV.elSeleccionado) return;
    const el = FV.elSeleccionado;
    const bb = fvGetBoundingBox(el);

    ctx.strokeStyle = '#1a8fe3';
    ctx.lineWidth   = 3;
    ctx.strokeRect(bb.x0, bb.y0, bb.w, bb.h);

    const hx = bb.x0 + bb.w - 10;
    const hy = bb.y0 + bb.h - 10;
    ctx.fillStyle = '#1a8fe3';
    ctx.fillRect(hx, hy, 20, 20);
    ctx.fillStyle = '#fff';
    ctx.fillRect(hx + 4, hy + 4, 12, 12);
}

function fvDrawSoloLogo(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(0, 0, W, H);
    const logoEl = FV.elementos.find(e => e.id === 'logo');
    if (!logoEl) return;
    if (!logoEl.hasMoved) { logoEl.x = W * 0.5; logoEl.y = FV.logoPos === 'top' ? H * 0.07 : H * 0.93; }
    if (!logoEl.hasResized) { logoEl.fontSize = 38; }
    ctx.font = `900 ${logoEl.fontSize}px Montserrat, sans-serif`;
    ctx.fillStyle = logoEl.color || '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('TODO @L DÍA', logoEl.x, logoEl.y);
    ctx.font = `500 ${Math.round(logoEl.fontSize * 0.55)}px Montserrat, sans-serif`;
    ctx.fillStyle = '#777';
    ctx.fillText('AUTOS SELECCIONADOS', logoEl.x, logoEl.y + Math.round(logoEl.fontSize * 0.8));
}

// ══════════════════════════════════════════════
// STORY LAYOUTS (1080 × 1920)
// ══════════════════════════════════════════════

function fvDrawS1(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const sl   = fvGetSliders(H);
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    fvDrawOverlayTop(ctx, W, H, 0.25);
    fvDrawOverlayBottom(ctx, W, H, 0.35);

    ctx.fillStyle = fvGetAccent();
    ctx.fillRect(W * 0.05, sl.bulletsY - 110, 7, 220);

    fvDrawTitulo(ctx, W * 0.07, sl.tituloY, 72);
    fvDrawBadge(ctx, W * 0.07, H * 0.68, 30);
    fvDrawBullet(ctx, 'bullet1', W * 0.08, sl.bulletsY, 34);
    fvDrawBullet(ctx, 'bullet2', W * 0.08, sl.bulletsY + 60, 34);
    fvDrawBullet(ctx, 'bullet3', W * 0.08, sl.bulletsY + 120, 34);
    fvDrawBranding(ctx, W * 0.5, sl.brandingY, 38, 'center');
}

function fvDrawS2(ctx, W, H) {
    const zoom1 = parseFloat(document.getElementById('fv-zoom').value);
    const zoom2 = parseFloat(document.getElementById('fv-zoom2').value || '1');
    const ac    = fvGetAccent();
    const midY  = H * 0.47;
    const bandH = H * 0.1;

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom1, 0, 0, W, midY);
    fvDrawFoto(ctx, FV.img2, FV.img2OffsetX, FV.img2OffsetY, zoom2, 0, midY + bandH, W, H - midY - bandH);

    ctx.fillStyle = '#080808'; ctx.fillRect(0, midY, W, bandH);
    ctx.fillStyle = ac; ctx.fillRect(0, midY, W, 6); ctx.fillRect(0, midY + bandH - 6, W, 6);

    fvDrawTitulo(ctx, W * 0.5, midY + bandH * 0.48, 58, 'center');
    fvDrawBadge(ctx, W * 0.5, midY + bandH * 0.78, 26, ac, '#fff', 'center');

    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, H - 80, W, 80);
    fvDrawBranding(ctx, W * 0.5, H - 36, 30, 'center');
}

function fvDrawS3(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const sl   = fvGetSliders(H);
    const fotoH = H * 0.62;

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, fotoH);
    ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, fotoH, W, H - fotoH);

    ctx.fillStyle = fvGetAccent(); ctx.beginPath();
    ctx.moveTo(0, fotoH - 30); ctx.lineTo(W, fotoH + 10);
    ctx.lineTo(W, fotoH + 50); ctx.lineTo(0, fotoH + 10); ctx.fill();

    fvDrawTitulo(ctx, W * 0.05, fotoH + 120, 80);

    let chipX = W * 0.05;
    const chipY = fotoH + 170;
    ['bullet1', 'bullet2', 'bullet3'].forEach(id => {
        const el = fvPrepararElemento(id, chipX, chipY + 27, 24, 'left', '#ccc');
        if (!el || !el.texto) return;
        const cw = ctx.measureText(el.texto).width + 28;
        ctx.fillStyle = '#1e1e1e'; ctx.beginPath();
        ctx.roundRect(el.x - 14, el.y - 27, cw, 40, 4); ctx.fill();
        ctx.strokeStyle = '#333'; ctx.stroke();
        ctx.fillStyle = el.color; ctx.fillText(el.texto, el.x, el.y);
        chipX += cw + 12;
    });

    fvDrawBadge(ctx, W * 0.05, fotoH + 260, 30);
    fvDrawBranding(ctx, W * 0.5, sl.brandingY, 36, 'center');
}

function fvDrawS4(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const sl   = fvGetSliders(H);
    const ac   = fvGetAccent();

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    const op = parseFloat(document.getElementById('fv-opacidad').value) / 100;
    ctx.fillStyle = `rgba(0,0,0,${op})`; ctx.fillRect(0, 0, W, H);

    fvDrawBadge(ctx, W * 0.05, sl.bulletsY - 280, 28, 'transparent', ac); // Eyebrow libre

    const elTitulo = fvPrepararElemento('titulo', W * 0.05, sl.bulletsY - 180, 130, 'left', '#fff');
    if (elTitulo && elTitulo.texto) {
        const palabras = elTitulo.texto.split(' ');
        palabras.forEach((p, i) => {
            ctx.fillStyle = i === palabras.length - 1 ? ac : elTitulo.color;
            ctx.fillText(p, elTitulo.x, elTitulo.y + i * 140);
        });
    }

    ctx.fillStyle = ac; ctx.fillRect(W * 0.05, sl.bulletsY - 10, 80, 6);

    fvDrawBullet(ctx, 'bullet1', W * 0.07, sl.bulletsY + 40, 32);
    fvDrawBullet(ctx, 'bullet2', W * 0.07, sl.bulletsY + 98, 32);
    fvDrawBullet(ctx, 'bullet3', W * 0.07, sl.bulletsY + 156, 32);
    fvDrawBranding(ctx, W * 0.5, sl.brandingY, 36, 'center');
}

function fvDrawS5(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const ac   = fvGetAccent();

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(0, 0, W, H);

    const margen = 28; const grosor = 6;
    ctx.fillStyle = ac;
    ctx.fillRect(margen, margen, W - margen * 2, grosor);
    ctx.fillRect(margen, H - margen - grosor, W - margen * 2, grosor);
    ctx.fillRect(margen, margen, grosor, H - margen * 2);
    ctx.fillRect(W - margen - grosor, margen, grosor, H - margen * 2);

    // Título grande en el centro — independiente
    const elTitulo = fvPrepararElemento('titulo', W * 0.5, H * 0.5, 72, 'center', '#fff');
    if (elTitulo && elTitulo.texto) {
        ctx.fillText(elTitulo.texto, elTitulo.x, elTitulo.y);
    }

    // Bullet 1 → etiqueta MODELO arriba izquierda (texto libre)
    const elB1 = fvPrepararElemento('bullet1', margen + 20, margen + 94, 48, 'left', '#fff');
    ctx.font = `700 22px Montserrat, sans-serif`; ctx.fillStyle = ac; ctx.textAlign = 'left';
    ctx.fillText('MODELO', margen + 20, margen + 44);
    if (elB1 && elB1.texto) {
        ctx.font = `900 48px Montserrat, sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
        ctx.fillText(elB1.texto.replace('•', '').trim(), elB1.x, elB1.y);
    }

    // Bullet 2 → etiqueta AÑO arriba derecha (texto libre)
    const elB2 = fvPrepararElemento('bullet2', W - margen - 20, margen + 94, 48, 'right', '#fff');
    ctx.font = `700 22px Montserrat, sans-serif`; ctx.fillStyle = ac; ctx.textAlign = 'right';
    ctx.fillText('AÑO', W - margen - 20, margen + 44);
    if (elB2 && elB2.texto) {
        ctx.font = `900 48px Montserrat, sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
        ctx.fillText(elB2.texto.replace('•', '').trim(), elB2.x, elB2.y);
    }

    // Bullet 3 → línea de detalle bajo el título
    const elB3 = fvPrepararElemento('bullet3', W * 0.5, H * 0.5 + 56, 30, 'center', ac);
    if (elB3 && elB3.texto) ctx.fillText(elB3.texto.replace('•', '').trim(), elB3.x, elB3.y);

    fvDrawBadge(ctx, margen + 20, H - margen - 60, 28);

    const elBrand = fvPrepararElemento('branding', W - margen - 20, H - margen - 44, 28, 'right', '#fff');
    if (elBrand) {
        ctx.fillText('TODO @L DÍA', elBrand.x, elBrand.y);
        ctx.font = `500 18px Montserrat, sans-serif`; ctx.fillStyle = '#777';
        ctx.fillText('AUTOS SELECCIONADOS', elBrand.x, elBrand.y + 26);
    }
}

function fvDrawS6(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const ac   = fvGetAccent();
    const stripH = 120;

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H - stripH);

    const grad = ctx.createLinearGradient(0, H - stripH - 100, 0, H - stripH);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = grad; ctx.fillRect(0, H - stripH - 100, W, 100);

    fvDrawTitulo(ctx, W * 0.05, H - stripH - 24, 68);

    ctx.fillStyle = '#080808'; ctx.fillRect(0, H - stripH, W, stripH);
    ctx.fillStyle = ac; ctx.fillRect(0, H - stripH, W, 5);

    let chipX = W * 0.04;
    const chipY = H - stripH + 20;
    ['bullet1', 'bullet2', 'bullet3'].forEach(id => {
        const el = fvPrepararElemento(id, chipX, chipY + 29, 24, 'left', '#bbb');
        if (!el || !el.texto) return;
        const cw = ctx.measureText(el.texto).width + 28;
        ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#2e2e2e';
        ctx.beginPath(); ctx.roundRect(el.x - 14, el.y - 29, cw, 44, 5);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = el.color; ctx.fillText(el.texto, el.x, el.y);
        chipX += cw + 14;
    });

    fvDrawBranding(ctx, W * 0.5, H - 22, 28, 'center');
}

// ══════════════════════════════════════════════
// POST LAYOUTS (1080 × 1350)
// ══════════════════════════════════════════════

function fvDrawP1(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const sl   = fvGetSliders(H);
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    fvDrawOverlayTop(ctx, W, H, 0.3);
    fvDrawOverlayBottom(ctx, W, H, 0.38);

    ctx.fillStyle = fvGetAccent(); ctx.fillRect(W * 0.05, sl.bulletsY - 110, 7, 190);

    fvDrawTitulo(ctx, W * 0.05, sl.tituloY, 68);
    fvDrawBadge(ctx, W * 0.07, sl.bulletsY - 55, 30);
    fvDrawBullet(ctx, 'bullet1', W * 0.08, sl.bulletsY, 32);
    fvDrawBullet(ctx, 'bullet2', W * 0.08, sl.bulletsY + 50, 32);
    fvDrawBullet(ctx, 'bullet3', W * 0.08, sl.bulletsY + 100, 32);
    fvDrawBranding(ctx, W * 0.5, sl.brandingY, 34, 'center');
}

function fvDrawP2(ctx, W, H) {
    const zoom1 = parseFloat(document.getElementById('fv-zoom').value);
    const zoom2 = parseFloat(document.getElementById('fv-zoom2').value || '1');
    const ac    = fvGetAccent();
    const fotoH = H * 0.75;
    const bandH = H - fotoH;

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom1, 0, 0, W / 2 - 3, fotoH);
    fvDrawFoto(ctx, FV.img2, FV.img2OffsetX, FV.img2OffsetY, zoom2, W / 2 + 3, 0, W / 2 - 3, fotoH);

    ctx.fillStyle = ac; ctx.fillRect(W / 2 - 3, 0, 6, fotoH);
    ctx.fillStyle = '#080808'; ctx.fillRect(0, fotoH, W, bandH);
    ctx.fillStyle = ac; ctx.fillRect(0, fotoH, W, 5);

    fvDrawTitulo(ctx, W * 0.5, fotoH + bandH * 0.5, 64, 'center');
    fvDrawBadge(ctx, W * 0.5, fotoH + bandH * 0.8, 24, ac, '#fff', 'center');
}

function fvDrawP3(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const ac   = fvGetAccent();
    const fotoH = H * 0.62;

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, fotoH);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, fotoH, W, H - fotoH);
    ctx.fillStyle = ac; ctx.fillRect(W * 0.05, fotoH + 30, 70, 7);

    fvDrawTitulo(ctx, W * 0.05, fotoH + 120, 80);

    const b1 = FV.elementos.find(e => e.id === 'bullet1');
    const b2 = FV.elementos.find(e => e.id === 'bullet2');
    const b3 = FV.elementos.find(e => e.id === 'bullet3');
    const txtSpecs = [b1?.texto, b2?.texto, b3?.texto].filter(Boolean).join('  ·  ');
    
    // Forzamos usar bullet1 para mover todo el bloque de specs unificado
    const elBul = fvPrepararElemento('bullet1', W * 0.05, fotoH + 170, 30, 'left', '#666');
    if (elBul) ctx.fillText(txtSpecs, elBul.x, elBul.y);

    fvDrawBadge(ctx, W * 0.05, fotoH + 240, 28);
    fvDrawBranding(ctx, W - W * 0.05, H - 36, 30, 'right');
}

function fvDrawP4(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const ac   = fvGetAccent();

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);

    ctx.font = `900 34px Montserrat, sans-serif`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText('TODO @L DÍA', W * 0.05, 60);

    const bloqY = H * 0.62; const bloqH = H - bloqY;
    ctx.fillStyle = ac; ctx.beginPath();
    ctx.roundRect(W * 0.04, bloqY, W * 0.92, bloqH - 30, 12); ctx.fill();

    fvDrawTitulo(ctx, W * 0.08, bloqY + 90, 72);
    fvDrawBadge(ctx, W * 0.08, bloqY + 136, 26, 'rgba(0,0,0,0.3)', '#fff');

    let chipX = W * 0.08;
    const chipY = bloqY + 170;
    ['bullet1', 'bullet2', 'bullet3'].forEach(id => {
        const el = fvPrepararElemento(id, chipX, chipY + 27, 24, 'left', '#fff');
        if (!el || !el.texto) return;
        const cw = ctx.measureText(el.texto).width + 24;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath();
        ctx.roundRect(el.x - 12, el.y - 27, cw, 40, 5); ctx.fill();
        ctx.fillStyle = el.color; ctx.fillText(el.texto, el.x, el.y);
        chipX += cw + 12;
    });
}

function fvDrawP5(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const ac   = fvGetAccent();
    const fotoH = H * 0.56;

    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, fotoH);
    ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, fotoH, W, H - fotoH);

    fvDrawBadge(ctx, W * 0.05, fotoH + 52, 26, 'transparent', ac); // Eyebrow
    fvDrawTitulo(ctx, W * 0.05, fotoH + 140, 82, 'left', '#111');
    
    ctx.fillStyle = '#ddd'; ctx.fillRect(W * 0.05, fotoH + 160, W * 0.9, 2);

    ['bullet1', 'bullet2', 'bullet3'].forEach((id, i) => {
        const el = fvPrepararElemento(id, W * 0.05 + i * (W * 0.3), fotoH + 220, 28, 'left', '#111');
        if (el && el.texto) ctx.fillText(el.texto.replace('•', '').trim(), el.x, el.y);
    });

    const elBrand = fvPrepararElemento('branding', W * 0.05, H - 40, 30, 'left', ac);
    if (elBrand) {
        ctx.fillText('TODO @L DÍA', elBrand.x, elBrand.y);
        ctx.font = `500 20px Montserrat, sans-serif`; ctx.fillStyle = '#aaa';
        ctx.fillText('AUTOS SELECCIONADOS', elBrand.x + 270, elBrand.y);
    }
}

function fvDrawP6(ctx, W, H) {
    const zoom = parseFloat(document.getElementById('fv-zoom').value);
    const ac   = fvGetAccent();

    ctx.fillStyle = ac; ctx.fillRect(0, 0, W, H);

    ctx.save(); ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W * 0.78, 0); ctx.lineTo(W * 0.65, H); ctx.lineTo(0, H);
    ctx.clip();
    fvDrawFoto(ctx, FV.imgFondo, FV.imgOffsetX, FV.imgOffsetY, zoom, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const elTitulo = fvPrepararElemento('titulo', W * 0.7, H * 0.3, 56, 'left', '#fff');
    if (elTitulo && elTitulo.texto) {
        ctx.save();
        ctx.translate(W * 0.82, H * 0.7); ctx.rotate(-Math.PI / 2);
        ctx.font = `900 90px Montserrat, sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.textAlign = 'center'; ctx.fillText(elTitulo.texto, 0, 0);
        ctx.restore();
        
        elTitulo.texto.split(' ').forEach((p, i) => ctx.fillText(p, elTitulo.x, elTitulo.y + i * 68));
    }

    fvDrawBadge(ctx, W * 0.05, H - 120, 26);
    
    const elBrand = fvPrepararElemento('branding', W * 0.05, H - 50, 26, 'left', 'rgba(255,255,255,0.7)');
    if (elBrand) {
        ctx.fillText('TODO @L DÍA', elBrand.x, elBrand.y);
    }
}

// ══════════════════════════════════════════════
// INTERACCIÓN CON EL CANVAS (Lógica Reparada)
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
        
        let x0 = el.x - 10;
        if (el.textAlign === 'center' || el.esBranding) {
            x0 = el.x - (tw / 2) - 10;
        } else if (el.textAlign === 'right') {
            x0 = el.x - tw - 10;
        }

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

    // Detecta si la posición en canvas corresponde a la zona de foto 2
    // según el layout activo. Solo layouts con 2 fotos tienen zona de foto 2.
    function esZonaFoto2(canvasX, canvasY) {
        const W = FV.W, H = FV.H;
        const layout = FV.layout;
        const modo   = FV.modo;
        // Story layout 2: foto 1 arriba (0 a H*0.47), foto 2 abajo
        if (modo === 'story-principal' && layout === 2) return canvasY > H * 0.47;
        // Post layout 2: foto 1 izquierda, foto 2 derecha (arriba de fotoH)
        if (modo === 'post-principal' && layout === 2) return canvasX > W * 0.5;
        return false;
    }

 function esZonaResize(canvasX, canvasY) {
    // Devuelve true si el punto está sobre el handle de resize
    // del elemento seleccionado (esquina inferior derecha del bounding box).
    if (!FV.elSeleccionado) return false;
    const bb = fvGetBoundingBox(FV.elSeleccionado);
    const hx = bb.x0 + bb.w - 10;
    const hy = bb.y0 + bb.h - 10;
    // Radio de tolerancia: 30px en coordenadas canvas
    return canvasX >= hx - 10 && canvasX <= hx + 30 &&
           canvasY >= hy - 10 && canvasY <= hy + 30;
}   

nuevo.addEventListener('mousedown', e => {
    const pos = fvGetCanvasPos(e.clientX, e.clientY);
    if (esZonaResize(pos.x, pos.y)) {
        // Modo resize: guardamos fontSize inicial y posición Y del mouse
        dragStart = { isResize: true, my: e.clientY, fontSize0: FV.elSeleccionado.fontSize };
        return;
    }
    const hit = fvHitTest(pos.x, pos.y);
    if (hit) {
        FV.elSeleccionado = hit;
        dragStart = { mx: e.clientX, my: e.clientY, ex: hit.x, ey: hit.y, isImg: false };
        fvMostrarToolbar(); fvDraw();
    } else {
        FV.elSeleccionado = null;
        const foto2 = esZonaFoto2(pos.x, pos.y);
        dragStart = {
            mx: e.clientX, my: e.clientY, isImg: true,
            esFoto2: foto2,
            ox: foto2 ? FV.img2OffsetX : FV.imgOffsetX,
            oy: foto2 ? FV.img2OffsetY : FV.imgOffsetY,
        };
        fvOcultarToolbar(); fvDraw();
    }
});

    nuevo.addEventListener('mousemove', e => {
    if (!dragStart) {
        // Cambiar cursor si está sobre el handle de resize
        const pos = fvGetCanvasPos(e.clientX, e.clientY);
        nuevo.style.cursor = esZonaResize(pos.x, pos.y) ? 'nwse-resize' : 'default';
        return;
    }
    const rect   = FV.canvas.getBoundingClientRect();
    const scaleY = FV.H / rect.height;
    const scaleX = FV.W / rect.width;
    if (dragStart.isResize && FV.elSeleccionado) {
        // Resize: arrastrar hacia abajo agranda, hacia arriba achica
        const dy = (e.clientY - dragStart.my) * scaleY;
        FV.elSeleccionado.fontSize = Math.max(14, Math.round(dragStart.fontSize0 + dy * 0.5));
        FV.elSeleccionado.hasResized = true;
    } else {
        const dx = (e.clientX - dragStart.mx) * scaleX;
        const dy = (e.clientY - dragStart.my) * scaleY;
        if (dragStart.isImg) {
            if (dragStart.esFoto2) {
                FV.img2OffsetX = dragStart.ox + dx;
                FV.img2OffsetY = dragStart.oy + dy;
            } else {
                FV.imgOffsetX = dragStart.ox + dx;
                FV.imgOffsetY = dragStart.oy + dy;
            }
        } else if (FV.elSeleccionado) {
            FV.elSeleccionado.x = dragStart.ex + dx;
            FV.elSeleccionado.y = dragStart.ey + dy;
            FV.elSeleccionado.hasMoved = true;
        }
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

    let touchStart = null, lastPinch = null;

    nuevo.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const t   = e.touches[0];
            const pos = fvGetCanvasPos(t.clientX, t.clientY);
            const hit = fvHitTest(pos.x, pos.y);
            const foto2 = !hit && esZonaFoto2(pos.x, pos.y);
            touchStart = {
                tx: t.clientX, ty: t.clientY, hit,
                esFoto2: foto2,
                ex: hit ? hit.x : (foto2 ? FV.img2OffsetX : FV.imgOffsetX),
                ey: hit ? hit.y : (foto2 ? FV.img2OffsetY : FV.imgOffsetY),
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
                touchStart.hit.hasMoved = true;
            } else if (touchStart.esFoto2) {
                FV.img2OffsetX = touchStart.ex + dx;
                FV.img2OffsetY = touchStart.ey + dy;
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

function fvTextoInputBlur() { document.getElementById('fv-texto-input').style.display = 'none'; }

function fvMostrarToolbar() { document.getElementById('fv-toolbar').style.display = 'flex'; }
function fvOcultarToolbar() { document.getElementById('fv-toolbar').style.display = 'none'; }
function fvDeseleccionar()  { FV.elSeleccionado = null; fvOcultarToolbar(); fvDraw(); }
function fvToolbarFontSize(delta) {
    if (FV.elSeleccionado) { 
        FV.elSeleccionado.fontSize = Math.max(14, FV.elSeleccionado.fontSize + delta); 
        FV.elSeleccionado.hasResized = true; // Guardamos que se modificó su tamaño a mano
        fvDraw(); 
    }
}
function fvToolbarColor(color) {
    if (FV.elSeleccionado) { FV.elSeleccionado.color = color; fvDraw(); }
}

// ══════════════════════════════════════════════
// UTILIDADES RESTANTES (Fotos, IA, Guardar)
// ══════════════════════════════════════════════

function fvCargarFoto2Nueva(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => fvCargarFoto2URL(e.target.result);
    reader.readAsDataURL(file);
}

function fvCargarFoto2URL(url) {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { FV.img2 = img; FV.img2OffsetX = 0; FV.img2OffsetY = 0; FV.img2Zoom = 1; fvDraw(); };
    img.src = url;
}

function fvSwapFotos() {
    const tmpImg = FV.imgFondo, tmpX = FV.imgOffsetX, tmpY = FV.imgOffsetY;
    FV.imgFondo = FV.img2; FV.imgOffsetX = FV.img2OffsetX; FV.imgOffsetY = FV.img2OffsetY;
    FV.img2 = tmpImg; FV.img2OffsetX = tmpX; FV.img2OffsetY = tmpY;
    fvDraw();
}

function fvResetAccento() {
    FV.acento = '#E31E24';
    document.getElementById('fv-acento').value = '#E31E24';
    document.getElementById('fv-acento-label').textContent = '#E31E24';
    fvSetLayout(FV.layout);
}

async function fvGenerarBulletsIA() {
    if (!FV.autoData) { alert('Elegí un auto primero'); return; }
    const d = FV.autoData;
    document.getElementById('fv-loading-bullets').style.display = 'block';
    const prompt = `Generá 3 bullets cortos (máximo 6 palabras) para placa de Instagram:\n${d.marca} ${d.modelo} ${d.anio}\nFormato: solo los 3 bullets, sin guiones, con punto bullet •`;
    try {
        const res = await fetch('/api/claude/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
        const data = await res.json();
        const lineas = (data.respuesta || data.texto || '').split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 3);
        if (lineas[0]) document.getElementById('fv-bullet-1').value = lineas[0];
        if (lineas[1]) document.getElementById('fv-bullet-2').value = lineas[1];
        if (lineas[2]) document.getElementById('fv-bullet-3').value = lineas[2];
        fvDraw();
    } catch(err) { console.error('Error bullets IA:', err); }
    finally { document.getElementById('fv-loading-bullets').style.display = 'none'; }
}

function fvCargarFotosCRM(d) {
    const cont = document.getElementById('fv-fotos-crm');
    if (!d.fotos || !d.fotos.length) { cont.innerHTML = '<div style="color:#444;font-size:10px;">Sin fotos</div>'; return; }
    cont.innerHTML = d.fotos.map(f => `<img src="${f.imagen_url}" onclick="fvCargarFotoURL('${f.imagen_url}')" style="width:52px;height:40px;object-fit:cover;border-radius:5px;cursor:pointer;border:2px solid transparent;">`).join('');
}

function fvCargarFotoNueva(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => fvCargarFotoURL(e.target.result);
    reader.readAsDataURL(file);
}

function fvCargarFotoURL(url) {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { FV.imgFondo = img; FV.imgOffsetX = 0; FV.imgOffsetY = 0; document.getElementById('fv-zoom').value = 1; fvDraw(); };
    
    img.onerror = () => {
        const img2 = new Image();
        img2.onload = () => { FV.imgFondo = img2; FV.imgOffsetX = 0; FV.imgOffsetY = 0; document.getElementById('fv-zoom').value = 1; fvDraw(); };
        const sep = url.includes('?') ? '&' : '?';
        img2.src = url.startsWith('data:image') ? url : url + sep + 'nocache=' + Date.now();
    };
    
    const sep = url.includes('?') ? '&' : '?';
    img.src = url.startsWith('data:image') ? url : url + sep + 't=' + Date.now();
}

async function fvPoblarSelectorAutos() {
    const sel = document.getElementById('fv-selector-auto');
    if (!sel) return;
    let todos = [];
    for (const tab of ['disponible', 'reservado', 'vendido']) {
        try {
            const r = await fetch(`/?tab=${tab}&solo_grid=1`);
            if (r.ok) { const data = await r.json(); todos = todos.concat((data.autos || []).map(a => ({ ...a, _tab: tab }))); }
        } catch(e) {}
    }
    sel.innerHTML = '<option value="">— Elegir auto —</option>';
    todos.forEach(a => {
        const opt = document.createElement('option'); opt.value = a.id;
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
    const d = await res.json(); FV.autoData = d;
    document.getElementById('fv-titulo').value = `${d.marca} ${d.modelo} ${d.anio}`.toUpperCase();
    document.getElementById('fv-badge').value = 'NUEVO INGRESO';
    ['1','2','3'].forEach(i => document.getElementById(`fv-bullet-${i}`).value = '');
    fvCargarFotosCRM(d);
    const principal = (d.fotos || []).find(f => f.es_principal) || (d.fotos || [])[0];
    if (principal) fvCargarFotoURL(principal.imagen_url);
    fvSetModo(FV.modo);
}

function fvDescargar() {
    if (!FV.canvas) return;
    const nombre = FV.autoData ? `${FV.autoData.marca}_${FV.autoData.modelo}_${FV.autoData.anio}_layout${FV.layout}_${FV.modo}` : `placa_layout${FV.layout}_${FV.modo}`;
    const link = document.createElement('a');
    link.download = nombre.replace(/\s/g, '_') + '.png'; link.href = FV.canvas.toDataURL('image/png'); link.click();
}

function fvAsignarAuto() {
    const modal = document.getElementById('fv-asignar-modal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none'; fvFiltrarAutos('');
}

function fvFiltrarAutos(q) {
    const lista = document.getElementById('fv-asignar-lista');
    const filtrados = FV.todosLosAutos.filter(a => `${a.marca} ${a.modelo} ${a.anio}`.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
    lista.innerHTML = filtrados.map(a => `<div onclick="fvSeleccionarAutoAsignar(${a.id})" style="padding:7px 10px; border-radius:6px; cursor:pointer; background:${FV.autoAsignarId === a.id ? fvGetAccent() : '#1a1a1a'}; border:1px solid ${FV.autoAsignarId === a.id ? fvGetAccent() : '#2a2a2a'}; font-size:10px; color:#fff; font-weight:700; font-family:'Montserrat',sans-serif;">${a.marca} ${a.modelo} ${a.anio} <span style="color:#999; font-weight:400;">· ${a._tab}</span></div>`).join('');
}

function fvSeleccionarAutoAsignar(id) { FV.autoAsignarId = id; fvFiltrarAutos(document.getElementById('fv-asignar-buscar').value); }

async function fvGuardarEnAuto() {
    if (!FV.autoAsignarId) { alert('Seleccioná un auto primero'); return; }
    FV.canvas.toBlob(async blob => {
        const form = new FormData(); form.append('foto', blob, `placa_layout${FV.layout}_${FV.modo}.png`); form.append('tipo', FV.modo);
        try {
            const res = await fetch(`/auto/${FV.autoAsignarId}/subir-foto/`, { method: 'POST', body: form, headers: { 'X-CSRFToken': getCookie('csrftoken') } });
            if (res.ok) { alert('✅ Foto guardada en el auto'); document.getElementById('fv-asignar-modal').style.display = 'none'; } else { alert('❌ Error al guardar'); }
        } catch(e) { alert('❌ Error de red'); }
    }, 'image/png');
}

function fvCerrar() {
    document.getElementById('panel-fotos-vehiculo').style.display = 'none';
    if (document.getElementById('grid-section')) document.getElementById('grid-section').style.display = 'block';
    document.querySelectorAll('.tab-mkt').forEach(t => t.className = 'tab-mkt inactivo');
}