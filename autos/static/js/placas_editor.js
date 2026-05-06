// EDITOR DE PLACAS MKT
// ══════════════════════════════════════════════

const MKT_TIPOS = [
    { id: 'consignacion', label: '🔑 Consignación',
      titulo: 'VENDE TU AUTO\nSIN MOVERTE DE CASA',
      subtexto: 'Nos encargamos de todo: fotos,\npublicación y trámites.\nVos cobrás cuando se vende.',
      cta: '📲 Consultá sin compromiso → 11-6095-8854' },
    { id: 'permuta', label: '🔄 Permuta',
      titulo: 'TOMAMOS TU AUTO\nEN PARTE DE PAGO',
      subtexto: 'Permutamos con autos y motos.\nConsultanos sin compromiso.',
      cta: '📲 Hablá con nosotros' },
    { id: 'financiacion', label: '🏦 Financiación',
      titulo: 'FINANCIAMOS\nTU PRÓXIMO AUTO',
      subtexto: 'Trabajamos con los mejores bancos.\nCuotas fijas y tasas convenientes.',
      cta: '📲 Pedí tu plan hoy' },
    { id: 'whatsapp', label: '📲 WhatsApp',
      titulo: '¿BUSCÁS\nTU PRÓXIMO AUTO?',
      subtexto: 'Escribinos y te asesoramos sin cargo.\nStock renovado cada semana.',
      cta: '📲 Estamos disponibles' },
    { id: 'stock', label: '🚗 Stock',
      titulo: 'AMPLIO STOCK DE\nAUTOS SELECCIONADOS',
      subtexto: 'Todos con papeles al día\ny revisión completa.\nVisitanos en Caballito.',
      cta: '📲 Ver stock disponible' },
];

let mktConfig = {
    tipo: 'consignacion',
    editor: 'post',
    subtab: 'texto',
    imagen: null,
    imagen2: null,
    titulo: MKT_TIPOS[0].titulo,
    subtexto: MKT_TIPOS[0].subtexto,
    cta: MKT_TIPOS[0].cta,
    titleSize: 88,
    titleY: 62,
    titlePad: 10,
    bodySize: 38,
    bodyY: 70,
    bodyPad: 10,
    ctaSize: 34,
    ctaY: 80,
    ctaPad: 10,
    gradientOpacity: 0.62,
    blur: 0,
    brandingPad: 10,
    brandingY: 91,
    layout: 1,
    modo: 'completo',
    frase: '',
    padding: 110,
    fotoOffsetY: 0,
    foto2OffsetY: 0,
};
let mktDrawTimer = null;

// ══════════════════════════════════════════════
// ESTADO INTERACTIVO MKT
// ══════════════════════════════════════════════

const MKT = {
    canvas: null, ctx: null, elSeleccionado: null,
    elementos: [
        { id: 'titulo', texto: '', x: 0, y: 0, fontSize: 88, hasMoved: false, hasResized: false, textAlign: 'left', color: '#fff', bold: true },
        { id: 'subtexto', texto: '', x: 0, y: 0, fontSize: 38, hasMoved: false, hasResized: false, textAlign: 'left', color: '#fff', bold: false },
        { id: 'cta', texto: '', x: 0, y: 0, fontSize: 34, hasMoved: false, hasResized: false, textAlign: 'left', color: '#E31E24', bold: true },
        { id: 'frase', texto: '', x: 0, y: 0, fontSize: 110, hasMoved: false, hasResized: false, textAlign: 'center', color: '#fff', bold: true },
        { id: 'urgencia', texto: 'OPORTUNIDAD ÚNICA', x: 0, y: 0, fontSize: 90, hasMoved: false, hasResized: false, textAlign: 'center', color: '#fff', bold: true }
    ]
};

