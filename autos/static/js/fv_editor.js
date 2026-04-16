// ══════════════════════════════════════════════
// FV EDITOR — Fotos del Vehículo
// Todo @l Día — todoaldia.com.ar
// ══════════════════════════════════════════════

// ── DRAW ──────────────────────────────────────
function fvDraw() {
    if (!FV.canvas) return;
    const ctx = FV.ctx;
    const W = FV.W, H = FV.H;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, W, H);

    if (FV.imgFondo) {
        const img  = FV.imgFondo;
        const zoom = parseFloat(document.getElementById('fv-zoom').value);
        const scale = Math.max(W / img.width, H / img.height) * zoom;
        const sw   = img.width * scale;
        const sh   = img.height * scale;
        const sx   = (W - sw) / 2 + FV.imgOffsetX;
        const sy   = (H - sh) / 2 + FV.imgOffsetY;
        ctx.drawImage(img, sx, sy, sw, sh);
    }

    const esPrincipal = FV.modo === 'story-principal' || FV.modo === 'post-principal';

    if (esPrincipal) {
        const franjaY = H * 0.62;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, franjaY, W, H - franjaY);

        const grad = ctx.createLinearGradient(0, 0, 0, franjaY);
        grad.addColorStop(0, 'rgba(0,0,0,0.45)');
        grad.addColorStop(1, 'rgba(0,0,0,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, franjaY);

        ctx.fillStyle = '#E31E24';
        ctx.fillRect(0, franjaY - 4, W, 4);

        const tituloY   = parseFloat(document.getElementById('fv-titulo-y').value)   / 100 * H;
        const bulletsY  = parseFloat(document.getElementById('fv-bullets-y').value)  / 100 * H;
        const brandingY = parseFloat(document.getElementById('fv-branding-y').value) / 100 * H;

        FV.elementos.forEach(el => {
            if (el.id === 'titulo')   el.y = tituloY;
            if (el.id === 'bullet1')  el.y = bulletsY;
            if (el.id === 'bullet2')  el.y = bulletsY + el.fontSize * 1.5;
            if (el.id === 'bullet3')  el.y = bulletsY + el.fontSize * 3;
            if (el.id === 'branding') el.y = brandingY;
            if (el.id === 'badge')    el.y = bulletsY - el.fontSize * 2;

            el.texto = el.id === 'titulo'  ? (document.getElementById('fv-titulo').value  || el.texto) :
                       el.id === 'badge'   ? (document.getElementById('fv-badge').value   || el.texto) :
                       el.id === 'bullet1' ? (document.getElementById('fv-bullet-1').value || el.texto) :
                       el.id === 'bullet2' ? (document.getElementById('fv-bullet-2').value || el.texto) :
                       el.id === 'bullet3' ? (document.getElementById('fv-bullet-3').value || el.texto) :
                       el.texto;

            if (el.esBadge) {
                ctx.font = `900 ${el.fontSize * 0.8}px Montserrat, sans-serif`;
                const tw = ctx.measureText(el.texto).width;
                const pad = 24;
                ctx.fillStyle = '#E31E24';
                ctx.beginPath();
                ctx.roundRect(el.x - pad/2, el.y - el.fontSize*0.8 - 4, tw + pad, el.fontSize*0.8 + 16, 6);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'left';
                ctx.fillText(el.texto, el.x, el.y);
            } else if (el.esBranding) {
                ctx.font = `900 ${el.fontSize}px Montserrat, sans-serif`;
                ctx.fillStyle = el.color;
                ctx.textAlign = 'center';
                ctx.fillText(el.texto, el.x, el.y);
                ctx.font = `500 26px Montserrat, sans-serif`;
                ctx.fillStyle = '#555';
                ctx.fillText('AUTOS SELECCIONADOS', el.x, el.y + 36);
            } else {
                ctx.font = `${el.bold ? '900' : '500'} ${el.fontSize}px Montserrat, sans-serif`;
                ctx.fillStyle = el.color;
                ctx.textAlign = 'left';
                ctx.fillText(el.texto, el.x, el.y);
            }

            if (FV.elSeleccionado && FV.elSeleccionado.id === el.id) {
                ctx.font = `${el.bold ? '900' : '500'} ${el.fontSize}px Montserrat, sans-serif`;
                const tw = ctx.measureText(el.texto).width;
                ctx.strokeStyle = '#1a8fe3';
                ctx.lineWidth = 2;
                ctx.strokeRect(el.x - 8, el.y - el.fontSize - 4, tw + 16, el.fontSize + 16);
            }
        });

    } else {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, W, H);
        const logoEl = FV.elementos.find(e => e.id === 'logo');
        if (logoEl) {
            ctx.font = `900 ${logoEl.fontSize}px Montserrat, sans-serif`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('TODO @L DÍA', logoEl.x, logoEl.y);
            ctx.font = `500 22px Montserrat, sans-serif`;
            ctx.fillStyle = '#ccc';
            ctx.fillText('AUTOS SELECCIONADOS', logoEl.x, logoEl.y + 30);
        }
    }
}

