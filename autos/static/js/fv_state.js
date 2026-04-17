// ══════════════════════════════════════════════
// FV STATE — Estado global del editor de placas
// Todo @l Día
// Separado de fv_editor.js para que index.html
// e index_app.html compartan el mismo estado
// sin duplicar código.trampa
// ══════════════════════════════════════════════

const FV = {
    // ── Modo activo ──────────────────────────
    // Controla qué tipo de placa se está editando.
    // Los 4 modos originales se mantienen igual.
    modo: 'story-principal',

    // ── Layout activo ────────────────────────
    // Nuevo: cada modo tiene 6 layouts posibles.
    // 1 es el default (el que ya existía antes).
    layout: 1,

    // ── Logo ─────────────────────────────────
    logoPos: 'bottom',

    // ── Foto 1 (principal) ───────────────────
    // Igual que antes — imagen de fondo principal.
    imgFondo:   null,
    imgOffsetX: 0,
    imgOffsetY: 0,
    imgZoom:    1,

    // ── Foto 2 (nueva) ───────────────────────
    // Para layouts que muestran 2 fotos del auto.
    // Tiene su propio offset y zoom independiente.
    img2:        null,
    img2OffsetX: 0,
    img2OffsetY: 0,
    img2Zoom:    1,

    // ── Color de acento ──────────────────────
    // Antes estaba hardcodeado como '#E31E24'.
    // Ahora es una variable — el color picker
    // lo modifica y fvDraw() lo lee desde acá.
    acento: '#E31E24',

    // ── Badge ────────────────────────────────
    // badgeVisible controla si se dibuja el badge.
    // El texto viene del input del panel.
    badgeVisible: true,

    // ── Elementos arrastrables ───────────────
    // Lista de textos que se pueden mover con
    // el dedo. Se reinicia cada vez que cambia
    // el modo con fvSetModo().
    elementos:      [],
    elSeleccionado: null,

    // ── Datos del auto ───────────────────────
    autoData:      null,
    todosLosAutos: [],
    autoAsignarId: null,

    // ── Canvas ───────────────────────────────
    canvas: null,
    ctx:    null,
    W:      0,
    H:      0,
};

// ── HELPER: dimensiones según modo ────────────
// POST = 1080×1350 (ratio 4:5)
// STORY = 1080×1920 (ratio 9:16)
// Esta función la usan fvSetModo y fvDraw.
function fvGetDims() {
    const isPost = FV.modo === 'post-principal' || FV.modo === 'post-logo';
    return isPost ? { w: 1080, h: 1350 } : { w: 1080, h: 1920 };
}

// ── SET MODO ──────────────────────────────────
// Se llama cuando el usuario cambia entre
// Story Principal / Post Principal / etc.
// Hace 4 cosas: resalta el botón, muestra/oculta
// controles, redimensiona el canvas, y define
// los elementos arrastrables del modo.
function fvSetModo(modo) {
    FV.modo = modo;

    // 1. Resaltar botón activo
    ['story-principal','post-principal','story-logo','post-logo'].forEach(m => {
        const btn = document.getElementById(`fv-modo-${m}`);
        if (!btn) return;
        const activo = m === modo;
        btn.style.background = activo ? '#E31E24' : '#1a1a1a';
        btn.style.color      = activo ? '#fff'    : '#555';
        btn.style.border     = activo ? 'none'    : '1px solid #2a2a2a';
    });

    // 2. Mostrar/ocultar secciones del panel
    const esPrincipal = modo === 'story-principal' || modo === 'post-principal';
    const isPost      = modo === 'post-principal'  || modo === 'post-logo';

    document.getElementById('fv-bullets-wrap').style.display  = esPrincipal ? 'block' : 'none';
    document.getElementById('fv-titulo-wrap').style.display   = esPrincipal ? 'block' : 'none';
    document.getElementById('fv-badge-wrap').style.display    = esPrincipal ? 'block' : 'none';
    document.getElementById('fv-sliders-wrap').style.display  = esPrincipal ? 'block' : 'none';
    document.getElementById('fv-logo-pos-wrap').style.display = esPrincipal ? 'none'  : 'block';

    // Layouts STORY vs POST — mostrar el selector correcto
    const storyLayouts = document.getElementById('fv-layouts-story');
    const postLayouts  = document.getElementById('fv-layouts-post');
    if (storyLayouts) storyLayouts.style.display = isPost ? 'none' : 'block';
    if (postLayouts)  postLayouts.style.display  = isPost ? 'block' : 'none';

    // Foto 2 solo aparece cuando el layout activo la usa
    fvActualizarVisibilidadFoto2();

    // 3. Dimensiones y escala del canvas
    const { w, h } = fvGetDims();
    FV.W = w; FV.H = h;
    FV.canvas.width  = w;
    FV.canvas.height = h;
    const maxH   = window.innerHeight - 130;
    const maxW   = FV.canvas.parentElement.parentElement.offsetWidth - 40;
    const escala = Math.min(maxW / w, maxH / h, 1);
    FV.canvas.style.width  = (w * escala) + 'px';
    FV.canvas.style.height = (h * escala) + 'px';

    // 4. Definir elementos arrastrables
    if (esPrincipal) {
        FV.elementos = [
            { id:'titulo',   x: w*0.05, y: h*0.08, fontSize: 72, color:'#fff', bold:true,  texto: document.getElementById('fv-titulo').value   || 'MARCA MODELO AÑO' },
            { id:'badge',    x: w*0.05, y: h*0.68, fontSize: 30, color:'#fff', bold:true,  texto: document.getElementById('fv-badge').value    || 'NUEVO INGRESO', esBadge: true },
            { id:'bullet1',  x: w*0.05, y: h*0.73, fontSize: 32, color:'#fff', bold:true,  texto: document.getElementById('fv-bullet-1').value || '• ...' },
            { id:'bullet2',  x: w*0.05, y: h*0.79, fontSize: 32, color:'#fff', bold:true,  texto: document.getElementById('fv-bullet-2').value || '• ...' },
            { id:'bullet3',  x: w*0.05, y: h*0.85, fontSize: 32, color:'#fff', bold:true,  texto: document.getElementById('fv-bullet-3').value || '• ...' },
            { id:'branding', x: w*0.5,  y: h*0.93, fontSize: 38, color:'#fff', bold:true,  texto: 'TODO @L DÍA', esBranding: true },
        ];
    } else {
        FV.elementos = [
            { id:'logo', x: w*0.5, y: FV.logoPos === 'top' ? h*0.07 : h*0.93, fontSize: 38, color:'#fff', bold:true, texto:'TODO @L DÍA', esBranding: true },
        ];
    }

    FV.elSeleccionado = null;
    fvDraw();
}