function mktGetCanvasPos(clientX, clientY) {
    const rect = MKT.canvas.getBoundingClientRect();
    const DPR = 2; // Usás DPR = 2 en tu mktDraw()
    const scaleX = (MKT.canvas.width / DPR) / rect.width;
    const scaleY = (MKT.canvas.height / DPR) / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function mktHitTest(cx, cy) {
    for (let i = MKT.elementos.length - 1; i >= 0; i--) {
        const el = MKT.elementos[i];
        if (!el.texto) continue;
        const w = el._w || 200, h = el._h || el.fontSize;
        let x0 = el.x - 10;
        if (el.textAlign === 'center') x0 = el.x - (w / 2) - 10;
        const y0 = el.y - 10;
        if (cx >= x0 && cx <= x0 + w + 20 && cy >= y0 && cy <= y0 + h + 20) return el;
    }
    return null;
}

function mktBindCanvas() {
    const canvasViejo = document.getElementById('mkt-canvas');
    const nuevo = canvasViejo.cloneNode(true);
    canvasViejo.parentNode.replaceChild(nuevo, canvasViejo);
    MKT.canvas = nuevo;
    MKT.ctx = nuevo.getContext('2d');

    let dragStart = null;

    function handleStart(clientX, clientY) {
        const pos = mktGetCanvasPos(clientX, clientY);
        const hit = mktHitTest(pos.x, pos.y);
        if (hit) {
            MKT.elSeleccionado = hit;
            dragStart = { mx: clientX, my: clientY, ex: hit.x, ey: hit.y };
            document.getElementById('mkt-toolbar').style.display = 'flex';
        } else {
            MKT.elSeleccionado = null;
            document.getElementById('mkt-toolbar').style.display = 'none';
        }
        mktDraw();
    }

    function handleMove(clientX, clientY) {
        if (!dragStart || !MKT.elSeleccionado) return;
        const rect = MKT.canvas.getBoundingClientRect();
        const DPR = 2;
        const scaleX = (MKT.canvas.width / DPR) / rect.width;
        const scaleY = (MKT.canvas.height / DPR) / rect.height;
        
        MKT.elSeleccionado.x = dragStart.ex + (clientX - dragStart.mx) * scaleX;
        MKT.elSeleccionado.y = dragStart.ey + (clientY - dragStart.my) * scaleY;
        MKT.elSeleccionado.hasMoved = true;
        mktDraw();
    }

    nuevo.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
    nuevo.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
    nuevo.addEventListener('mouseup', () => dragStart = null);
    nuevo.addEventListener('mouseleave', () => dragStart = null);
    
    nuevo.addEventListener('touchstart', e => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
    nuevo.addEventListener('touchmove', e => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
    nuevo.addEventListener('touchend', () => dragStart = null);

    nuevo.addEventListener('dblclick', e => {
        const pos = mktGetCanvasPos(e.clientX, e.clientY);
        const hit = mktHitTest(pos.x, pos.y);
        if (hit) mktAbrirEditorTexto(hit, e.clientX, e.clientY);
    });
}

function mktAbrirEditorTexto(el, cx, cy) {
    const input = document.getElementById('mkt-texto-input');
    const wrap = document.getElementById('mkt-canvas-wrap');
    const wrapR = wrap.getBoundingClientRect();
    input.value = el.texto;
    input.style.display = 'block';
    input.style.left = (cx - wrapR.left - 60) + 'px';
    input.style.top = (cy - wrapR.top - 20) + 'px';
    input._el = el;
    input.focus(); input.select();
}

function mktTextoInputChange() {
    const input = document.getElementById('mkt-texto-input');
    if (!input._el) return;
    input._el.texto = input.value;
    // Agregamos 'urgencia' al mapa:
    const map = { titulo:'mkt-titulo', subtexto:'mkt-subtexto', cta:'mkt-cta', frase:'mkt-frase', urgencia:'mkt-urgencia' };
    if (map[input._el.id]) document.getElementById(map[input._el.id]).value = input.value;
    // Actualiza la variable config interna para urgencia si aplica
    if (input._el.id === 'urgencia') mktConfig.urgenciaTexto = input.value;
    mktDraw();
}
    
function mktTextoInputBlur() { document.getElementById('mkt-texto-input').style.display = 'none'; }
function mktDeseleccionar() { MKT.elSeleccionado = null; document.getElementById('mkt-toolbar').style.display = 'none'; mktDraw(); }
function mktToolbarFontSize(delta) { if(MKT.elSeleccionado){ MKT.elSeleccionado.fontSize += delta; MKT.elSeleccionado.hasResized=true; mktDraw(); } }

// Inicializar el editor cuando se abre el panel
function mktInit() {
    // Renderizar botones de tipos
    const tiposEl = document.getElementById('mkt-tipos');
    if (!tiposEl || tiposEl.dataset.init) return;
    tiposEl.dataset.init = '1';

    // Renderizar botones de layouts STORY
    const layoutsEl = document.getElementById('mkt-layouts');
    const layoutDefsStory = [
        { id:1, icon:'⬆️📷', label:'Texto arriba\nFoto abajo' },
        { id:2, icon:'🖼️',   label:'Foto full\ntexto centro' }, 
        { id:3, icon:'◧',    label:'Dos zonas\nimg+texto' },
        { id:4, icon:'🏷️',   label:'Logo arriba\nCTA grande' },
        { id:5, icon:'✏️',   label:'Solo texto\nsin foto' },
        { id:6, icon:'⬆️⬇️', label:'Doble foto' },
        { id:7, icon:'🔴',   label:'Urgencia\nbanda color' },
    ];
    layoutDefsStory.forEach(l => {
        const btn = document.createElement('button');
        btn.id = `mkt-layout-story-${l.id}`;
        btn.onclick = () => mktSetLayout(l.id);
        btn.style.cssText = `padding:8px 4px; border-radius:7px; border:1px solid;
            border-color:${l.id === 1 ? '#E31E24' : '#222'};
            background:${l.id === 1 ? 'rgba(227,30,36,0.12)' : '#181818'};
            color:${l.id === 1 ? '#E31E24' : '#555'};
            font-size:9px; font-weight:700; cursor:pointer; text-align:center;
            font-family:'Montserrat',sans-serif; line-height:1.4;`;
        btn.innerHTML = `<div style="font-size:14px; margin-bottom:3px;">${l.icon}</div>${l.label.replace('\n','<br>')}`;
        layoutsEl.appendChild(btn);
    });

    // Renderizar botones de layouts POST
    const layoutsPostEl = document.getElementById('mkt-layouts-post');
    const layoutDefsPost = [
        { id:1, icon:'⬇️',  label:'Texto\nabajo' },
        { id:2, icon:'⬆️',  label:'Texto\narriba' },
        { id:3, icon:'✕',   label:'Sin\ntexto' },
        { id:4, icon:'⊙',   label:'Texto\ncentrado' },
        { id:5, icon:'⬆️⬇️', label:'Doble\nfoto' },
    ];
    layoutDefsPost.forEach(l => {
        const btn = document.createElement('button');
        btn.id = `mkt-layout-post-${l.id}`;
        btn.onclick = () => mktSetLayout(l.id);
        btn.style.cssText = `padding:8px 4px; border-radius:7px; border:1px solid;
            border-color:${l.id === 1 ? '#E31E24' : '#222'};
            background:${l.id === 1 ? 'rgba(227,30,36,0.12)' : '#181818'};
            color:${l.id === 1 ? '#E31E24' : '#555'};
            font-size:9px; font-weight:700; cursor:pointer; text-align:center;
            font-family:'Montserrat',sans-serif; line-height:1.4;`;
        btn.innerHTML = `<div style="font-size:14px; margin-bottom:3px;">${l.icon}</div>${l.label.replace('\n','<br>')}`;
        layoutsPostEl.appendChild(btn);
    });

    mktConfig.layout = 1;
    mktConfig.modo = 'completo';
    mktConfig.frase = MKT_TIPOS[0].frase || 'TU AUTO VENDIDO SIN ESFUERZO';

    MKT_TIPOS.forEach(t => {
        const btn = document.createElement('button');
        btn.id = `mkt-tipo-${t.id}`;
        btn.textContent = t.label;
        btn.onclick = () => mktCambiarTipo(t.id);
        btn.style.cssText = `padding:8px 12px; border-radius:7px; border:1px solid;
            border-color:${t.id === mktConfig.tipo ? '#E31E24' : '#222'};
            background:${t.id === mktConfig.tipo ? 'rgba(227,30,36,0.12)' : 'transparent'};
            color:${t.id === mktConfig.tipo ? '#E31E24' : '#555'};
            font-size:11px; font-weight:700; cursor:pointer; text-align:left;
            font-family:'Montserrat',sans-serif; transition:all .15s;`;
        tiposEl.appendChild(btn);
    });

    
    mktConfig.textY = 28;

    // Cargar textos iniciales
    document.getElementById('mkt-titulo').value = mktConfig.titulo;
    document.getElementById('mkt-subtexto').value = mktConfig.subtexto;
    document.getElementById('mkt-cta').value = mktConfig.cta;

    mktDraw();
    mktBindCanvas();
}

function mktCambiarTipo(id) {
    const t = MKT_TIPOS.find(x => x.id === id);
    mktConfig.tipo = id;
    mktConfig.titulo   = t.titulo;
    mktConfig.subtexto = t.subtexto;
    mktConfig.cta      = t.cta;

    document.getElementById('mkt-titulo').value   = t.titulo;
    document.getElementById('mkt-subtexto').value = t.subtexto;
    document.getElementById('mkt-cta').value      = t.cta;

    // Actualizar estilos botones
    MKT_TIPOS.forEach(x => {
        const btn = document.getElementById(`mkt-tipo-${x.id}`);
        if (!btn) return;
        btn.style.borderColor = x.id === id ? '#E31E24' : '#222';
        btn.style.background  = x.id === id ? 'rgba(227,30,36,0.12)' : 'transparent';
        btn.style.color       = x.id === id ? '#E31E24' : '#555';
    });
    // Actualizar frase también
    const t2 = MKT_TIPOS.find(x => x.id === id);
    if (t2 && t2.frase) {
        mktConfig.frase = t2.frase;
        const fraseEl = document.getElementById('mkt-frase');
        if (fraseEl) fraseEl.value = t2.frase;
    }
    mktDraw();
}

function mktSwitchEditor(tipo) {
    mktConfig.editor = tipo;
    const isPost = tipo === 'post';

    // Actualizar tabs
    document.getElementById('mkt-tab-post').style.borderBottomColor  = isPost ? '#E31E24' : 'transparent';
    document.getElementById('mkt-tab-post').style.color              = isPost ? '#E31E24' : '#444';
    document.getElementById('mkt-tab-story').style.borderBottomColor = isPost ? 'transparent' : '#E31E24';
    document.getElementById('mkt-tab-story').style.color             = isPost ? '#444' : '#E31E24';

    // Mostrar el set de layouts correcto
    document.getElementById('mkt-layouts-wrap').style.display      = isPost ? 'none' : 'block';
    document.getElementById('mkt-layouts-post-wrap').style.display = isPost ? 'block' : 'none';
    document.getElementById('mkt-modo-wrap').style.display         = isPost ? 'none' : 'block';

    // Resetear layout al 1 cuando cambia de modo
    mktConfig.layout = 1;
    mktSetLayout(1);

    // Ajustar canvas
    const canvas = document.getElementById('mkt-canvas');
    if (isPost) {
        canvas.style.width  = '320px';
        canvas.style.height = '400px';
        document.getElementById('mkt-preview-label').textContent = 'POST 4:5 · 1080×1350px';
    } else {
        canvas.style.width  = '220px';
        canvas.style.height = '390px';
        document.getElementById('mkt-preview-label').textContent = 'STORY 9:16 · 1080×1920px';
    }
    mktDraw();
}


function mktSetLayout(id) {
    mktConfig.layout = id;
    const isPost = mktConfig.editor === 'post';

    // 1. EL FIX: Resetear cualquier movimiento manual previo al cambiar de layout
    MKT.elementos.forEach(el => {
        el.hasMoved = false;
        el.hasResized = false;
    });

    // 2. DEFINIR POSICIONES POR DEFECTO (Asegura que el layout nuevo tome el control total)
    if (isPost) {
        const defaults = {
            1: { titleY: 55, bodyY: 78, ctaY: 88, brandingY: 94 },
            2: { titleY: 4,  bodyY: 24, ctaY: 36, brandingY: 94 },
            3: { titleY: 55, bodyY: 78, ctaY: 88, brandingY: 94 },
            4: { titleY: 36, bodyY: 56, ctaY: 68, brandingY: 94 },
            5: { titleY: 55, bodyY: 78, ctaY: 88, brandingY: 94 },
        };
        const d = defaults[id] || defaults[1];
        mktConfig.titleY    = d.titleY;
        mktConfig.bodyY     = d.bodyY;
        mktConfig.ctaY      = d.ctaY;
        mktConfig.brandingY = d.brandingY;
    } else {
        // Defaults específicos para STORY (ajustados para el formato vertical)
        const defaultsStory = {
            1: { titleY: 28, bodyY: 48, ctaY: 65, brandingY: 91 },
            2: { titleY: 45, bodyY: 65, ctaY: 80, brandingY: 91 },
            3: { titleY: 65, bodyY: 75, ctaY: 85, brandingY: 91 },
            4: { titleY: 48, bodyY: 68, ctaY: 82, brandingY: 91 },
            5: { titleY: 45, bodyY: 65, ctaY: 80, brandingY: 91 },
            6: { titleY: 45, bodyY: 65, ctaY: 80, brandingY: 91 },
            7: { titleY: 30, bodyY: 50, ctaY: 65, brandingY: 91 },
        };
        const d = defaultsStory[id] || defaultsStory[1];
        mktConfig.titleY    = d.titleY;
        mktConfig.bodyY     = d.bodyY;
        mktConfig.ctaY      = d.ctaY;
        mktConfig.brandingY = d.brandingY;
    }

    // Actualizar sliders visualmente para que coincidan con el nuevo layout
    const sliders = ['titleY', 'bodyY', 'ctaY', 'brandingY'];
    sliders.forEach(k => {
        const el = document.querySelector(`input[oninput*="'${k}'"]`);
        if (el) el.value = mktConfig[k];
        const label = document.getElementById(`mkt-val-${k}`);
        if (label) label.textContent = mktConfig[k];
    });

    // Mantener la lógica de visibilidad de botones que ya tenías
    const maxLayouts = isPost ? 5 : 7;
    const prefix = isPost ? 'mkt-layout-post-' : 'mkt-layout-story-';
    for (let i = 1; i <= maxLayouts; i++) {
        const btn = document.getElementById(`${prefix}${i}`);
        if (!btn) continue;
        btn.style.borderColor = i === id ? '#E31E24' : '#222';
        btn.style.background  = i === id ? 'rgba(227,30,36,0.12)' : '#181818';
        btn.style.color       = i === id ? '#E31E24' : '#555';
    }
    
  
    // Visibilidad de paneles extra (Con seguros anti-crasheo)
    const esSinTexto = isPost && id === 3;
    const esDoble = (isPost && id === 5) || (!isPost && id === 6);
    
    const panelCampos = document.getElementById('mkt-campos-texto');
    if (panelCampos) panelCampos.style.display = esSinTexto ? 'none' : 'block';
    
    const panelFoto2Prev = document.getElementById('mkt-foto2-label-preview');
    if (panelFoto2Prev) panelFoto2Prev.style.display = esDoble ? 'block' : 'none';
    
    const panelFoto2Off = document.getElementById('mkt-foto2-offset-wrap');
    if (panelFoto2Off) panelFoto2Off.style.display = esDoble ? 'block' : 'none';
    
    const panelUrgencia = document.getElementById('mkt-urgencia-wrap');
    if (panelUrgencia) panelUrgencia.style.display = (!isPost && id === 7) ? 'block' : 'none';

    mktDraw();
}

function mktSetModo(modo) {
    mktConfig.modo = modo;
    const isCompleto = modo === 'completo';

    document.getElementById('mkt-modo-completo').style.borderBottomColor = isCompleto ? '#E31E24' : 'transparent';
    document.getElementById('mkt-modo-completo').style.color             = isCompleto ? '#E31E24' : '#444';
    document.getElementById('mkt-modo-frase').style.borderBottomColor   = isCompleto ? 'transparent' : '#E31E24';
    document.getElementById('mkt-modo-frase').style.color               = isCompleto ? '#444' : '#E31E24';

    document.getElementById('mkt-frase-wrap').style.display = isCompleto ? 'none' : 'block';
    mktDraw();
}

function mktUpdateSlider(key, val, isFloat) {
    mktConfig[key] = isFloat ? parseInt(val) / 100 : parseInt(val);
    const label = document.getElementById(`mkt-val-${key}`);
    if (label) label.textContent = isFloat ? (parseInt(val)/100).toFixed(2) : val;

    // Si movemos un slider, le quitamos la prioridad al movimiento manual
    const mapa = { 'titleY': 'titulo', 'titleSize': 'titulo', 'bodyY': 'subtexto', 'bodySize': 'subtexto', 'ctaY': 'cta', 'ctaSize': 'cta' };
    const idEl = mapa[key];
    if (idEl) {
        const el = MKT.elementos.find(e => e.id === idEl);
        if (el) {
            if (key.includes('Size')) el.hasResized = false;
            else el.hasMoved = false;
        }
    }
    mktDraw();
}

function mktCargarFoto2(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            mktConfig.imagen2 = img;
            const label = document.getElementById('mkt-foto2-label');
            const inp = label.querySelector('input');
            label.textContent = '✅ Foto 2 cargada — clic para cambiar';
            label.appendChild(inp);
            mktDraw();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function mktCargarFoto(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            mktConfig.imagen = img;
            const label = document.getElementById('mkt-foto-label');
            label.style.borderColor = '#E31E24';
            label.style.color = '#E31E24';
            label.style.background = 'rgba(227,30,36,0.1)';
            // Reemplazar texto manteniendo el input
            const input = label.querySelector('input');
            label.textContent = '✅ Foto cargada — clic para cambiar';
            label.appendChild(input);
            mktDraw();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function mktWrapText(ctx, el, defaultX, defaultY, maxW, lineH, align) {
    if (!el) return defaultY;
    // Forzamos posiciones si no se movió manualmente
    if (!el.hasMoved) { el.x = defaultX; el.y = defaultY; }
    el.textAlign = align || 'left';
    
    ctx.textAlign = el.textAlign;
    ctx.textBaseline = 'top';
    const paragraphs = el.texto.split('\n');
    let curY = el.y;
    let maxLineWidth = 0;

    paragraphs.forEach(para => {
        const words = para.split(' ');
        let line = '';
        words.forEach(w => {
            const test = line + w + ' ';
            if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line.trim(), el.x, curY);
                maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line.trim()).width);
                curY += lineH;
                line = w + ' ';
            } else line = test;
        });
        ctx.fillText(line.trim(), el.x, curY);
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line.trim()).width);
        curY += lineH;
    });

    el._w = maxLineWidth;
    el._h = curY - el.y;
    return curY;
}