// ── INTERACCIÓN CANVAS ────────────────────────
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
        const x0 = el.esBranding ? el.x - tw/2 - 10 : el.x - 10;
        const y0 = el.y - el.fontSize - 4;
        const x1 = x0 + tw + 20;
        const y1 = y0 + el.fontSize + 20;
        if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) return el;
    }
    return null;
}

function fvBindCanvas() {
    const canvas = FV.canvas;

    // Clonar el canvas para remover todos los listeners anteriores
    const nuevo = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(nuevo, canvas);
    FV.canvas = nuevo;

    let dragStart = null;

    nuevo.addEventListener('mousedown', e => {
        const pos = fvGetCanvasPos(e.clientX, e.clientY);
        const hit = fvHitTest(pos.x, pos.y);
        if (hit) {
            FV.elSeleccionado = hit;
            dragStart = { mx: e.clientX, my: e.clientY, ex: hit.x, ey: hit.y };
            fvMostrarToolbar(); fvDraw();
        } else {
            FV.elSeleccionado = null;
            dragStart = { mx: e.clientX, my: e.clientY, isImg: true, ox: FV.imgOffsetX, oy: FV.imgOffsetY };
            fvOcultarToolbar(); fvDraw();
        }
    });

    nuevo.addEventListener('mousemove', e => {
        if (!dragStart) return;
        const rect = FV.canvas.getBoundingClientRect();
        const scaleX = FV.W / rect.width;
        const scaleY = FV.H / rect.height;
        const dx = (e.clientX - dragStart.mx) * scaleX;
        const dy = (e.clientY - dragStart.my) * scaleY;
        if (dragStart.isImg) { FV.imgOffsetX = dragStart.ox + dx; FV.imgOffsetY = dragStart.oy + dy; }
        else if (FV.elSeleccionado) { FV.elSeleccionado.x = dragStart.ex + dx; FV.elSeleccionado.y = dragStart.ey + dy; }
        fvDraw();
    });

    nuevo.addEventListener('mouseup', () => { dragStart = null; });
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
            const t = e.touches[0];
            const pos = fvGetCanvasPos(t.clientX, t.clientY);
            const hit = fvHitTest(pos.x, pos.y);
            touchStart = { tx: t.clientX, ty: t.clientY, hit, ex: hit ? hit.x : FV.imgOffsetX, ey: hit ? hit.y : FV.imgOffsetY };
            if (hit) { FV.elSeleccionado = hit; fvMostrarToolbar(); fvDraw(); }
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinch = Math.sqrt(dx*dx + dy*dy);
        }
    }, { passive: false });

    nuevo.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && touchStart) {
            const t = e.touches[0];
            const rect = FV.canvas.getBoundingClientRect();
            const scaleX = FV.W / rect.width;
            const scaleY = FV.H / rect.height;
            const dx = (t.clientX - touchStart.tx) * scaleX;
            const dy = (t.clientY - touchStart.ty) * scaleY;
            if (touchStart.hit) { touchStart.hit.x = touchStart.ex + dx; touchStart.hit.y = touchStart.ey + dy; }
            else { FV.imgOffsetX = touchStart.ex + dx; FV.imgOffsetY = touchStart.ey + dy; }
            fvDraw();
        } else if (e.touches.length === 2 && lastPinch !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const slider = document.getElementById('fv-zoom');
            slider.value = Math.min(3, Math.max(0.5, parseFloat(slider.value) + (dist - lastPinch) * 0.003));
            lastPinch = dist;
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

// ── EDITOR TEXTO INLINE ───────────────────────
function fvAbrirEditorTexto(el, clientX, clientY) {
    const input = document.getElementById('fv-texto-input');
    const wrap  = document.getElementById('fv-canvas-wrap');
    const rect  = FV.canvas.getBoundingClientRect();
    const wrapR = wrap.getBoundingClientRect();
    input.value = el.texto;
    input.style.display  = 'block';
    input.style.fontSize = Math.round(el.fontSize * (rect.width / FV.W)) + 'px';
    input.style.fontWeight = el.bold ? '900' : '500';
    input.style.left = (clientX - wrapR.left - 60) + 'px';
    input.style.top  = (clientY - wrapR.top  - 20) + 'px';
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

// ── TOOLBAR ───────────────────────────────────
function fvMostrarToolbar() { document.getElementById('fv-toolbar').style.display = 'flex'; }
function fvOcultarToolbar() { document.getElementById('fv-toolbar').style.display = 'none'; }
function fvDeseleccionar()  { FV.elSeleccionado = null; fvOcultarToolbar(); fvDraw(); }
function fvToolbarFontSize(delta) { if (FV.elSeleccionado) { FV.elSeleccionado.fontSize = Math.max(14, FV.elSeleccionado.fontSize + delta); fvDraw(); } }
function fvToolbarColor(color)    { if (FV.elSeleccionado) { FV.elSeleccionado.color = color; fvDraw(); } }

// ── BULLETS IA ───────────────────────────────
async function fvGenerarBulletsIA() {
    if (!FV.autoData) { alert('Elegí un auto primero'); return; }
    const d = FV.autoData;
    document.getElementById('fv-loading-bullets').style.display = 'block';
    const prompt = `Generá 3 bullets cortos (máximo 6 palabras cada uno) para una placa de Instagram de este auto usado:\n${d.marca} ${d.modelo} ${d.anio} · ${Number(d.km).toLocaleString('es-AR')} km\nDetalles: ${d.detalles || ''}\nFormato: devolvé solo los 3 bullets, uno por línea, sin numeración, sin guiones, empezando con punto bullet •`;
    try {
        const res  = await fetch('/api/claude/', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt }) });
        const data = await res.json();
        const texto = data.respuesta || data.texto || data.content || '';
        const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 3);
        if (lineas[0]) { document.getElementById('fv-bullet-1').value = lineas[0]; const el = FV.elementos.find(e=>e.id==='bullet1'); if(el) el.texto = lineas[0]; }
        if (lineas[1]) { document.getElementById('fv-bullet-2').value = lineas[1]; const el = FV.elementos.find(e=>e.id==='bullet2'); if(el) el.texto = lineas[1]; }
        if (lineas[2]) { document.getElementById('fv-bullet-3').value = lineas[2]; const el = FV.elementos.find(e=>e.id==='bullet3'); if(el) el.texto = lineas[2]; }
        fvDraw();
    } catch(err) { console.error('Error bullets IA:', err); }
    finally { document.getElementById('fv-loading-bullets').style.display = 'none'; }
}