// ── SET LAYOUT ────────────────────────────────
// Se llama cuando el usuario elige un layout
// del selector de miniaturas.
// Guarda el número en FV.layout y redibuja.
// También muestra/oculta el control de foto 2.
function fvSetLayout(n) {
    FV.layout = n;
    // --- NUEVO: Resetear caché de posiciones al cambiar de layout ---
    FV.elementos.forEach(el => {
        el.hasMoved = false;
        el.hasResized = false;
    });

    // Resaltar botón activo en ambos selectores
    document.querySelectorAll('.fv-layout-btn').forEach(btn => {
        const activo = parseInt(btn.dataset.layout) === n &&
                       btn.dataset.tipo === (FV.modo.startsWith('post') ? 'post' : 'story');
        btn.style.borderColor = activo ? fvGetAccent() : '#2a2a2a';
        btn.style.opacity     = activo ? '1' : '0.5';
    });

    fvActualizarVisibilidadFoto2();
    fvDraw();
}

// ── VISIBILIDAD FOTO 2 ────────────────────────
// Los layouts 2 (dos fotos) necesitan foto 2.
// Los demás no. Esta función muestra u oculta
// el bloque de controles de foto 2.
function fvActualizarVisibilidadFoto2() {
    const necesitaFoto2 = FV.layout === 2;
    const wrap = document.getElementById('fv-foto2-wrap');
    if (wrap) wrap.style.display = necesitaFoto2 ? 'block' : 'none';
}

// ── SET LOGO POS ──────────────────────────────
function fvSetLogoPos(pos) {
    FV.logoPos = pos;
    ['top','bottom'].forEach(p => {
        const btn = document.getElementById(`fv-logo-${p}`);
        if (!btn) return;
        btn.style.background = p === pos ? '#E31E24' : '#1a1a1a';
        btn.style.color      = p === pos ? '#fff'    : '#555';
        btn.style.border     = p === pos ? 'none'    : '1px solid #2a2a2a';
    });
    fvSetModo(FV.modo);
}

// ── TOGGLE BADGE ──────────────────────────────
function fvToggleBadge() {
    FV.badgeVisible = !FV.badgeVisible;
    const btn = document.getElementById('fv-badge-toggle');
    if (btn) {
        btn.textContent    = FV.badgeVisible ? '👁 Visible' : '🙈 Oculto';
        btn.style.background = FV.badgeVisible ? '#E31E24' : '#1a1a1a';
        btn.style.border     = FV.badgeVisible ? 'none' : '1px solid #2a2a2a';
        btn.style.color      = FV.badgeVisible ? '#fff' : '#555';
    }
    fvDraw();
}

// ── COLOR ACENTO ──────────────────────────────
function fvCambiarAccento(color) {
    FV.acento = color;
    // Actualizar botones de layout para que el
    // borde del activo use el nuevo color
    fvSetLayout(FV.layout);
}

// ── INIT ──────────────────────────────────────
// Punto de entrada. Se llama una sola vez cuando
// el panel se abre por primera vez.
function fvInit() {
    FV.canvas = document.getElementById('fv-canvas');
    FV.ctx    = FV.canvas.getContext('2d');

    // Si hay un auto abierto en el CRM, pre-cargar sus datos
    if (typeof AUTO_ID_ACTUAL !== 'undefined' && AUTO_ID_ACTUAL) {
        fetch(`/auto/${AUTO_ID_ACTUAL}/json/`)
            .then(r => r.json())
            .then(d => {
                FV.autoData = d;
                document.getElementById('fv-titulo').value =
                    `${d.marca} ${d.modelo} ${d.anio}`.toUpperCase();
                document.getElementById('fv-badge').value = 'NUEVO INGRESO';
                fvCargarFotosCRM(d);
                const principal = (d.fotos || []).find(f => f.es_principal) || (d.fotos || [])[0];
                if (principal) fvCargarFotoURL(principal.imagen_url);
                document.getElementById('fv-bullet-1').value = '';
                document.getElementById('fv-bullet-2').value = '';
                document.getElementById('fv-bullet-3').value = '';
            });
    }

    fvPoblarSelectorAutos();
    fvSetModo('story-principal');
    fvSetLayout(1);
    fvBindCanvas();
}