function mktDrawElementosEditables(ctx) {
    if (!MKT.elSeleccionado) return;
    const el = MKT.elSeleccionado;
    const w = el._w || 200, h = el._h || el.fontSize;
    let x0 = el.x - 10;
    if (el.textAlign === 'center') x0 = el.x - (w / 2) - 10;
    const y0 = el.y - 10;
    ctx.strokeStyle = '#1a8fe3';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0, y0, w + 20, h + 20);
}

function mktDraw() {
    clearTimeout(mktDrawTimer);
    mktDrawTimer = setTimeout(() => {
        const canvas = document.getElementById('mkt-canvas');
        if (!canvas) return;
        const isPost = mktConfig.editor === 'post';
        const W = 1080, H = isPost ? 1350 : 1920;
        const DPR = 2;
        canvas.width  = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width  = isPost ? '320px' : '220px';
        canvas.style.height = isPost ? '400px' : '390px';
        const ctx = canvas.getContext('2d');
        ctx.scale(DPR, DPR);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (!isPost) {
            mktDrawStory(ctx, W, H, canvas);
            return;
        }
        mktDrawPost(ctx, W, H);
        return;
        const cfg = mktConfig;
        const font = document.getElementById('mkt-font').value;
        const titulo   = document.getElementById('mkt-titulo').value;
        const subtexto = document.getElementById('mkt-subtexto').value;
        const cta      = document.getElementById('mkt-cta').value;
        const safeW    = W - cfg.padding * 2;

        // FONDO
        if (cfg.imagen) {
            const img = cfg.imagen;
            const scale = Math.max(W / img.width, H / img.height);
            const ix = (W - img.width * scale) / 2;
            const _ciy = (H - img.height * scale) / 2;
            const iy = _ciy + _ciy * (cfg.fotoOffsetY / 99);
            if (cfg.blur > 0) ctx.filter = `blur(${cfg.blur}px)`;
            ctx.drawImage(img, ix, iy, img.width * scale, img.height * scale);
            ctx.filter = 'none';
            ctx.fillStyle = '#000';
            ctx.globalAlpha = cfg.gradientOpacity;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        } else {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#1a0000');
            g.addColorStop(0.5, '#2a0505');
            g.addColorStop(1, '#000');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

    // LÍNEA ACENTO
            const textStartY = (H * cfg.textY) / 100;
            ctx.fillStyle = '#E31E24';
            ctx.fillRect(cfg.padding, textStartY - 24, 100, 6);

            // TÍTULO
            ctx.fillStyle = '#fff';
            ctx.font = `900 ${cfg.titleSize}px ${font}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            let y = mktWrapText(ctx, titulo.toUpperCase(), cfg.padding, textStartY, safeW, cfg.titleSize * 1.12);

            // Separador después del título
            y += 16;
            ctx.fillStyle = '#E31E24';
            ctx.fillRect(cfg.padding, y, 70, 4);
            y += 28;

            // SUBTEXTO
            ctx.globalAlpha = 0.85;
            ctx.font = `300 ${cfg.bodySize}px ${font}`;
            ctx.fillStyle = '#fff';
            y = mktWrapText(ctx, subtexto, cfg.padding, y, safeW, cfg.bodySize * 1.45);
            ctx.globalAlpha = 1;

            // CTA
            y += 20;
            ctx.font = `700 ${cfg.bodySize * 0.9}px ${font}`;
            ctx.fillStyle = '#E31E24';
            mktWrapText(ctx, cta, cfg.padding, y, safeW, cfg.bodySize * 1.1);

            // BRANDING — siempre fijo en el 91% del alto, nunca se mueve
            const brandingSize = 34;
            const logoY = H * 0.91;

            // Línea separadora
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.15;
            ctx.fillRect(cfg.padding, logoY - 50, W - cfg.padding * 2, 1);
            ctx.globalAlpha = 1;

            // Silueta auto
            ctx.beginPath();
            ctx.strokeStyle = '#E31E24';
            ctx.lineWidth = 5; ctx.lineCap = 'round';
            ctx.moveTo(cfg.padding, logoY - 10);
            ctx.bezierCurveTo(cfg.padding+20, logoY-48, cfg.padding+60, logoY-48, cfg.padding+80, logoY-10);
            ctx.stroke();

            // Nombre
            ctx.fillStyle = '#fff';
            ctx.font = `900 ${brandingSize}px Montserrat, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('TODO @L DÍA', cfg.padding + 96, logoY - 18);

            // Subtítulo
            ctx.globalAlpha = 0.5;
            ctx.font = `300 ${Math.round(brandingSize * 0.52)}px Montserrat, sans-serif`;
            ctx.fillText('Autos Seleccionados · Caballito', cfg.padding + 96, logoY + brandingSize * 0.55);
            ctx.globalAlpha = 1;

        }, 150);
}

function mktDrawPost(ctx, W, H) {
    const cfg    = mktConfig;
    const font   = document.getElementById('mkt-font').value;
    const titulo   = document.getElementById('mkt-titulo') ? document.getElementById('mkt-titulo').value : '';
    const subtexto = document.getElementById('mkt-subtexto') ? document.getElementById('mkt-subtexto').value : '';
    const cta      = document.getElementById('mkt-cta') ? document.getElementById('mkt-cta').value : '';
    const img      = cfg.imagen;
    const layout   = cfg.layout || 1;

    function drawFondo(opacity) {
        if (img) {
            const scale = Math.max(W / img.width, H / img.height);
            const ix = (W - img.width * scale) / 2;
            const _ciy = (H - img.height * scale) / 2;
            const iy = _ciy + _ciy * (cfg.fotoOffsetY / 99);
            if (cfg.blur > 0) ctx.filter = `blur(${cfg.blur}px)`;
            ctx.drawImage(img, ix, iy, img.width * scale, img.height * scale);
            ctx.filter = 'none';
            ctx.fillStyle = '#000';
            ctx.globalAlpha = opacity !== undefined ? opacity : cfg.gradientOpacity;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        } else {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#1a0000');
            g.addColorStop(0.5, '#2a0505');
            g.addColorStop(1, '#000');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }
    }

    function drawTitulo() {
     const x = W * (cfg.titlePad / 100);
     const y = H * (cfg.titleY / 100);
     ctx.fillStyle = '#E31E24';
     ctx.fillRect(x, y - 20, 100, 5);

     const el = MKT.elementos.find(e => e.id === 'titulo');
     el.texto = titulo.toUpperCase();
     if (!el.hasResized) el.fontSize = cfg.titleSize;

     ctx.fillStyle = el.color || '#fff';
     ctx.font = `900 ${el.fontSize}px ${font}`;
     ctx.shadowColor = 'rgba(0,0,0,0.8)';
     ctx.shadowBlur = 16;
     const endY = mktWrapText(ctx, el, x, y, W - x, el.fontSize * 1.12, 'left');
     ctx.shadowBlur = 0;
     return endY;
 }

    function drawSubtexto() {
        const x = W * (cfg.bodyPad / 100);
        const y = H * (cfg.bodyY / 100);

        const el = MKT.elementos.find(e => e.id === 'subtexto');
        el.texto = subtexto;
        if (!el.hasResized) el.fontSize = cfg.bodySize;

        ctx.globalAlpha = 0.85;
        ctx.font = `300 ${el.fontSize}px ${font}`;
        ctx.fillStyle = el.color || '#fff';
        const endY = mktWrapText(ctx, el, x, y, W - x, el.fontSize * 1.45, 'left');
        ctx.globalAlpha = 1;
        return endY;
    }

    function drawCTA() {
        const x = W * (cfg.ctaPad / 100);
        const y = H * (cfg.ctaY / 100);

        const el = MKT.elementos.find(e => e.id === 'cta');
        el.texto = cta;
        if (!el.hasResized) el.fontSize = cfg.ctaSize;

        ctx.font = `700 ${el.fontSize}px ${font}`;
        ctx.fillStyle = el.color || '#E31E24';
        mktWrapText(ctx, el, x, y, W - x, el.fontSize * 1.2, 'left');
    }

    function drawBranding() {
        const logoY = H * (cfg.brandingY / 100);
        const bx = W * (cfg.brandingPad / 100);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(bx, logoY - 44, W - bx*2, 1);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.strokeStyle = '#E31E24';
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.moveTo(bx, logoY - 8);
        ctx.bezierCurveTo(bx+20, logoY-46, bx+60, logoY-46, bx+80, logoY-8);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `900 34px Montserrat, sans-serif`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('TODO @L DÍA', bx + 96, logoY - 18);
        ctx.globalAlpha = 0.5;
        ctx.font = `300 17px Montserrat, sans-serif`;
        ctx.fillText('Autos Seleccionados · Caballito', bx + 96, logoY + 16);
        ctx.globalAlpha = 1;
    }

    function drawLinea() {
        ctx.fillStyle = '#E31E24';
        ctx.fillRect(0, 0, W, 8);
    }

    if (layout === 1) {
        drawFondo(cfg.gradientOpacity);
        drawLinea();
        drawTitulo();
        drawSubtexto();
        drawCTA();
        drawBranding();

    } else if (layout === 2) {
        drawFondo(cfg.gradientOpacity);
        const gTop = ctx.createLinearGradient(0, 0, 0, H * 0.55);
        gTop.addColorStop(0, 'rgba(0,0,0,0.75)');
        gTop.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gTop; ctx.fillRect(0, 0, W, H * 0.55);
        drawLinea();
        drawTitulo();
        drawSubtexto();
        drawCTA();
        drawBranding();

    } else if (layout === 3) {
        drawFondo(0.15);
        drawLinea();
        const gBot = ctx.createLinearGradient(0, H * 0.75, 0, H);
        gBot.addColorStop(0, 'rgba(0,0,0,0)');
        gBot.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = gBot; ctx.fillRect(0, H * 0.75, W, H * 0.25);
        drawBranding();

    } else if (layout === 4) {
        drawFondo(cfg.gradientOpacity);
        const gCenter = ctx.createRadialGradient(W/2, H/2, 80, W/2, H/2, W * 0.85);
        gCenter.addColorStop(0, 'rgba(0,0,0,0.55)');
        gCenter.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gCenter; ctx.fillRect(0, 0, W, H);
        drawLinea();
        const tY4 = H * (cfg.titleY / 100);
        ctx.fillStyle = '#E31E24'; ctx.fillRect(W/2 - 50, tY4 - 20, 100, 5);
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${cfg.titleSize}px ${font}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 16;
        mktWrapText(ctx, titulo.toUpperCase(), W/2, tY4, W - cfg.titlePad*2, cfg.titleSize * 1.12, 'center');
        ctx.shadowBlur = 0;
        const bY4 = H * (cfg.bodyY / 100);
        ctx.globalAlpha = 0.85;
        ctx.font = `300 ${cfg.bodySize}px ${font}`;
        ctx.fillStyle = '#fff';
        mktWrapText(ctx, subtexto, W/2, bY4, W - cfg.bodyPad*2, cfg.bodySize * 1.45, 'center');
        ctx.globalAlpha = 1;
        const cY4 = H * (cfg.ctaY / 100);
        ctx.font = `700 ${cfg.ctaSize}px ${font}`;
        ctx.fillStyle = '#E31E24';
        mktWrapText(ctx, cta, W/2, cY4, W - cfg.ctaPad*2, cfg.ctaSize * 1.2, 'center');
        ctx.textAlign = 'left';
        drawBranding();

    } else if (layout === 5) {
        const topH = H * 0.47, botH = H * 0.47;
        const midY = topH, midH = H - topH - botH;
        if (img) {
            const scale = Math.max(W / img.width, topH / img.height);
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, W, topH); ctx.clip();
            ctx.drawImage(img, (W - img.width*scale)/2, (topH - img.height*scale)/2, img.width*scale, img.height*scale);
            ctx.restore();
        } else {
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, W, topH);
        }
        if (cfg.imagen2) {
            const scale2 = Math.max(W / cfg.imagen2.width, botH / cfg.imagen2.height);
            ctx.save();
            ctx.beginPath(); ctx.rect(0, H - botH, W, botH); ctx.clip();
            ctx.drawImage(cfg.imagen2, (W - cfg.imagen2.width*scale2)/2, H - botH + (botH - cfg.imagen2.height*scale2)/2 + (cfg.foto2OffsetY / 100) * botH, cfg.imagen2.width*scale2, cfg.imagen2.height*scale2);
            ctx.restore();
        } else {
            ctx.fillStyle = '#111'; ctx.fillRect(0, H - botH, W, botH);
            ctx.fillStyle = '#2a2a2a';
            ctx.font = '700 32px Montserrat, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('📷 Cargar foto 2', W/2, H - botH/2);
            ctx.textAlign = 'left';
        }
        ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, midY, W, midH);
        ctx.fillStyle = '#E31E24'; ctx.fillRect(0, midY, W, 5);
        ctx.fillStyle = '#E31E24'; ctx.fillRect(0, midY + midH - 5, W, 5);
        drawLinea();
        drawBranding();
    }
    mktDrawElementosEditables(ctx);
}