// ── FOTOS ─────────────────────────────────────
function fvCargarFotosCRM(d) {
    const cont  = document.getElementById('fv-fotos-crm');
    const fotos = d.fotos || [];
    if (!fotos.length) { cont.innerHTML = '<div style="color:#444;font-size:10px;">Sin fotos</div>'; return; }
    cont.innerHTML = fotos.map(f => `
        <img src="${f.imagen_url}" 
             onclick="fvCargarFotoURL('${f.imagen_url}')"
             style="width:52px;height:40px;object-fit:cover;border-radius:5px;cursor:pointer;border:2px solid transparent;"
             onmouseover="this.style.borderColor='#E31E24'"
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
        FV.imgFondo = img;
        FV.imgOffsetX = 0;
        FV.imgOffsetY = 0;
        FV.imgZoom = 1;
        document.getElementById('fv-zoom').value = 1;
        fvDraw();
    };
    img.onerror = () => {
        const img2 = new Image();
        img2.onload = () => {
            FV.imgFondo = img2;
            FV.imgOffsetX = 0;
            FV.imgOffsetY = 0;
            FV.imgZoom = 1;
            document.getElementById('fv-zoom').value = 1;
            fvDraw();
        };
        img2.src = url + '?nocache=' + Date.now();
    };
    img.src = url + '?t=' + Date.now();
}

// ── SELECTOR DE AUTO ──────────────────────────
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
        opt.value = a.id;
        opt.textContent = `${a.marca} ${a.modelo} ${a.anio} · ${a.estado_display}`;
        if (typeof AUTO_ID_ACTUAL !== 'undefined' && AUTO_ID_ACTUAL && a.id == AUTO_ID_ACTUAL) opt.selected = true;
        sel.appendChild(opt);
    });
    FV.todosLosAutos = todos;

    // Si hay auto preseleccionado, cargarlo
    if (typeof AUTO_ID_ACTUAL !== 'undefined' && AUTO_ID_ACTUAL) {
        fvCambiarAuto(AUTO_ID_ACTUAL);
    }
}

async function fvCambiarAuto(autoId) {
    if (!autoId) return;
    const res = await fetch(`/auto/${autoId}/json/`);
    const d = await res.json();
    FV.autoData = d;
    document.getElementById('fv-titulo').value = `${d.marca} ${d.modelo} ${d.anio}`.toUpperCase();
    document.getElementById('fv-badge').value = 'NUEVO INGRESO';
    fvCargarFotosCRM(d);
    const principal = (d.fotos || []).find(f => f.es_principal) || (d.fotos || [])[0];
    if (principal) fvCargarFotoURL(principal.imagen_url);
    document.getElementById('fv-bullet-1').value = '';
    document.getElementById('fv-bullet-2').value = '';
    document.getElementById('fv-bullet-3').value = '';
    fvSetModo(FV.modo);
}

// ── DESCARGA ──────────────────────────────────
function fvDescargar() {
    if (!FV.canvas) return;
    const nombre = FV.autoData
        ? `${FV.autoData.marca}_${FV.autoData.modelo}_${FV.autoData.anio}_${FV.modo}`
        : `placa_${FV.modo}`;
    const link = document.createElement('a');
    link.download = nombre.replace(/\s/g, '_') + '.png';
    link.href = FV.canvas.toDataURL('image/png');
    link.click();
}

// ── ASIGNAR A AUTO ────────────────────────────
function fvAsignarAuto() {
    const modal = document.getElementById('fv-asignar-modal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    fvFiltrarAutos('');
}

function fvFiltrarAutos(q) {
    const lista = document.getElementById('fv-asignar-lista');
    const filtrados = FV.todosLosAutos.filter(a =>
        `${a.marca} ${a.modelo} ${a.anio}`.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 20);
    lista.innerHTML = filtrados.map(a => `
        <div onclick="fvSeleccionarAutoAsignar(${a.id})"
             id="fv-auto-item-${a.id}"
             style="padding:7px 10px;border-radius:6px;cursor:pointer;
                    background:${FV.autoAsignarId===a.id?'#E31E24':'#1a1a1a'};
                    border:1px solid ${FV.autoAsignarId===a.id?'#E31E24':'#2a2a2a'};
                    font-size:10px;color:#fff;font-weight:700;font-family:'Montserrat',sans-serif;">
            ${a.marca} ${a.modelo} ${a.anio}
            <span style="color:#555;font-weight:400;">· ${a._tab}</span>
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
        form.append('foto', blob, `placa_${FV.modo}.png`);
        form.append('tipo', FV.modo);
        try {
            const res = await fetch(`/auto/${FV.autoAsignarId}/subir-foto/`, {
                method: 'POST',
                body: form,
                headers: { 'X-CSRFToken': getCookie('csrftoken') }
            });
            if (res.ok) {
                alert('✅ Foto guardada en el auto');
                document.getElementById('fv-asignar-modal').style.display = 'none';
            } else {
                alert('❌ Error al guardar');
            }
        } catch(e) { console.error(e); alert('❌ Error de red'); }
    }, 'image/png');
}

// ── CERRAR ────────────────────────────────────
function fvCerrar() {
    document.getElementById('panel-fotos-vehiculo').style.display = 'none';
    if (document.getElementById('grid-section'))
        document.getElementById('grid-section').style.display = 'block';
    document.querySelectorAll('.tab-mkt').forEach(t => t.className = 'tab-mkt inactivo');
}