function mktDrawStory(ctx, W, H, canvas) {
    const cfg = mktConfig;
    const font = document.getElementById('mkt-font').value;
    const titulo   = document.getElementById('mkt-titulo').value;
    const subtexto = document.getElementById('mkt-subtexto').value;
    const cta      = document.getElementById('mkt-cta').value;
    const frase    = document.getElementById('mkt-frase') ? document.getElementById('mkt-frase').value : '';
    const img      = cfg.imagen;
    const layout   = cfg.layout || 1;
    const modo     = cfg.modo || 'completo';

    function drawFondo(x, y, w, h, opacity) {
        if (img) {
            const scale = Math.max(w / img.width, h / img.height);
            const ix = x + (w - img.width * scale) / 2;
            const _ciy = (h - img.height * scale) / 2;
            const iy = y + _ciy + _ciy * (cfg.fotoOffsetY / 99);
            ctx.save();
            ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
            if (cfg.blur > 0) ctx.filter = `blur(${cfg.blur}px)`;
            ctx.drawImage(img, ix, iy, img.width * scale, img.height * scale);
            ctx.filter = 'none';
            ctx.fillStyle = '#000';
            ctx.globalAlpha = opacity !== undefined ? opacity : cfg.gradientOpacity;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1;
            ctx.restore();
        } else {
            const g = ctx.createLinearGradient(x, y, x, y+h);
            g.addColorStop(0, '#1a0000'); g.addColorStop(0.5, '#2a0505'); g.addColorStop(1, '#000');
            ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        }
    }

    function drawBranding() {
        const logoY = H * (cfg.brandingY / 100);
        const bx = W * (cfg.brandingPad / 100);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(bx, logoY - 44, W - bx*2, 1);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#E31E24';
        ctx.fillRect(W/2 - 50, logoY - 52, 100, 5);
        ctx.fillStyle = '#fff';
        ctx.font = `900 40px Montserrat, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12;
        ctx.fillText('TODO @L DÍA', W/2, logoY - 18);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.6;
        ctx.font = `300 22px Montserrat, sans-serif`;
        ctx.fillText('Autos Seleccionados · Caballito', W/2, logoY + 20);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    function drawTextoCompleto() {
        const tY = H * (cfg.titleY / 100);
        const bY = H * (cfg.bodyY / 100);
        const cY = H * (cfg.ctaY / 100);
        const x  = W * (cfg.titlePad / 100);
        const safeW = W - x;

        // TÍTULO
        const elT = MKT.elementos.find(e => e.id === 'titulo');
        elT.texto = titulo.toUpperCase();
        if (!elT.hasResized) elT.fontSize = cfg.titleSize;
        ctx.fillStyle = '#E31E24';
        ctx.fillRect(x, tY - 24, 100, 6);
        ctx.fillStyle = elT.color || '#fff';
        ctx.font = `900 ${elT.fontSize}px ${font}`;
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 16;
        mktWrapText(ctx, elT, x, tY, safeW, elT.fontSize * 1.12, 'left');
        ctx.shadowBlur = 0;

        // SUBTEXTO
        const elS = MKT.elementos.find(e => e.id === 'subtexto');
        elS.texto = subtexto;
        if (!elS.hasResized) elS.fontSize = cfg.bodySize;
        ctx.globalAlpha = 0.85;
        ctx.font = `300 ${elS.fontSize}px ${font}`;
        ctx.fillStyle = elS.color || '#fff';
        mktWrapText(ctx, elS, W * (cfg.bodyPad / 100), bY, W - W*(cfg.bodyPad/100), elS.fontSize * 1.45, 'left');
        ctx.globalAlpha = 1;

        // CTA
        const elC = MKT.elementos.find(e => e.id === 'cta');
        elC.texto = cta;
        if (!elC.hasResized) elC.fontSize = cfg.ctaSize;
        ctx.font = `700 ${elC.fontSize}px ${font}`;
        ctx.fillStyle = elC.color || '#E31E24';
        mktWrapText(ctx, elC, W * (cfg.ctaPad / 100), cY, W - W*(cfg.ctaPad/100), elC.fontSize * 1.2, 'left');
    }

    function drawFrase(centerY) {
        const safeW = W - W * (cfg.titlePad / 100) * 2;
        const elF = MKT.elementos.find(e => e.id === 'frase');
        elF.texto = frase.toUpperCase();
        if (!elF.hasResized) elF.fontSize = cfg.fraseSize || 110;
        ctx.fillStyle = elF.color || '#fff';
        ctx.font = `900 ${elF.fontSize}px ${font}`;
        mktWrapText(ctx, elF, W/2, centerY, safeW, elF.fontSize * 1.1, 'center');
        ctx.textAlign = 'left';
    }

    if (layout === 1) {
        ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, W, H);
        const fotoY = H * 0.48;
        drawFondo(0, fotoY, W, H - fotoY, 0.15);
        const grad = ctx.createLinearGradient(0, fotoY-80, 0, fotoY+100);
        grad.addColorStop(0, '#0d0d0d'); grad.addColorStop(1, 'rgba(13,13,13,0)');
        ctx.fillStyle = grad; ctx.fillRect(0, fotoY-80, W, 180);
        if (modo === 'frase') drawFrase(H * 0.25);
        else drawTextoCompleto();
        drawBranding();

    } else if (layout === 2) {
        drawFondo(0, 0, W, H, cfg.gradientOpacity);
        const g = ctx.createRadialGradient(W/2, H/2, 100, W/2, H/2, W*0.9);
        g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (modo === 'frase') drawFrase(H * 0.45);
        else drawTextoCompleto();
        drawBranding();

    } else if (layout === 3) {
        const splitY = H * 0.52;
        drawFondo(0, 0, W, splitY, 0.15);
        ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, splitY, W, H - splitY);
        ctx.fillStyle = '#E31E24'; ctx.fillRect(0, splitY, W, 6);
        if (modo === 'frase') drawFrase(H * 0.72);
        else drawTextoCompleto();
        drawBranding();

    } else if (layout === 4) {
        drawFondo(0, 0, W, H, cfg.gradientOpacity);
        ctx.fillStyle = '#E31E24'; ctx.fillRect(60, 80, 80, 6);
        ctx.fillStyle = '#fff'; ctx.font = `900 44px Montserrat, sans-serif`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('TODO @L DÍA', 60, 110);
        ctx.globalAlpha = 0.5; ctx.font = `300 22px Montserrat, sans-serif`;
        ctx.fillText('Autos Seleccionados · Caballito', 60, 168);
        ctx.globalAlpha = 1;
        if (modo === 'frase') drawFrase(H * 0.48);
        else drawTextoCompleto();

    } else if (layout === 5) {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#0d0d0d'); g.addColorStop(0.5, '#1a0000'); g.addColorStop(1, '#0d0d0d');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (modo === 'frase') drawFrase(H * 0.45);
        else drawTextoCompleto();
        drawBranding();

    } else if (layout === 6) {
        const topH = H * 0.42, botH = H * 0.42;
        const midY = topH, midH = H - topH - botH;
        if (img) {
            const scale = Math.max(W / img.width, topH / img.height);
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, W, topH); ctx.clip();
            ctx.drawImage(img, (W - img.width*scale)/2, (topH - img.height*scale)/2, img.width*scale, img.height*scale);
            ctx.restore();
        } else {
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, W, topH);
            ctx.fillStyle = '#333'; ctx.font = '700 32px Montserrat, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('📷 Foto 1', W/2, topH/2); ctx.textAlign = 'left';
        }
        if (cfg.imagen2) {
            const scale2 = Math.max(W / cfg.imagen2.width, botH / cfg.imagen2.height);
            ctx.save();
            ctx.beginPath(); ctx.rect(0, H - botH, W, botH); ctx.clip();
            ctx.drawImage(cfg.imagen2, (W - cfg.imagen2.width*scale2)/2, H - botH + (botH - cfg.imagen2.height*scale2)/2 + (cfg.foto2OffsetY / 100) * botH, cfg.imagen2.width*scale2, cfg.imagen2.height*scale2);
            ctx.restore();
        } else {
            ctx.fillStyle = '#111'; ctx.fillRect(0, H - botH, W, botH);
            ctx.fillStyle = '#333'; ctx.font = '700 32px Montserrat, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('📷 Foto 2', W/2, H - botH/2); ctx.textAlign = 'left';
        }
        ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, midY, W, midH);
        ctx.fillStyle = '#E31E24'; ctx.fillRect(0, midY, W, 5);
        ctx.fillStyle = '#E31E24'; ctx.fillRect(0, midY + midH - 5, W, 5);
        
        const elT6 = MKT.elementos.find(e => e.id === 'titulo');
        elT6.texto = titulo.toUpperCase();
        if (!elT6.hasResized) elT6.fontSize = cfg.titleSize * 0.65;
        ctx.fillStyle = elT6.color || '#fff';
        ctx.font = `900 ${elT6.fontSize}px ${font}`;
        mktWrapText(ctx, elT6, W/2, midY + midH/2 - 40, W - 120, elT6.fontSize * 1.1, 'center');
        
        const elC6 = MKT.elementos.find(e => e.id === 'cta');
        elC6.texto = cta;
        if (!elC6.hasResized) elC6.fontSize = cfg.bodySize * 0.6;
        ctx.globalAlpha = 0.7; ctx.font = `300 ${elC6.fontSize}px ${font}`;
        mktWrapText(ctx, elC6, W/2, midY + midH/2 + 40, W - 120, elC6.fontSize * 1.3, 'center');
        ctx.globalAlpha = 1; ctx.textAlign = 'left';

    } else if (layout === 7) {
        drawFondo(0, 0, W, H, cfg.gradientOpacity);
        if (modo === 'frase') drawFrase(H * 0.30);
        else drawTextoCompleto();
        const bandaY = H * 0.63;
        ctx.fillStyle = cfg.urgenciaColor || '#E31E24'; ctx.globalAlpha = 0.93;
        ctx.fillRect(0, bandaY, W, H * 0.20); ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.font = `900 ${cfg.fraseSize || 90}px ${font}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const textoUrg = (cfg.urgenciaTexto || 'OPORTUNIDAD ÚNICA').toUpperCase();
        
        // Usamos el ID 'frase' (o podrías crear un elUrg) para la banda de urgencia
        const elUrg = MKT.elementos.find(e => e.id === 'frase');
        elUrg.texto = textoUrg;
        mktWrapText(ctx, elUrg, W/2, bandaY + H * 0.10, W - 80, elUrg.fontSize * 1.0, 'center');
        drawBranding();
    }

    // EL TOQUE FINAL: Dibujar los controles de edición táctil
    mktDrawElementosEditables(ctx);
}
function mktDescargar() {
    const canvas = document.getElementById('mkt-canvas');
    if (!canvas) return;
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `todoaldia-placa-${mktConfig.tipo}-${mktConfig.editor}-${Date.now()}.png`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}
