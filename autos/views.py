from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import Auto, FotoAuto, DocumentoAuto, ContenidoGenerado, GastoAuto , RecepcionAuto, DocumentoRecepcion

import anthropic
import os
import json
import base64

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def index(request):
    tab = request.GET.get('tab', 'disponible')
    todos = Auto.objects.all().order_by('-fecha_ingreso')
    autos = todos.filter(estado=tab)
    if request.GET.get('solo_grid'):
        autos_data = []
        for auto in autos:
            foto = auto.fotos.filter(es_principal=True).first() or auto.fotos.first()
            autos_data.append({
                'id': auto.id,
                'marca': auto.marca,
                'modelo': auto.modelo,
                'anio': auto.anio,
                'km': auto.km,
                'estado': auto.estado,
                'estado_display': auto.get_estado_display(),
                'foto_url': foto.imagen.url if foto else None,
            })
        return JsonResponse({'autos': autos_data})
    # Agregar foto principal a cada auto
    autos_con_foto = []
    for auto in autos:
        foto = auto.fotos.filter(es_principal=True).first() or auto.fotos.first()
        autos_con_foto.append({'auto': auto, 'foto': foto})

    context = {
        'autos': autos_con_foto,
        'tab_activo': tab,
        'autos_disponibles': todos.filter(estado='disponible').count(),
        'autos_reservados': todos.filter(estado='reservado').count(),
        'autos_vendidos': todos.filter(estado='vendido').count(),
        'autos_leads': todos.filter(estado='lead').count(),
    }
    return render(request, 'autos/index.html', context)

def index_app(request):
    tab = request.GET.get('tab', 'disponible')
    todos = Auto.objects.all().order_by('-fecha_ingreso')
    autos = todos.filter(estado=tab)
    if request.GET.get('solo_grid'):
        autos_data = []
        for auto in autos:
            foto = auto.fotos.filter(es_principal=True).first() or auto.fotos.first()
            autos_data.append({
                'id': auto.id,
                'marca': auto.marca,
                'modelo': auto.modelo,
                'anio': auto.anio,
                'km': auto.km,
                'estado': auto.estado,
                'estado_display': auto.get_estado_display(),
                'foto_url': foto.imagen.url if foto else None,
            })
        return JsonResponse({'autos': autos_data})
    autos_con_foto = []
    for auto in autos:
        foto = auto.fotos.filter(es_principal=True).first() or auto.fotos.first()
        autos_con_foto.append({'auto': auto, 'foto': foto})
    context = {
        'autos': autos_con_foto,
        'tab_activo': tab,
        'autos_disponibles': todos.filter(estado='disponible').count(),
        'autos_reservados': todos.filter(estado='reservado').count(),
        'autos_vendidos': todos.filter(estado='vendido').count(),
        'autos_leads': todos.filter(estado='lead').count(),
    }
    return render(request, 'autos/index_app.html', context)
def _analizar_foto(foto):
    try:
        with open(foto.imagen.path, 'rb') as f:
            imagen_b64 = base64.standard_b64encode(f.read()).decode('utf-8')
        ext = foto.imagen.name.split('.')[-1].lower()
        media_type = 'image/jpeg' if ext in ['jpg', 'jpeg'] else f'image/{ext}'
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": imagen_b64}
                    },
                    {
                        "type": "text",
                        "text": """Sos un experto en fotografía automotriz para redes sociales. Analizás fotos para 'Todo @l Día', negocio familiar de autos en Caballito, Buenos Aires.

Analizá esta foto y respondé SOLO con este JSON exacto sin texto extra:
{
    "puntuacion": 8,
    "iluminacion": "buena/regular/mala",
    "angulo": "lateral derecho/lateral izquierdo/tres cuartos delantera/tres cuartos trasera/frontal/trasera/interior/detalle",
    "vehiculo_completo": true,
    "cortado_donde": "ninguno/adelante/atras/arriba/abajo",
    "fondo": "limpio/regular/malo",
    "encuadre": "correcto/espacio_sobrante",
    "espacio_donde": "ninguno/costados/arriba_abajo/todo_alrededor",
    "comentario_positivo": "lo que está bien de esta foto",
    "comentario_negativo": "lo que está mal o se podría mejorar",
    "mensaje_papa": "consejo directo y simple para mejorar la foto la próxima vez, en español argentino",
    "apta_publicacion": true,
    "candidata_principal": false
}

REGLAS DE PUNTUACIÓN:
- Puntuación 9-10: foto perfecta, vehículo completo, buen ángulo, buena luz, fondo limpio
- Puntuación 7-8: foto buena con algún detalle menor
- Puntuación 5-6: foto aceptable con problemas visibles
- Puntuación 1-4: foto mala, no apta

REGLAS DE RECHAZO (apta_publicacion = false):
- Vehículo cortado en cualquier parte
- Iluminación muy mala (foto oscura o sobreexpuesta)
- Fondo muy malo (personas, ropa, desorden extremo)
- Foto de interior como foto principal
- Foto borrosa o de muy baja calidad

REGLAS PARA candidata_principal = true:
- Solo puede haber UNA o DOS fotos con candidata_principal = true
- PRIORIDAD DE ÁNGULOS para principal (de mejor a peor):
  1. Tres cuartos delantera (45° desde adelante) — ES EL MEJOR ÁNGULO
  2. Lateral completo (se ve todo el auto)
  3. Frontal (solo si está bien encuadrado)
  4. NUNCA: trasera, interior, detalle
- Para ser candidata_principal ADEMÁS debe:
  - Tener puntuación >= 7
  - Vehículo completo (vehiculo_completo = true)
  - Buena iluminación
  - Fondo al menos regular

REGLAS DE ENCUADRE (importante para calidad post/story):
- encuadre = "correcto": el vehículo llena bien el cuadro (65-90% del espacio útil)
- encuadre = "espacio_sobrante": hay mucho espacio vacío alrededor del auto (más del 30% del frame es cielo/piso/paredes sin el auto). Es una advertencia, NO rechaza la foto.
- espacio_donde: dónde sobra espacio ("ninguno", "costados", "arriba_abajo", "todo_alrededor")

REGLAS DEL mensaje_papa:
- Hablale directamente: "La próxima vez..."
- Máximo 2 oraciones
- Simple, sin tecnicismos
- En argentino: "sacá", "poné", "fijate"
- Si la foto está bien, felicitalo brevemente"""
                    }
                ]
            }]
        )
        texto = respuesta.content[0].text.strip()
        if texto.startswith('```'):
            texto = texto.split('```')[1]
            if texto.startswith('json'):
                texto = texto[4:]
        analisis = json.loads(texto)
    except Exception:
        analisis = {
            "puntuacion": 5,
            "apta_publicacion": False,
            "comentario_negativo": "No se pudo analizar"
        }
    foto.analisis_ia = json.dumps(analisis)

    if not analisis.get('apta_publicacion', True):
        foto.aprobada = False
    else:
        foto.aprobada = True
        # Usar candidata_principal de la IA para elegir la foto principal
        if analisis.get('candidata_principal', False):
            # La IA la marcó como candidata — verificar si hay otra principal
            principal_actual = foto.auto.fotos.filter(es_principal=True).first()
            if principal_actual:
                # Solo reemplazar si la nueva tiene mejor puntuación
                puntuacion_actual = json.loads(principal_actual.analisis_ia or '{}').get('puntuacion', 0)
                puntuacion_nueva = analisis.get('puntuacion', 0)
                if puntuacion_nueva > puntuacion_actual:
                    principal_actual.es_principal = False
                    principal_actual.save()
                    foto.es_principal = True
            else:
                foto.es_principal = True
        elif not foto.auto.fotos.filter(es_principal=True).exists():
            # Si no hay ninguna principal todavía, usar esta
            foto.es_principal = True

    foto.save()
    return analisis

def _seleccionar_mejor_principal(auto):
    """
    Después de analizar TODAS las fotos, elige la mejor candidata como principal.
    Se llama una sola vez al final, no foto por foto.
    """
    fotos_aprobadas = auto.fotos.filter(aprobada=True)
    if not fotos_aprobadas.exists():
        return

    # Resetear todas antes de elegir
    fotos_aprobadas.update(es_principal=False)

    candidatas = []
    for foto in fotos_aprobadas:
        analisis = {}
        if foto.analisis_ia:
            try:
                analisis = json.loads(foto.analisis_ia)
            except:
                pass
        candidatas.append({
            'foto': foto,
            'es_candidata': analisis.get('candidata_principal', False),
            'puntuacion': analisis.get('puntuacion', 0),
        })

    # Primero: candidatas marcadas por IA, la de mayor puntuación
    marcadas = [c for c in candidatas if c['es_candidata']]
    pool = marcadas if marcadas else candidatas  # fallback: todas

    if not pool:
        return

    mejor = max(pool, key=lambda c: c['puntuacion'])
    mejor['foto'].es_principal = True
    mejor['foto'].save()

def nuevo_auto(request):
    if request.method == 'POST':
        auto = Auto.objects.create(
            marca=request.POST.get('marca'),
            modelo=request.POST.get('modelo'),
            anio=int(request.POST.get('anio')),
            km=int(request.POST.get('km')),
            version=request.POST.get('version', ''),
            color=request.POST.get('color', ''),
            precio=float(request.POST.get('precio') or 0),
            precio_compra=request.POST.get('precio_compra') or None,
            detalles=request.POST.get('detalles', ''),
            nombre_dueno=request.POST.get('nombre_dueno', ''),
            telefono_dueno=request.POST.get('telefono_dueno', ''),
            detalles_adicionales=request.POST.get('detalles_adicionales', ''),
            estado=request.POST.get('estado_inicial', 'disponible'),
        )
        servicios_fijos = [
            ('limpieza', 'Limpieza y preparación profesional del vehículo',25000),
            ('publicacion', 'Publicación multicanal: MercadoLibre, Instagram y Facebook',77000),
            ('cochera', 'Cochera / Guardado seguro bajo techo',150000),
            ('fotos_profesionales', 'Fotos, Videos y Reels profesionales para destacar en redes',150000),
            ('gestoria', 'Gestoría y tramitación de papeles sin vueltas',150000),
        ]
        for cat, desc, monto in servicios_fijos:
            GastoAuto.objects.create(auto=auto, tipo='fijo', categoria_fija=cat, descripcion=desc, monto=monto, bonificado=True)
        fotos = request.FILES.getlist('fotos')
        for foto in fotos:
            foto_obj = FotoAuto.objects.create(auto=auto, imagen=foto)
            _analizar_foto(foto_obj)
        if fotos:                          
            _seleccionar_mejor_principal(auto)    
        return redirect(f'/?auto={auto.id}')    
    return redirect('/')

def detalle_auto(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    fotos = auto.fotos.all()
    contenido = auto.contenidos.last()
    context = {
        'auto': auto,
        'fotos': fotos,
        'contenido': contenido,
    }
    return render(request, 'autos/detalle.html', context)

@csrf_exempt
def analizar_fotos(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    fotos = auto.fotos.all()
    resultados = []

    for foto in fotos:
        try:
            with open(foto.imagen.path, 'rb') as f:
                imagen_b64 = base64.standard_b64encode(f.read()).decode('utf-8')

            ext = foto.imagen.name.split('.')[-1].lower()
            media_type = 'image/jpeg' if ext in ['jpg', 'jpeg'] else f'image/{ext}'

            respuesta = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=500,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": imagen_b64
                            }
                        },
                        {
                            "type": "text",
                           "text": """Sos un experto en fotografía automotriz para redes sociales. Analizás fotos para 'Todo @l Día', negocio familiar de autos en Caballito, Buenos Aires.

Analizá esta foto y respondé SOLO con este JSON exacto sin texto extra:
{
    "puntuacion": 8,
    "iluminacion": "buena/regular/mala",
    "angulo": "lateral derecho/lateral izquierdo/tres cuartos delantera/tres cuartos trasera/frontal/trasera/interior/detalle",
    "vehiculo_completo": true,
    "cortado_donde": "ninguno/adelante/atras/arriba/abajo",
    "fondo": "limpio/regular/malo",
    "comentario_positivo": "lo que está bien de esta foto",
    "comentario_negativo": "lo que está mal o se podría mejorar",
    "mensaje_papa": "consejo directo y simple para mejorar la foto la próxima vez, en español argentino",
    "apta_publicacion": true,
    "candidata_principal": false
}

REGLAS DE PUNTUACIÓN:
- Puntuación 9-10: foto perfecta, vehículo completo, buen ángulo, buena luz, fondo limpio
- Puntuación 7-8: foto buena con algún detalle menor
- Puntuación 5-6: foto aceptable con problemas visibles
- Puntuación 1-4: foto mala, no apta


REGLAS DE RECHAZO (apta_publicacion = false):
- Vehículo cortado en cualquier parte
- Iluminación muy mala (foto oscura o sobreexpuesta)
- Fondo muy malo (personas, ropa, desorden extremo)
- Sobra lugar en la foto de costado o de arriba que no es foto(se da por error de formato al sacar la foto)
- Foto borrosa o de muy baja calidad

REGLAS PARA candidata_principal = true:
- Solo puede haber UNA o DOS fotos con candidata_principal = true
- PRIORIDAD DE ÁNGULOS para principal (de mejor a peor):
  1. Tres cuartos delantera (45° desde adelante) — ES EL MEJOR ÁNGULO
  2. Lateral completo (se ve todo el auto)
  3. Frontal (solo si está bien encuadrado)
  4. NUNCA: trasera, interior, detalle
- Para ser candidata_principal ADEMÁS debe:
  - Tener puntuación >= 7
  - Vehículo completo (vehiculo_completo = true)
  - Buena iluminación
  - Fondo al menos regular

REGLAS DE ENCUADRE (importante para calidad post/story):
- encuadre = "correcto": el vehículo llena bien el cuadro (65-90% del espacio útil)
- encuadre = "espacio_sobrante": hay mucho espacio vacío alrededor del auto (más del 30% del frame es cielo/piso/paredes sin el auto). Es una advertencia, NO rechaza la foto.
- espacio_donde: dónde sobra espacio ("ninguno", "costados", "arriba_abajo", "todo_alrededor")

REGLAS DEL mensaje_papa:
- Hablale directamente: "La próxima vez..."
- Máximo 2 oraciones
- Simple, sin tecnicismos
- En argentino: "sacá", "poné", "fijate"
- Si la foto está bien, felicitalo brevemente"""
                        }
                    ]
                }]
            )

            texto = respuesta.content[0].text.strip()
            if texto.startswith('```'):
                texto = texto.split('```')[1]
                if texto.startswith('json'):
                    texto = texto[4:]
            analisis = json.loads(texto)

        except Exception as e:
            analisis = {
                "puntuacion": 5,
                "comentario": "No se pudo analizar",
                "sugerencia": "Revisá que la imagen sea clara",
                "apta_publicacion": False
            }

        foto.analisis_ia = json.dumps(analisis)
        foto.save()
        resultados.append({"foto_id": foto.id, "analisis": analisis})

    return JsonResponse({"resultados": resultados})

@csrf_exempt
def aprobar_foto(request, foto_id):
    foto = get_object_or_404(FotoAuto, id=foto_id)
    data = json.loads(request.body)
    foto.aprobada = data.get('aprobada', True)
    foto.es_principal = data.get('es_principal', False)
    foto.save()
    return JsonResponse({"ok": True})

@csrf_exempt
def generar_contenido(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)

    prompt = f"""Sos un experto en marketing automotriz y community manager de 'Todo @l Día', negocio familiar con 26 años vendiendo autos en Capital Federal, Buenos Aires. Tu misión es crear textos que vendan, no solo que describan.

IDENTIDAD DE MARCA:
- 26 años de trayectoria — eso genera confianza real
- Familia atendiendo familias — trato cercano y honesto
- Colores: Rojo, Negro, Blanco — marca fuerte y profesional
- Slogan: "Papeles 100% al día, autos impecables, gestión sin estrés"

SERVICIOS QUE SIEMPRE HAY QUE MENCIONAR:
- Financiación con bancos (créditos con DNI, cuotas fijas)
- Permutas de autos y motos
- Gestión de papeles por parte nuestra
- Venta por comisión

VOCABULARIO ARGENTINO OBLIGATORIO:
- "services oficiales" (no "mantenimientos")
- "permuta" (no "canje")
- "cuotas fijas" 
- "papeles al día"
- "único dueño" si aplica
- "impecable" para describir estado
- Precios en pesos argentinos

AUTO A VENDER:
- {auto.marca} {auto.modelo} {auto.anio}
- {auto.km:,} km · {auto.version} · {auto.color}
- Precio de venta: ${auto.precio:,.0f} (SOLO mencionarlo en el texto de Mercado Libre, NUNCA en los copies de Instagram)
- Detalles: {auto.detalles}

ANÁLISIS DEL PÚBLICO OBJETIVO:
Pensá quién compra este vehículo específico. Por ejemplo:
- Scooter/moto urbana → jóvenes 18-30, ahorro en combustible, movilidad en ciudad
- Kangoo/Berlingo → trabajadores independientes, plomeros, electricistas, familias
- Auto familiar → familia con hijos, segundo auto, seguridad
- Auto deportivo → jóvenes profesionales, imagen, adrenalina
Adaptá el copy a ese público real.

REGLAS DE ESCRITURA:
- Instagram: usá emojis estratégicamente, no en exceso. NUNCA mencionar el precio en Instagram.
- Hashtags relevantes al final , solo 5, ideados con estrategia seo.
- Mercado Libre:  descripción completa y detallada
- Siempre mencioná financiación y permuta
- Cerrá siempre con llamado a la acción claro
- Los textos deben ser largos y persuasivos, no solo informativos

Respondé SOLO con este JSON sin texto extra:
{{
    "copy_instagram_1": "copy largo con historia del auto, beneficios para el público objetivo, financiación y permuta, emojis estratégicos y hashtags. Mínimo 150 palabras.",
    "copy_instagram_2": "copy más directo pero igualmente persuasivo, enfocado en la oportunidad de compra y los servicios del negocio. Mínimo 100 palabras.",
    "copy_instagram_3": "copy enfocado en financiación con bancos y permutas, ideal para quien duda por el precio. Mínimo 100 palabras.",
    "texto_mercadolibre": "descripción completa y optimizada para ML sin emojis. Incluir: descripción del vehículo, equipamiento, estado, services, financiación disponible, datos del negocio. Mínimo 200 palabras.",
    "titulo_placa": "TÍTULO EN MAYÚSCULAS PARA LA PLACA",
    "puntos_placa": ["Dato clave 1", "Dato clave 2", "Financiación Disponible"],
    "consejos": "consejo breve sobre fotos o publicación",
    "tagline": "una sola frase corta y PODEROSA para la tarjeta del stock. Máximo 10 palabras. Pensá como un copywriter experto en autos: usá verbos de acción, apelá a la emoción o al beneficio concreto del comprador. Ejemplos de estilo: 'El utilitario que hace crecer tu negocio', 'Confort europeo al alcance de tu mano', 'La libertad de moverte sin gastar en nafta'. Sin precio,con emojis, sin el nombre del auto."
    "copy_whatsapp": "Mensaje corto para WhatsApp para agendar visita. Máximo 4 líneas. Tono cercano y argentino. Que mencione el auto, el precio si corresponde,info del auto, un texto que incite la venta y cierre con llamado a agendar visita. Sin hashtags. Ejemplo de estilo: 'Hola! Te escribimos de Todo @l Día. Tenemos el BMW Serie 1 2015 disponible. ¿Querés pasar a verlo esta semana? Estamos en Caballito.'"
}}"""

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )

        texto = respuesta.content[0].text.strip()
        if texto.startswith('```'):
            texto = texto.split('```')[1]
            if texto.startswith('json'):
                texto = texto[4:]
        contenido = json.loads(texto)

    except Exception as e:
        contenido = {"error": str(e)}

    ContenidoGenerado.objects.update_or_create(
        auto=auto,
        defaults={
            'copy_instagram': contenido.get('copy_instagram_1', ''),
            'copy_facebook': contenido.get('copy_instagram_2', ''),
            'texto_mercadolibre': contenido.get('texto_mercadolibre', ''),
            'consejos': contenido.get('consejos', ''),
            'tagline': contenido.get('tagline', ''),
        }
    )
    contenido['tagline_guardado'] = contenido.get('tagline', '')
    return JsonResponse(contenido)

@csrf_exempt
def cambiar_estado(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    data = json.loads(request.body)
    auto.estado = data.get('estado', auto.estado)
    auto.save()
    return JsonResponse({"ok": True})

@csrf_exempt
def generar_pack(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    fotos_aprobadas = auto.fotos.filter(aprobada=True)

    if not fotos_aprobadas.exists():
        return JsonResponse({"error": "No hay fotos aprobadas. Aprobá al menos una foto primero."})

    prompt = f"""Sos el community manager de 'Todo @l Día', autos en Caballito, Buenos Aires.

AUTO: {auto.marca} {auto.modelo} {auto.anio} - {auto.km:,} km - ${auto.precio:,.0f}
DETALLES: {auto.detalles}

Respondé SOLO con este JSON:
{{
    "titulo_story": "TÍTULO CORTO EN MAYÚSCULAS MÁXIMO 4 PALABRAS",
    "subtitulo_story": "subtítulo atractivo máximo 6 palabras",
    "precio_formateado": "${auto.precio:,.0f}",
    "badge": "NUEVO INGRESO",
    "punto1": "dato clave del vehículo que NO sea el año ni el modelo (ej: km, versión, color, estado)",
    "punto2": "otro dato relevante que NO repita el año, pensado como beneficio a destacar para el cliente",
    "punto3": "Financiación disponible o Papeles al día"
}}"""

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        texto = respuesta.content[0].text.strip()
        if texto.startswith('```'):
            texto = texto.split('```')[1]
            if texto.startswith('json'):
                texto = texto[4:]
            if texto.endswith('```'): 
                texto = texto[:-3]                  
                
        textos = json.loads(texto)
    except:
        textos = {
            "titulo_story": f"{auto.marca} {auto.modelo}".upper(),
            "subtitulo_story": f"{auto.anio} · {auto.km:,} km",
            "precio_formateado": f"${auto.precio:,.0f}",
            "badge": "NUEVO INGRESO",
            "punto1": f"Año {auto.anio}",
            "punto2": f"{auto.km:,} km",
            "punto3": "Papeles al día"
        }

    fotos_data = []
    for foto in fotos_aprobadas:
        fotos_data.append({
            "foto_id": foto.id,
            "url": foto.imagen.url,
            "es_principal": foto.es_principal
        })

    return JsonResponse({
        "fotos": fotos_data,
        "textos": textos,
        "auto": {
            "marca": auto.marca,
            "modelo": auto.modelo,
            "anio": auto.anio,
            "km": auto.km,
            "precio": str(auto.precio),
            "version": auto.version
        }
    })

def ver_pack(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    return render(request, 'autos/pack.html', {'auto': auto})

@csrf_exempt
def editar_auto(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    if request.method == 'POST':
        auto.marca = request.POST.get('marca', auto.marca)
        auto.modelo = request.POST.get('modelo', auto.modelo)
        auto.anio = int(request.POST.get('anio', auto.anio))
        auto.km = int(request.POST.get('km', auto.km))
        auto.version = request.POST.get('version', auto.version)
        auto.color = request.POST.get('color', auto.color)
        auto.precio = float(request.POST.get('precio', auto.precio))
        precio_compra = request.POST.get('precio_compra')
        auto.precio_compra = float(precio_compra) if precio_compra else auto.precio_compra
        auto.detalles = request.POST.get('detalles', auto.detalles)
        auto.save()

        fotos_nuevas = request.FILES.getlist('fotos')
        for foto in fotos_nuevas:
            foto_obj = FotoAuto.objects.create(auto=auto, imagen=foto)
            _analizar_foto(foto_obj)
        if fotos_nuevas:                  
            _seleccionar_mejor_principal(auto)
        return redirect(f'/auto/{auto.id}/')

    return render(request, 'autos/editar.html', {'auto': auto})




@csrf_exempt
def borrar_auto(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    if request.method == 'POST':
        for foto in auto.fotos.all():
            if foto.imagen and os.path.isfile(foto.imagen.path):
                os.remove(foto.imagen.path)
        auto.delete()
        return redirect('/')
    return redirect(f'/auto/{auto_id}/')
@csrf_exempt
def gastos_auto(request, auto_id):
    from django.db.models import Sum
    auto = get_object_or_404(Auto, id=auto_id)

    if request.method == 'POST':
        accion = request.POST.get('accion')
        gastos_fijos_labels = {
            'limpieza': 'Limpieza y preparación profesional del vehículo',
            'publicacion': 'Publicación multicanal: MercadoLibre, Whatsapp, Instagram y Facebook',
            'cochera': 'Cochera / Guardado seguro bajo techo',
            'fotos_profesionales': 'Fotos, Videos y Reels profesionales para destacar en redes',
            'gestoria': 'Gestoría y Tramitación de papeles ',
        }

        if accion == 'agregar_fijos':
            fijos_seleccionados = request.POST.getlist('gasto_fijo')
            for categoria in fijos_seleccionados:
                if not GastoAuto.objects.filter(auto=auto, categoria_fija=categoria).exists():
                    GastoAuto.objects.create(
                        auto=auto, tipo='fijo', categoria_fija=categoria,
                        descripcion=gastos_fijos_labels.get(categoria, categoria), monto=0,
                    )

        elif accion == 'agregar_variables':
            descs = request.POST.getlist('nuevo_gasto_desc[]')
            montos = request.POST.getlist('nuevo_gasto_monto[]')
            for desc, monto in zip(descs, montos):
                if desc.strip():
                    GastoAuto.objects.create(
                        auto=auto, tipo='variable',
                        descripcion=desc.strip(),
                        monto=float(monto) if monto else 0,
                    )

        accion_submit = request.POST.get('accion_submit', 'guardar')
        if accion_submit == 'informe':
            return redirect(f'/auto/{auto_id}/informe/')
        return redirect(f'/auto/{auto_id}/gastos/')

    # Auto-crear fijos si no existen
    for categoria, descripcion in [
        ('limpieza', 'Limpieza y preparación profesional del vehículo'),
        ('publicacion', 'Publicación multicanal: MercadoLibre, Instagram y Facebook'),
        ('cochera', 'Cochera / Guardado seguro bajo techo'),
        ('fotos_profesionales', 'Fotos, Videos y Reels profesionales para destacar en redes'),
        ('gestoria', 'Gestoría y tramitación de papeles sin vueltas'),
    ]:
        if not GastoAuto.objects.filter(auto=auto, categoria_fija=categoria).exists():
            GastoAuto.objects.create(
                auto=auto, tipo='fijo', categoria_fija=categoria,
                descripcion=descripcion, monto=0,
            )

    gastos_fijos = auto.gastos.filter(tipo='fijo')
    gastos_variables = auto.gastos.filter(tipo='variable')
    total = auto.gastos.filter(tipo='variable').aggregate(total=Sum('monto'))['total'] or 0
    return render(request, 'autos/gastos.html', {
        'auto': auto,
        'gastos_fijos': gastos_fijos,
        'gastos_variables': gastos_variables,
        'total_gastos_variables': total,
    })

@csrf_exempt
def borrar_gasto(request, auto_id, gasto_id):
    gasto = get_object_or_404(GastoAuto, id=gasto_id)
    if request.method == 'POST':
        gasto.delete()
        return JsonResponse({"ok": True})
    return JsonResponse({"ok": False})

@csrf_exempt
def editar_gasto(request, auto_id, gasto_id):
    gasto = get_object_or_404(GastoAuto, id=gasto_id)
    if request.method == 'POST':
        data = json.loads(request.body)
        gasto.descripcion = data.get('descripcion', gasto.descripcion)
        gasto.monto = data.get('monto', gasto.monto)
        gasto.save()
        return JsonResponse({"ok": True})
    return JsonResponse({"ok": False})

def recepcion_auto(request, auto_id):
    from .models import RecepcionAuto
    auto = get_object_or_404(Auto, id=auto_id)
    recepcion = RecepcionAuto.objects.filter(auto=auto).first()
    combustible_choices = [
        ('lleno', 'Lleno'),
        ('tres_cuartos', '3/4'),
        ('medio', '1/2'),
        ('cuarto', '1/4'),
        ('reserva', 'Reserva'),
    ]
    return render(request, 'autos/recepcion.html', {
        'auto': auto,
        'recepcion': recepcion,
        'combustible_choices': combustible_choices,
    })

@csrf_exempt
def guardar_recepcion(request, auto_id):
    from .models import RecepcionAuto, DocumentoRecepcion
    auto = get_object_or_404(Auto, id=auto_id)
    if request.method == 'POST':
        recepcion, _ = RecepcionAuto.objects.get_or_create(auto=auto)
        recepcion.nombre_cliente = request.POST.get('nombre_cliente', '')
        recepcion.telefono_cliente = request.POST.get('telefono_cliente', '')
        recepcion.tiene_titulo = request.POST.get('tiene_titulo') == 'on'
        recepcion.tiene_dni_titular = request.POST.get('tiene_dni_titular') == 'on'
        recepcion.tiene_vtv = request.POST.get('tiene_vtv') == 'on'
        recepcion.tiene_seguro = request.POST.get('tiene_seguro') == 'on'
        recepcion.tiene_libre_deuda = request.POST.get('tiene_libre_deuda') == 'on'
        recepcion.tiene_service_history = request.POST.get('tiene_service_history') == 'on'
        recepcion.tiene_llave_duplicado = request.POST.get('tiene_llave_duplicado') == 'on'
        recepcion.tiene_manual = request.POST.get('tiene_manual') == 'on'
        recepcion.tiene_gato = request.POST.get('tiene_gato') == 'on'
        recepcion.tiene_rueda_auxilio = request.POST.get('tiene_rueda_auxilio') == 'on'
        recepcion.tiene_balizas = request.POST.get('tiene_balizas') == 'on'
        recepcion.estado_carroceria = request.POST.get('estado_carroceria', 'bueno')
        recepcion.detalles_carroceria = request.POST.get('detalles_carroceria', '')
        recepcion.kilometraje_ingreso = request.POST.get('kilometraje_ingreso') or None
        recepcion.combustible_ingreso = request.POST.get('combustible_ingreso', 'medio')
        recepcion.observaciones = request.POST.get('observaciones', '')
        recepcion.firma_cliente = request.POST.get('firma_cliente') == 'on'
        recepcion.save()

        for archivo in request.FILES.getlist('documentos'):
            DocumentoRecepcion.objects.create(
                recepcion=recepcion,
                descripcion=archivo.name,
                archivo=archivo,
            )

        accion = request.POST.get('accion', 'guardar')
        if accion == 'comprobante':
            return redirect(f'/auto/{auto_id}/comprobante/')
        return redirect(f'/auto/{auto_id}/')
    return redirect(f'/auto/{auto_id}/recepcion/')
def ver_comprobante(request, auto_id):
    from .models import RecepcionAuto
    auto = get_object_or_404(Auto, id=auto_id)
    recepcion = RecepcionAuto.objects.filter(auto=auto).first()

    if not recepcion:
        return redirect(f'/auto/{auto_id}/recepcion/')

    prompt = f"""Sos el director de comunicaciones de 'Todo @l Día', agencia familiar con 26 años en Caballito, Buenos Aires.

Generá DOS textos para el comprobante de recepción del vehículo que nos dejó el cliente:

VEHÍCULO: {auto.marca} {auto.modelo} {auto.anio}
CLIENTE: {recepcion.nombre_cliente}
KM AL INGRESO: {recepcion.kilometraje_ingreso or auto.km}

1. MENSAJE_COMPROBANTE: Un mensaje corto y profesional para poner en el comprobante. Máximo 2 líneas. Que transmita seriedad, transparencia y compromiso con el cliente.

2. MENSAJE_WHATSAPP: Un mensaje para enviar por WhatsApp junto con el comprobante. Que confirme la recepción del vehículo, detalle que adjuntamos el comprobante con todo lo recibido, y genere confianza. Tono cercano, argentino, profesional. Entre 40 y 60 palabras.

Respondé SOLO con este JSON sin texto extra:
{{
    "mensaje_comprobante": "el mensaje corto para el comprobante",
    "mensaje_whatsapp": "el texto para whatsapp"
}}"""

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        texto = respuesta.content[0].text.strip()
        if texto.startswith('```'):
            texto = texto.split('```')[1]
            if texto.startswith('json'):
                texto = texto[4:]
        data = json.loads(texto)
        mensaje_comprobante = data.get('mensaje_comprobante', 'Recibimos su vehículo con compromiso y responsabilidad.')
        mensaje_whatsapp = data.get('mensaje_whatsapp', '')
    except:
        mensaje_comprobante = 'Recibimos su vehículo con compromiso y responsabilidad.'
        mensaje_whatsapp = ''

    return render(request, 'autos/comprobante.html', {
        'auto': auto,
        'recepcion': recepcion,
        'mensaje_comprobante': mensaje_comprobante,
        'mensaje_whatsapp': mensaje_whatsapp,
    })

@csrf_exempt
def borrar_foto(request, foto_id):
    foto = get_object_or_404(FotoAuto, id=foto_id)
    auto_id = foto.auto.id
    if request.method == 'POST':
        if foto.imagen and os.path.isfile(foto.imagen.path):
            os.remove(foto.imagen.path)
        foto.delete()
        return JsonResponse({"ok": True, "auto_id": auto_id})
    return JsonResponse({"ok": False})

def ver_vendido(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)

    prompt = f"""Sos un experto en marketing automotriz argentino para 'Todo @l Día', negocio familiar con 26 años en Caballito, Buenos Aires.

Se acaba de vender este vehículo:
- {auto.marca} {auto.modelo} {auto.anio}
- {auto.km:,} km · {auto.version} · {auto.color}

Generá DOS cosas:

1. FRASE_PLACA: Una sola frase corta y emotiva para la placa de VENDIDO. Máximo 8 palabras. Tono celebratorio, cálido, argentino. Sin emojis, sin precio.

2. COPY_INSTAGRAM: Un copy completo para postear en Instagram anunciando que se vendió. Debe incluir:
- Apertura emotiva celebrando la venta
- Mencionar el vehículo con entusiasmo
- Agradecer al comprador por elegirnos
- Invitar a los que siguen buscando a contactarnos
- Mencionar que tenemos financiación y permuta
- Hashtags al final
- Tono cálido, familiar, argentino
- Emojis estratégicos
- Mínimo 80 palabras

Respondé SOLO con este JSON sin texto extra:
{{
    "frase_placa": "la frase corta para la placa",
    "copy_instagram": "el copy completo para el post"
}}"""

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}]
        )
        texto = respuesta.content[0].text.strip()
        if texto.startswith('```'):
            texto = texto.split('```')[1]
            if texto.startswith('json'):
                texto = texto[4:]
        data = json.loads(texto)
        frase_vendido = data.get('frase_placa', '¡Vendido! Gracias por elegirnos.')
        copy_vendido = data.get('copy_instagram', '')
    except:
        frase_vendido = '¡Vendido! Gracias por elegirnos.'
        copy_vendido = ''

    return render(request, 'autos/vendido.html', {
        'auto': auto,
        'frase_vendido': frase_vendido,
        'copy_vendido': copy_vendido,
    })
    
def ver_informe(request, auto_id):
    from django.db.models import Sum
    auto = get_object_or_404(Auto, id=auto_id)
    
    gastos_fijos     = auto.gastos.filter(tipo='fijo')
    gastos_variables = auto.gastos.filter(tipo='variable')
    total_gastos     = gastos_variables.aggregate(total=Sum('monto'))['total'] or 0
    total_bonificado = gastos_fijos.filter(bonificado=True).aggregate(total=Sum('monto'))['total'] or 0

    # Usar copy_informe guardado si existe, sino generar
    contenido = auto.contenidos.last()
    mensaje_whatsapp = ''
    mensaje_placa = 'Trabajamos con dedicación y transparencia.'

    if contenido and contenido.copy_informe:
        mensaje_whatsapp = contenido.copy_informe
    else:
        prompt = f"""Sos el director de comunicaciones de 'Todo @l Día', agencia familiar con 26 años en Caballito, Buenos Aires.

Generá DOS textos para acompañar el informe que le enviamos al dueño del vehículo:

VEHÍCULO: {auto.marca} {auto.modelo} {auto.anio}
SERVICIOS BONIFICADOS: ${total_bonificado:,.0f}
GASTOS ADICIONALES: ${total_gastos:,.0f}

1. MENSAJE_PLACA: Mensaje corto y poderoso para la imagen. Máximo 2 líneas.
2. MENSAJE_WHATSAPP: Mensaje para WhatsApp, tono cercano argentino. 50-80 palabras.

Respondé SOLO con este JSON:
{{
    "mensaje_placa": "...",
    "mensaje_whatsapp": "..."
}}"""
        try:
            respuesta = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}]
            )
            texto = respuesta.content[0].text.strip()
            if texto.startswith('```'):
                texto = texto.split('```')[1]
                if texto.startswith('json'):
                    texto = texto[4:]
            data = json.loads(texto)
            mensaje_placa    = data.get('mensaje_placa', mensaje_placa)
            mensaje_whatsapp = data.get('mensaje_whatsapp', '')
        except:
            pass

    return render(request, 'autos/informe.html', {
        'auto':             auto,
        'gastos_fijos':     gastos_fijos,
        'gastos_variables': gastos_variables,
        'total_gastos':     total_gastos,
        'total_bonificado': total_bonificado,
        'mensaje_placa':    mensaje_placa,
        'mensaje_whatsapp': mensaje_whatsapp,
    })
@csrf_exempt
def guardar_moneda(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    if request.method == 'POST':
        data = json.loads(request.body)
        auto.moneda = data.get('moneda', 'ARS')
        tc = data.get('tipo_cambio')
        auto.tipo_cambio = tc if tc else None
        auto.save()
        return JsonResponse({"ok": True})
    return JsonResponse({"ok": False})
@csrf_exempt
def guardar_precio(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    if request.method == 'POST':
        data = json.loads(request.body)
        if 'precio_compra' in data:
            auto.precio_compra = data['precio_compra']
        if 'precio' in data:
            auto.precio = data['precio']
        auto.save()
        return JsonResponse({"ok": True})
    return JsonResponse({"ok": False})
    
@csrf_exempt
def auto_json(request, auto_id):
    auto = get_object_or_404(Auto, id=auto_id)
    fotos = []
    for f in auto.fotos.all():
        puntuacion = None
        if f.analisis_ia:
            try:
                puntuacion = json.loads(f.analisis_ia).get('puntuacion')
            except Exception:
                pass
        analisis_completo = {}
        if f.analisis_ia:
            try:
                analisis_completo = json.loads(f.analisis_ia)
            except:
                pass
        # Detectar orientación real de la imagen
        es_vertical = False
        try:
            from PIL import Image as PILImage
            with PILImage.open(f.imagen.path) as pil_img:
                w, h = pil_img.size
                es_vertical = h > w
        except:
            pass

        fotos.append({
        'id': f.id,
        'imagen_url': f.imagen.url,
        'es_principal': f.es_principal,
        'aprobada': f.aprobada,
        'es_vertical': es_vertical,
        'puntuacion': puntuacion,
        'apta': analisis_completo.get('apta_publicacion', True),
        'motivo_rechazo': analisis_completo.get('comentario_negativo', ''),
        'consejo': analisis_completo.get('mensaje_papa', ''),
        'angulo': analisis_completo.get('angulo', ''),
        'cortado': analisis_completo.get('cortado_donde', ''),
        'encuadre': analisis_completo.get('encuadre', 'correcto'),     
        'espacio_donde': analisis_completo.get('espacio_donde', 'ninguno'), 
})

    recepcion_data = None
    recepcion = getattr(auto, 'recepcion', None)
    if recepcion:
        checklist = [
            {'label': 'Título',           'ok': recepcion.tiene_titulo},
            {'label': 'DNI titular',      'ok': recepcion.tiene_dni_titular},
            {'label': 'VTV',              'ok': recepcion.tiene_vtv},
            {'label': 'Seguro',           'ok': recepcion.tiene_seguro},
            {'label': 'Libre de deuda',   'ok': recepcion.tiene_libre_deuda},
            {'label': 'Service history',  'ok': recepcion.tiene_service_history},
            {'label': 'Llave duplicado',  'ok': recepcion.tiene_llave_duplicado},
            {'label': 'Manual',           'ok': recepcion.tiene_manual},
        ]
        documentos = [
            {'descripcion': d.descripcion, 'url': d.archivo.url}
            for d in recepcion.documentos.all()
        ]
        recepcion_data = {
            'nombre_cliente':             recepcion.nombre_cliente,
            'telefono_cliente':           recepcion.telefono_cliente,
            'kilometraje_ingreso':        recepcion.kilometraje_ingreso,
            'combustible_display':        recepcion.get_combustible_ingreso_display(),
            'carroceria_display':         recepcion.get_estado_carroceria_display(),
            'observaciones':              recepcion.observaciones,
            'checklist':                  checklist,
            'documentos':                 documentos,
            'tiene_titulo':               recepcion.tiene_titulo,
            'tiene_dni_titular':          recepcion.tiene_dni_titular,
            'tiene_vtv':                  recepcion.tiene_vtv,
            'tiene_seguro':               recepcion.tiene_seguro,
            'tiene_libre_deuda':          recepcion.tiene_libre_deuda,
            'tiene_service_history':      recepcion.tiene_service_history,
            'tiene_llave_duplicado':      recepcion.tiene_llave_duplicado,
            'tiene_manual':               recepcion.tiene_manual,
            'tiene_gato':                 recepcion.tiene_gato,
            'tiene_rueda_auxilio':        recepcion.tiene_rueda_auxilio,
            'tiene_balizas':              recepcion.tiene_balizas,
            'tiene_08_firmado':           recepcion.tiene_08_firmado,
            'tiene_verificacion_policial':recepcion.tiene_verificacion_policial,
            'tiene_grabado_autopartes':   recepcion.tiene_grabado_autopartes,
            'funciona_ac':               recepcion.funciona_ac,
            'funciona_calefaccion':      recepcion.funciona_calefaccion,
            'funciona_vidrios':          recepcion.funciona_vidrios,
            'funciona_cierre_central':   recepcion.funciona_cierre_central,
            'funciona_luces':            recepcion.funciona_luces,
        }

    contenido = auto.contenidos.last()
    contenido_data = None
    if contenido:
        contenido_data = {
            'copy_instagram':    contenido.copy_instagram,
            'copy_facebook':     contenido.copy_facebook,
            'texto_mercadolibre': contenido.texto_mercadolibre,
            'copy_informe':       contenido.copy_informe,
            'copy_recepcion':     contenido.copy_recepcion,
            'copy_whatsapp': contenido.copy_whatsapp,
            
        }

    gastos = []
    for g in auto.gastos.all():
        gastos.append({
            'id': g.id,
            'tipo': g.tipo,
            'descripcion': g.descripcion,
            'monto': float(g.monto),
            'bonificado': g.bonificado,
            'comprobante_url': g.comprobante.url if g.comprobante else None,
        })
    total_gastos = sum(g['monto'] for g in gastos)
    precio_compra = float(auto.precio_compra) if auto.precio_compra else 0
    ganancia = float(auto.precio) - precio_compra - float(total_gastos)
    
    return JsonResponse({
        'id':                   auto.id,
        'nombre_dueno': auto.nombre_dueno,
        'marca':                auto.marca,
        'modelo':               auto.modelo,
        'anio':                 auto.anio,
        'version':              auto.version,
        'color':                auto.color,
        'precio':               float(auto.precio),
        'precio_compra':        precio_compra or None,
        'telefono_dueno':       auto.telefono_dueno,
        'detalles_adicionales': auto.detalles_adicionales,
        'estado':               auto.estado,
        'fotos':                fotos,
        'recepcion':            recepcion_data,
        'contenido':            contenido_data,
        'gastos':               gastos,
        'total_gastos':         float(total_gastos),
        'ganancia':             ganancia,
        'tiene_recepcion':      recepcion_data is not None,
        'tiene_contenido':      contenido_data is not None,
        'tiene_gastos':         len(gastos) > 0,
        'id':                   auto.id,
        
    })
    
@csrf_exempt
def actualizar_datos(request, auto_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    auto = get_object_or_404(Auto, id=auto_id)
    data = json.loads(request.body)
    
    if 'marca' in data and data['marca']:
        auto.marca = data['marca']
    if 'modelo' in data and data['modelo']:
        auto.modelo = data['modelo']
    if 'anio' in data and data['anio']:
        try: auto.anio = int(data['anio'])
        except: pass
    if 'km' in data and data['km']:
        try: auto.km = int(str(data['km']).replace('.',''))
        except: pass
    if 'version' in data:
        auto.version = data['version']
    if 'color' in data:
        auto.color = data['color']
    if 'precio' in data and data['precio']:
        try: auto.precio = float(str(data['precio']).replace('.','').replace(',','.'))
        except: pass
    if 'precio_compra' in data:
        try: auto.precio_compra = float(str(data['precio_compra']).replace('.','').replace(',','.')) if data['precio_compra'] else None
        except: pass
    if 'detalles' in data:
        auto.detalles = data['detalles']
    if 'nombre_dueno' in data:
        auto.nombre_dueno = data['nombre_dueno']
    if 'telefono_dueno' in data:
        auto.telefono_dueno = data['telefono_dueno']
    if 'detalles_adicionales' in data:
        auto.detalles_adicionales = data['detalles_adicionales']
    
    auto.save()
    return JsonResponse({
        'ok': True,
        'marca': auto.marca,
        'modelo': auto.modelo,
        'anio': auto.anio,
        'version': auto.version,
        'color': auto.color,
    })
@csrf_exempt
def regenerar_copy(request, auto_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    
    auto = get_object_or_404(Auto, id=auto_id)
    data = json.loads(request.body)
    tipo = data.get('tipo')       # ig1, ig2, ig3, ml
    prompt_usuario = data.get('prompt', '')

    tipos_map = {
        'ig1': 'copy de Instagram Opción 1 (historia del auto, emotivo, con emojis y hashtags, SIN precio)',
        'ig2': 'copy de Instagram Opción 2 (directo, enfocado en la oportunidad, SIN precio)',
        'ig3': 'copy de Instagram Opción 3 (enfocado en financiación y permutas, SIN precio)',
        'ml':  'descripción completa para Mercado Libre (con precio ${:.0f}, sin emojis, detallada)'.format(auto.precio),
        'wa':  'mensaje corto de WhatsApp para agendar visita. Máximo 3 líneas. Sin hashtags. Tono directo y argentino. Mencioná el auto y cerrá invitando a pasar a verlo a Caballito.',
    }

    if tipo not in tipos_map:
        return JsonResponse({'error': 'tipo inválido'})

    instruccion_extra = f'\nInstrucción adicional del usuario: {prompt_usuario}' if prompt_usuario else ''

    prompt = f"""Sos el community manager de 'Todo @l Día', negocio familiar con 26 años en Caballito, Buenos Aires.

AUTO:
- {auto.marca} {auto.modelo} {auto.anio}
- {auto.km:,} km · {auto.version} · {auto.color}
- Precio: ${auto.precio:,.0f}
- Detalles: {auto.detalles}
- Info adicional: {auto.detalles_adicionales}

TAREA: Escribí UN {tipos_map[tipo]}.
Estilo argentino, mencioná financiación con bancos y permutas. Persuasivo y largo.{instruccion_extra}

Respondé SOLO con el texto, sin JSON, sin comillas, sin explicaciones."""

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        texto = respuesta.content[0].text.strip()

        # Guardar en DB según tipo
        contenido = ContenidoGenerado.objects.filter(auto=auto).last()
        if contenido:
            if tipo == 'ig1':
                contenido.copy_instagram = texto
            elif tipo == 'ig2':
                contenido.copy_facebook = texto
            elif tipo == 'ml':
                contenido.texto_mercadolibre = texto
            contenido.save()

    except Exception as e:
        return JsonResponse({'error': str(e)})

    return JsonResponse({'texto': texto})

@csrf_exempt
def guardar_recepcion_json(request, auto_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    auto = get_object_or_404(Auto, id=auto_id)
    recepcion, _ = RecepcionAuto.objects.get_or_create(auto=auto)

    # Campos de texto
    recepcion.nombre_cliente     = request.POST.get('nombre_cliente', recepcion.nombre_cliente)
    recepcion.telefono_cliente   = request.POST.get('telefono_cliente', recepcion.telefono_cliente)
    recepcion.observaciones      = request.POST.get('observaciones', recepcion.observaciones)
    recepcion.estado_carroceria  = request.POST.get('estado_carroceria', recepcion.estado_carroceria)
    recepcion.combustible_ingreso = request.POST.get('combustible_ingreso', recepcion.combustible_ingreso)

    # Checkboxes documentación
    checkboxes = [
        'tiene_titulo', 'tiene_dni_titular', 'tiene_vtv', 'tiene_seguro',
        'tiene_libre_deuda', 'tiene_service_history', 'tiene_llave_duplicado',
        'tiene_manual', 'tiene_08_firmado', 'tiene_verificacion_policial',
        'tiene_grabado_autopartes', 'funciona_ac', 'funciona_calefaccion',
        'funciona_vidrios', 'funciona_cierre_central', 'funciona_luces',
    ]
    for campo in checkboxes:
        if campo in request.POST:
            setattr(recepcion, campo, request.POST.get(campo) == 'true')

    # Checkboxes extras
    extras = ['tiene_gato', 'tiene_rueda_auxilio', 'tiene_balizas']
    for campo in extras:
        if campo in request.POST:
            setattr(recepcion, campo, request.POST.get(campo) == 'true')

    recepcion.save()

    # Documentos adjuntos
    docs_creados = []
    for archivo in request.FILES.getlist('documentos'):
        doc = DocumentoRecepcion.objects.create(
            recepcion=recepcion,
            descripcion=archivo.name,
            archivo=archivo,
        )
        docs_creados.append({'id': doc.id, 'descripcion': doc.descripcion, 'url': doc.archivo.url})

    return JsonResponse({'ok': True, 'docs_creados': docs_creados})

@csrf_exempt
def borrar_documento_recepcion(request, doc_id):
    from .models import DocumentoRecepcion
    doc = get_object_or_404(DocumentoRecepcion, id=doc_id)
    doc.archivo.delete()
    doc.delete()
    return JsonResponse({'ok': True})

@csrf_exempt
def crear_gasto(request, auto_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    auto = get_object_or_404(Auto, id=auto_id)
    data = json.loads(request.body)
    descripcion = data.get('descripcion', '').strip()
    if not descripcion:
        return JsonResponse({'ok': False})
    gasto = GastoAuto.objects.create(
        auto=auto,
        tipo='variable',
        descripcion=descripcion,
        monto=0,
    )
    return JsonResponse({'ok': True, 'id': gasto.id})

@csrf_exempt
def editar_gasto_inline(request, gasto_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    gasto = get_object_or_404(GastoAuto, id=gasto_id)
    
    # Si viene con archivo (comprobante)
    if request.FILES.get('comprobante'):
        gasto.comprobante = request.FILES['comprobante']
        gasto.save()
        return JsonResponse({'ok': True, 'comprobante_url': gasto.comprobante.url})
    
    data = json.loads(request.body)
    if 'descripcion' in data:
        gasto.descripcion = data['descripcion']
    if 'monto' in data:
        try:
            gasto.monto = float(str(data['monto']).replace('.','').replace(',','.'))
        except:
            pass
    if 'bonificado' in data:
        gasto.bonificado = data['bonificado']
    gasto.save()

    # Recalcular totales
    auto = gasto.auto
    total = sum(g.monto for g in auto.gastos.all())
    precio_compra = float(auto.precio_compra) if auto.precio_compra else 0
    ganancia = float(auto.precio) - precio_compra - float(total)
    return JsonResponse({
        'ok': True,
        'total_gastos': float(total),
        'ganancia': ganancia
    })

@csrf_exempt  
def borrar_gasto_inline(request, gasto_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    gasto = get_object_or_404(GastoAuto, id=gasto_id)
    auto = gasto.auto
    if gasto.comprobante:
        gasto.comprobante.delete()
    gasto.delete()
    total = sum(g.monto for g in auto.gastos.all())
    precio_compra = float(auto.precio_compra) if auto.precio_compra else 0
    ganancia = float(auto.precio) - precio_compra - float(total)
    return JsonResponse({
        'ok': True,
        'total_gastos': float(total),
        'ganancia': ganancia
    })
    
@csrf_exempt
def generar_copy_informe(request, auto_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    auto = get_object_or_404(Auto, id=auto_id)
    data = json.loads(request.body)
    prompt_extra = data.get('prompt', '').strip()
    texto_directo = data.get('texto', '').strip()
    
     # ── GUARDAR DIRECTO ──
    if texto_directo and not prompt_extra:
        contenido, _ = ContenidoGenerado.objects.get_or_create(auto=auto)
        contenido.copy_informe = texto_directo
        contenido.save()
        return JsonResponse({'ok': True, 'texto': texto_directo})

    gastos = auto.gastos.all()
    bonificados = gastos.filter(bonificado=True)
    total_bonificado = sum(g.monto for g in bonificados)
    total_gastos = sum(g.monto for g in gastos.filter(tipo='variable'))

    servicios_txt = '\n'.join([f"- {g.descripcion}: ${g.monto:,.0f} ({'BONIFICADO' if g.bonificado else 'cobrado'})" for g in gastos])

    prompt = f"""Sos el redactor de 'Todo @l Día', negocio familiar con 26 años en Caballito, Buenos Aires.

Escribí un mensaje cálido y profesional para enviarle al dueño del vehículo junto con el informe de gastos.
El mensaje debe transmitir confianza, transparencia y el valor del servicio recibido.

AUTO: {auto.marca} {auto.modelo} {auto.anio}
SERVICIOS Y GASTOS:
{servicios_txt}
TOTAL BONIFICADO: ${total_bonificado:,.0f}
TOTAL GASTOS ADICIONALES: ${total_gastos:,.0f}

El mensaje debe:
- Agradecer la confianza
- Destacar el ahorro real que tuvo con los servicios bonificados
- Mencionar que todo fue hecho con transparencia
- Invitar a cualquier consulta
- Tono cercano, argentino, familiar pero profesional
- Máximo 7 líneas
- Buscar que si le gusto el servicio recuerde recomendarnos
{f'Instrucción adicional: {prompt_extra}' if prompt_extra else ''}

Respondé SOLO con el texto del mensaje, sin comillas ni explicaciones."""

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        texto = respuesta.content[0].text.strip()
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)})

    contenido, _ = ContenidoGenerado.objects.get_or_create(auto=auto)
    contenido.copy_informe = texto
    contenido.save()

    return JsonResponse({'ok': True, 'texto': texto})

@csrf_exempt
def generar_copy_recepcion(request, auto_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    auto = get_object_or_404(Auto, id=auto_id)
    data = json.loads(request.body)
    prompt_extra = data.get('prompt', '').strip()
    texto_directo = data.get('texto', '').strip()
    
     # ── GUARDAR DIRECTO (el usuario editó el texto, no quiere regenerar) ──
    if texto_directo and not prompt_extra:
        contenido, _ = ContenidoGenerado.objects.get_or_create(auto=auto)
        contenido.copy_recepcion = texto_directo
        contenido.save()
        return JsonResponse({'ok': True, 'texto': texto_directo})

    recepcion = getattr(auto, 'recepcion', None)
    docs_entregados = []
    if recepcion:
        if recepcion.tiene_titulo: docs_entregados.append('Título')
        if recepcion.tiene_dni_titular: docs_entregados.append('DNI titular')
        if recepcion.tiene_vtv: docs_entregados.append('VTV')
        if recepcion.tiene_seguro: docs_entregados.append('Seguro')
        if recepcion.tiene_libre_deuda: docs_entregados.append('Libre de deuda')

    prompt = f"""Sos el redactor de 'Todo @l Día', negocio familiar con 26 años en Caballito, Buenos Aires.

Escribí un mensaje cálido para enviarle al dueño del vehículo junto con el comprobante de recepción del vehiculo.

AUTO/MOTO (segun corresponda): {auto.marca} {auto.modelo} {auto.anio}
DOCUMENTACIÓN RECIBIDA: {', '.join(docs_entregados) if docs_entregados else 'pendiente de completar'}
TITULAR: {recepcion.nombre_cliente if recepcion else 'el titular'}

El mensaje debe:
- Confirmar que recibimos el vehículo
- Mencionar que está en buenas manos
- Dar tranquilidad sobre el proceso
- Tono cercano, argentino, familiar pero profesional
- Máximo 4 líneas
{f'Instrucción adicional: {prompt_extra}' if prompt_extra else ''}

Respondé SOLO con el texto, sin comillas ni explicaciones."""

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        texto = respuesta.content[0].text.strip()
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)})

    contenido, _ = ContenidoGenerado.objects.get_or_create(auto=auto)
    contenido.copy_recepcion = texto
    contenido.save()

    return JsonResponse({'ok': True, 'texto': texto})

@csrf_exempt
def pedidos(request):
    from .models import Pedido
    if request.method == 'POST':
        data = json.loads(request.body)
        pedido = Pedido.objects.create(
            descripcion=data.get('descripcion', ''),
            nombre_cliente=data.get('nombre_cliente', ''),
            telefono_cliente=data.get('telefono_cliente', ''),
            notas=data.get('notas', ''),
            presupuesto=data.get('presupuesto') or None,
        )
        return JsonResponse({'ok': True, 'id': pedido.id})
    
    pedidos = Pedido.objects.filter(resuelto=False).order_by('-fecha')
    pedidos_data = []
    for p in pedidos:
        pedidos_data.append({
            'id': p.id,
            'descripcion': p.descripcion,
            'nombre_cliente': p.nombre_cliente,
            'telefono_cliente': p.telefono_cliente,
            'notas': p.notas,
            'presupuesto': float(p.presupuesto) if p.presupuesto else None,
            'fecha': p.fecha.strftime('%d/%m/%Y'),
        })
    return JsonResponse({'pedidos': pedidos_data})

@csrf_exempt
def resolver_pedido(request, pedido_id):
    from .models import Pedido
    pedido = get_object_or_404(Pedido, id=pedido_id)
    pedido.resuelto = True
    pedido.save()
    return JsonResponse({'ok': True})

@csrf_exempt
def borrar_pedido(request, pedido_id):
    from .models import Pedido
    pedido = get_object_or_404(Pedido, id=pedido_id)
    pedido.delete()
    return JsonResponse({'ok': True})

@csrf_exempt
def editar_pedido(request, pedido_id):
    from .models import Pedido
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    pedido = get_object_or_404(Pedido, id=pedido_id)
    data = json.loads(request.body)
    if 'descripcion' in data:
        pedido.descripcion = data['descripcion']
    if 'nombre_cliente' in data:
        pedido.nombre_cliente = data['nombre_cliente']
    if 'telefono_cliente' in data:
        pedido.telefono_cliente = data['telefono_cliente']
    if 'notas' in data:
        pedido.notas = data['notas']
    if 'presupuesto' in data:
        pedido.presupuesto = data['presupuesto'] or None
    pedido.save()
    return JsonResponse({'ok': True})

from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json

from .models import Auto, LeadComentario, LeadRechazado


# ══════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════

def _lead_to_dict(auto):
    """
    Convierte un Auto (estado='lead') en un dict con toda la info
    necesaria para renderizar la tarjeta en el kanban del frontend.
    
    Se llama desde leads_kanban para armar la respuesta JSON.
    """
    # Foto principal o primera disponible para mostrar en la tarjeta
    foto = auto.fotos.filter(es_principal=True).first() or auto.fotos.first()

    # Último comentario para mostrar en la tarjeta como preview
    ultimo_comentario = auto.lead_comentarios.first()

    # Calcular días en pipeline desde que entró como lead
    dias = (timezone.now() - auto.fecha_ingreso).days

    # Brecha de precio: cuánto pide vs cuánto estimamos
    precio_pedido = float(auto.lead_precio_pedido) if auto.lead_precio_pedido else None
    precio_estimado = float(auto.precio) if auto.precio else None
    brecha = None
    if precio_pedido and precio_estimado:
        brecha = precio_pedido - precio_estimado  # positivo = pide más de lo que vale

    return {
        'id':                auto.id,
        'marca':             auto.marca,
        'modelo':            auto.modelo,
        'anio':              auto.anio,
        'km':                auto.km,
        'version':           auto.version,
        'color':             auto.color,
        'nombre_dueno':      auto.nombre_dueno,
        'telefono_dueno':    auto.telefono_dueno,
        'detalles_adicionales': auto.detalles_adicionales,
        'lead_estado':       auto.lead_estado,
        'lead_temperatura':  auto.lead_temperatura,
        'lead_origen':       auto.lead_origen,
        'precio_pedido':     precio_pedido,
        'precio_estimado':   precio_estimado,
        'brecha_precio':     brecha,
        'dias_en_pipeline':  dias,
        'foto_url':          foto.imagen.url if foto else None,
        'ultimo_comentario': {
            'texto': ultimo_comentario.texto,
            'tipo':  ultimo_comentario.tipo,
            'fecha': ultimo_comentario.fecha.strftime('%d/%m %H:%M'),
        } if ultimo_comentario else None,
        # Alerta visual si lleva mucho tiempo sin moverse
        'alerta_tiempo':     dias >= 7,
    }


def _registrar_comentario_automatico(auto, texto):
    """
    Crea un LeadComentario de tipo 'cambio_estado' automáticamente.
    Se llama desde lead_mover, lead_tomar y lead_rechazar.
    
    Así el historial se construye solo sin que nadie tenga que escribir nada.
    """
    LeadComentario.objects.create(
        auto=auto,
        tipo='cambio_estado',
        texto=texto,
    )


# ══════════════════════════════════════════════════════════════
# VIEWS
# ══════════════════════════════════════════════════════════════

def leads_kanban(request):
    """
    GET /leads/kanban/
    
    Devuelve todos los leads activos agrupados por columna.
    Excluye los leads rechazados (que tienen un LeadRechazado asociado).
    
    El frontend usa esto para renderizar las 3 columnas del kanban.
    """
    # Todos los leads activos, excluye rechazados
    leads_activos = Auto.objects.filter(
        estado='lead'
    ).exclude(
        lead_rechazo__isnull=False  # excluir los que tienen LeadRechazado
    ).order_by('fecha_ingreso')

    # Agrupar por columna
    columnas = {
        'sin_contacto': [],
        'contactado':   [],
        'visitado':     [],
    }
    for auto in leads_activos:
        col = auto.lead_estado or 'sin_contacto'
        if col in columnas:
            columnas[col].append(_lead_to_dict(auto))

    # Contar rechazados para mostrar en algún stat futuro
    total_rechazados = LeadRechazado.objects.count()

    return JsonResponse({
        'columnas':         columnas,
        'total_activos':    leads_activos.count(),
        'total_rechazados': total_rechazados,
    })


@csrf_exempt
def lead_mover(request, auto_id):
    """
    POST /lead/<id>/mover/
    Body: { "columna": "contactado" }
    
    Mueve el lead a otra columna del kanban.
    Se llama cuando el usuario arrastra una tarjeta.
    
    Automáticamente registra el cambio en el historial con fecha y hora.
    """
    if request.method != 'POST':
        return JsonResponse({'ok': False})

    auto = get_object_or_404(Auto, id=auto_id, estado='lead')
    data = json.loads(request.body)
    nueva_columna = data.get('columna')

    columnas_validas = ['sin_contacto', 'contactado', 'visitado']
    if nueva_columna not in columnas_validas:
        return JsonResponse({'ok': False, 'error': 'Columna inválida'})

    columna_anterior = auto.lead_estado

    # Solo mover si realmente cambió de columna
    if columna_anterior == nueva_columna:
        return JsonResponse({'ok': True, 'sin_cambios': True})

    # Labels legibles para el historial
    labels = {
        'sin_contacto': 'Sin contacto',
        'contactado':   'Contactado sin visita',
        'visitado':     'Visitado — cerrando',
    }

    auto.lead_estado = nueva_columna
    auto.save()

    # Registrar automáticamente en el historial
    _registrar_comentario_automatico(
        auto,
        f"Pasó de '{labels.get(columna_anterior, columna_anterior)}' "
        f"a '{labels.get(nueva_columna, nueva_columna)}'"
    )

    return JsonResponse({'ok': True, 'lead_estado': nueva_columna})


@csrf_exempt
def lead_comentario_agregar(request, auto_id):
    """
    POST /lead/<id>/comentario/
    Body: { "texto": "Bajó el precio a $12.000, viene el viernes" }
    
    Agrega un comentario manual al historial del lead.
    Tu papá lo usa para anotar cualquier cosa relevante de la negociación.
    """
    if request.method != 'POST':
        return JsonResponse({'ok': False})

    auto = get_object_or_404(Auto, id=auto_id, estado='lead')
    data = json.loads(request.body)
    texto = data.get('texto', '').strip()

    if not texto:
        return JsonResponse({'ok': False, 'error': 'El comentario no puede estar vacío'})

    comentario = LeadComentario.objects.create(
        auto=auto,
        tipo='comentario',
        texto=texto,
    )

    return JsonResponse({
        'ok': True,
        'comentario': {
            'id':    comentario.id,
            'tipo':  comentario.tipo,
            'texto': comentario.texto,
            'fecha': comentario.fecha.strftime('%d/%m %H:%M'),
        }
    })


@csrf_exempt
def lead_temperatura_cambiar(request, auto_id):
    """
    POST /lead/<id>/temperatura/
    Body: { "temperatura": "caliente" }
    
    Cambia la temperatura del lead (🔥 caliente / 🟡 tibio / ❄️ frío).
    Tu papá lo setea manualmente según cómo ve la negociación.
    También se registra en el historial automáticamente.
    """
    if request.method != 'POST':
        return JsonResponse({'ok': False})

    auto = get_object_or_404(Auto, id=auto_id, estado='lead')
    data = json.loads(request.body)
    nueva_temp = data.get('temperatura')

    temps_validas = ['caliente', 'tibio', 'frio']
    if nueva_temp not in temps_validas:
        return JsonResponse({'ok': False, 'error': 'Temperatura inválida'})

    labels_temp = {
        'caliente': '🔥 Caliente',
        'tibio':    '🟡 Tibio',
        'frio':     '❄️ Frío',
    }

    auto.lead_temperatura = nueva_temp
    auto.save()

    # Registrar en historial
    LeadComentario.objects.create(
        auto=auto,
        tipo='temperatura',
        texto=f"Temperatura cambiada a {labels_temp[nueva_temp]}",
    )

    return JsonResponse({'ok': True, 'temperatura': nueva_temp})


@csrf_exempt
def lead_tomar(request, auto_id):
    """
    POST /lead/<id>/tomar/
    
    "Tomamos el auto" — convierte el lead en stock.
    
    Lo que hace:
    1. Cambia estado de 'lead' a 'disponible'
    2. Registra en el historial cuándo fue tomado
    3. Crea los servicios fijos automáticamente (igual que nuevo_auto)
    4. Devuelve el id para que el frontend redirija al auto en el CRM
    """
    if request.method != 'POST':
        return JsonResponse({'ok': False})

    auto = get_object_or_404(Auto, id=auto_id, estado='lead')

    # Guardar info del lead antes de cambiar estado
    dias_en_pipeline = (timezone.now() - auto.fecha_ingreso).days

    # Convertir a stock
    auto.estado = 'disponible'
    auto.lead_estado = ''  # limpiar columna del kanban
    auto.save()

    # Registrar en historial
    _registrar_comentario_automatico(
        auto,
        f"✅ Auto tomado y pasado a Stock después de {dias_en_pipeline} días en pipeline."
    )

    # Crear servicios fijos si no existen (igual que cuando se carga un auto nuevo)
    from .models import GastoAuto
    servicios_fijos = [
        ('limpieza',          'Limpieza y preparación profesional del vehículo',     25000),
        ('publicacion',       'Publicación multicanal: MercadoLibre, Instagram y Facebook', 77000),
        ('cochera',           'Cochera / Guardado seguro bajo techo',                150000),
        ('fotos_profesionales','Fotos, Videos y Reels profesionales para destacar en redes', 150000),
        ('gestoria',          'Gestoría y tramitación de papeles sin vueltas',       150000),
    ]
    for cat, desc, monto in servicios_fijos:
        if not GastoAuto.objects.filter(auto=auto, categoria_fija=cat).exists():
            GastoAuto.objects.create(
                auto=auto,
                tipo='fijo',
                categoria_fija=cat,
                descripcion=desc,
                monto=monto,
                bonificado=True,
            )

    return JsonResponse({
        'ok':     True,
        'auto_id': auto.id,
        'mensaje': f'Auto tomado. Ahora está en Stock.'
    })


@csrf_exempt
def lead_rechazar(request, auto_id):
    """
    POST /lead/<id>/rechazar/
    Body: {
        "motivo": "precio",
        "detalle": "Pedía $15.000, ofrecimos $11.000, no llegamos"
    }
    
    Rechaza el lead y guarda toda la info para analytics futuros.
    
    Lo que hace:
    1. Crea un LeadRechazado con motivo + contexto para el BI
    2. Registra en el historial con motivo
    3. El auto queda con estado='lead' pero excluido del kanban
       (porque tiene LeadRechazado asociado)
    """
    if request.method != 'POST':
        return JsonResponse({'ok': False})

    auto = get_object_or_404(Auto, id=auto_id, estado='lead')
    data = json.loads(request.body)
    motivo = data.get('motivo', 'otro')
    detalle = data.get('detalle', '').strip()

    motivos_validos = ['precio', 'documentacion', 'danos', 'otro']
    if motivo not in motivos_validos:
        motivo = 'otro'

    # Calcular días en pipeline para analytics
    dias_en_pipeline = (timezone.now() - auto.fecha_ingreso).days

    # Verificar que no esté ya rechazado
    if hasattr(auto, 'lead_rechazo'):
        return JsonResponse({'ok': False, 'error': 'Este lead ya fue rechazado'})

    # Crear el registro de rechazo — esto lo archiva del kanban
    LeadRechazado.objects.create(
        auto=auto,
        motivo=motivo,
        detalle=detalle,
        origen_lead=auto.lead_origen,
        dias_en_pipeline=dias_en_pipeline,
        columna_rechazo=auto.lead_estado,
        fecha_ingreso_lead=auto.fecha_ingreso,
    )

    # Labels legibles para el historial
    motivo_labels = {
        'precio':        'Precio',
        'documentacion': 'Documentación',
        'danos':         'Daños',
        'otro':          'Otro',
    }
    texto_historial = f"❌ Lead rechazado. Motivo: {motivo_labels.get(motivo, motivo)}."
    if detalle:
        texto_historial += f" Detalle: {detalle}"

    _registrar_comentario_automatico(auto, texto_historial)

    return JsonResponse({
        'ok':     True,
        'motivo': motivo,
        'mensaje': f'Lead rechazado por {motivo_labels.get(motivo, motivo)}.'
    })


def lead_historial(request, auto_id):
    """
    GET /lead/<id>/historial/
    
    Devuelve el historial completo de comentarios de un lead.
    Se usa cuando el usuario expande la tarjeta para ver todo lo que pasó.
    """
    auto = get_object_or_404(Auto, id=auto_id)
    comentarios = auto.lead_comentarios.all()  # ya viene ordenado por -fecha

    data = []
    for c in comentarios:
        data.append({
            'id':    c.id,
            'tipo':  c.tipo,
            'texto': c.texto,
            'fecha': c.fecha.strftime('%d/%m/%Y %H:%M'),
        })

    return JsonResponse({'historial': data})

@csrf_exempt
def agregar_fotos(request, auto_id):
    """Agrega fotos a un auto existente, con análisis IA automático."""
    auto = get_object_or_404(Auto, id=auto_id)
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    fotos = request.FILES.getlist('fotos')
    if not fotos:
        return JsonResponse({'ok': False, 'error': 'No se recibieron fotos'})
    nuevas = []
    for foto in fotos:
        foto_obj = FotoAuto.objects.create(auto=auto, imagen=foto)
        analisis = _analizar_foto(foto_obj)
        nuevas.append({'id': foto_obj.id, 'url': foto_obj.imagen.url})
    _seleccionar_mejor_principal(auto)
    return JsonResponse({'ok': True, 'count': len(nuevas), 'fotos': nuevas})
@csrf_exempt
def community_manager_contexto(request):
    from django.utils import timezone
    from datetime import timedelta
    import urllib.request
    import urllib.parse
    from concurrent.futures import ThreadPoolExecutor, as_completed

    hoy = timezone.now()
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0)

    def consultar_ml(auto):
        try:
            query = f"{auto.marca} {auto.modelo} {auto.anio}"
            query_encoded = urllib.parse.quote(query)
            url = f"https://api.mercadolibre.com/sites/MLA/search?q={query_encoded}&category=MLA1744&limit=5"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=3) as response:
                ml_response = json.loads(response.read().decode())
                resultados = ml_response.get('results', [])
                if resultados:
                    precios = [r['price'] for r in resultados if r.get('price')]
                    if precios:
                        # ML mezcla precios en ARS y USD
                        # Los precios < 5000 probablemente son USD, convertirlos
                        try:
                            tc_url = 'https://api.exchangerate-api.com/v4/latest/USD'
                            tc_req = urllib.request.Request(tc_url, headers={'User-Agent': 'Mozilla/5.0'})
                            with urllib.request.urlopen(tc_req, timeout=3) as tc_resp:
                                tc_data = json.loads(tc_resp.read().decode())
                                tipo_cambio = tc_data['rates']['ARS']
                        except Exception:
                            tipo_cambio = 1200  # fallback conservador

                        precios_ars = []
                        for p in precios:
                            if p < 5000:  # probablemente USD
                                precios_ars.append(p * tipo_cambio)
                            else:
                                precios_ars.append(p)

                        promedio = sum(precios_ars) / len(precios_ars)
                        return auto.id, {
                            'cantidad': len(precios_ars),
                            'precio_min': min(precios_ars),
                            'precio_max': max(precios_ars),
                            'precio_promedio': promedio,
                            'diferencia': float(auto.precio) - promedio,
                            'tipo_cambio_usado': tipo_cambio,
                        }
        except Exception:
            pass
        return auto.id, None

    disponibles = list(Auto.objects.filter(estado='disponible').order_by('fecha_ingreso'))

    # Consultar ML en paralelo para todos los autos
    ml_resultados = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(consultar_ml, auto): auto for auto in disponibles}
        for future in as_completed(futures, timeout=5):
            try:
                auto_id, ml_data = future.result()
                ml_resultados[auto_id] = ml_data
            except Exception:
                pass

    stock_data = []
    for auto in disponibles:
        dias = (hoy - auto.fecha_ingreso).days
        ml_data = ml_resultados.get(auto.id)
        stock_data.append({
            'id': auto.id,
            'marca': auto.marca,
            'modelo': auto.modelo,
            'anio': auto.anio,
            'km': auto.km,
            'precio': float(auto.precio),
            'dias_en_stock': dias,
            'alerta_30_dias': dias >= 30,
            'tiene_fotos': auto.fotos.filter(aprobada=True).exists(),
            'tiene_contenido': auto.contenidos.exists(),
            'ml': ml_data,
        })

    reservados = Auto.objects.filter(estado='reservado')
    reservados_data = [{
        'marca': a.marca, 'modelo': a.modelo, 'anio': a.anio,
        'dias_en_stock': (hoy - a.fecha_ingreso).days,
    } for a in reservados]

    vendidos_mes = Auto.objects.filter(estado='vendido', fecha_ingreso__gte=inicio_mes)
    vendidos_data = [{'marca': a.marca, 'modelo': a.modelo, 'anio': a.anio} for a in vendidos_mes]

    leads = Auto.objects.filter(estado='lead').exclude(lead_rechazo__isnull=False)
    leads_data = [{
        'marca': a.marca, 'modelo': a.modelo,
        'temperatura': a.lead_temperatura,
        'dias': (hoy - a.fecha_ingreso).days,
    } for a in leads]

    from .models import Pedido
    pedidos = Pedido.objects.filter(resuelto=False)
    pedidos_data = [{
        'descripcion': p.descripcion,
        'presupuesto': float(p.presupuesto) if p.presupuesto else None,
    } for p in pedidos]

    # Alertas
    alertas = []
    for auto in stock_data:
        if auto['dias_en_stock'] >= 30:
            msg = f"⚠️ {auto['marca']} {auto['modelo']} {auto['anio']} lleva {auto['dias_en_stock']} días en stock"
            if auto['ml'] and auto['ml']['diferencia'] > 0:
                msg += f" — precio ${auto['ml']['diferencia']:,.0f} por encima del promedio ML"
            alertas.append(msg)

    leads_sin_contactar = [l for l in leads_data if l['temperatura'] == 'frio' and l['dias'] >= 3]
    if leads_sin_contactar:
        alertas.append(f"⚠️ {len(leads_sin_contactar)} leads fríos sin contactar hace más de 3 días")
    if not stock_data:
        alertas.append("⚠️ No tenés autos disponibles en stock")

    score = 10
    if len([a for a in stock_data if a['dias_en_stock'] >= 30]) > 0: score -= 2
    if leads_sin_contactar: score -= 1
    if not stock_data: score -= 3
    score = max(1, score)

    return JsonResponse({
        'stock_disponible': stock_data,
        'reservados': reservados_data,
        'vendidos_mes': vendidos_data,
        'leads_activos': leads_data,
        'pedidos_pendientes': pedidos_data,
        'alertas': alertas,
        'score_salud': score,
        'total_disponible': len(stock_data),
        'total_reservado': len(reservados_data),
        'total_vendido_mes': len(vendidos_data),
        'total_leads': len(leads_data),
        'total_pedidos': len(pedidos_data),
        'fecha_hoy': hoy.strftime('%A %d de %B de %Y'),
    })
@csrf_exempt  
def community_manager_chat(request):
    """
    POST /cm/chat/
    Body: { "mensaje": "...", "historial": [...] }
    La IA recibe el contexto del negocio + el historial del chat y responde.
    """
    if request.method != 'POST':
        return JsonResponse({'ok': False})
    
    data = json.loads(request.body)
    mensaje_usuario = data.get('mensaje', '')
    historial = data.get('historial', [])
    contexto_negocio = data.get('contexto', {})

    # Construir el sistema prompt con el contexto del negocio
    lineas_stock = []
    for a in contexto_negocio.get('stock_disponible', []):
        linea = f"- {a['marca']} {a['modelo']} {a['anio']} | {a['km']:,} km | ${a['precio']:,.0f} | {a['dias_en_stock']} días en stock"
        if a.get('alerta_30_dias'):
            linea += " ⚠️ MÁS DE 30 DÍAS"
        if a.get('ml'):
            ml = a['ml']
            dif = ml['diferencia']
            if dif > 0:
                linea += f" | ML: promedio ${ml['precio_promedio']:,.0f} — estamos ${dif:,.0f} MÁS CARO ({ml['cantidad']} autos similares)"
            elif dif < 0:
                linea += f" | ML: promedio ${ml['precio_promedio']:,.0f} — estamos ${abs(dif):,.0f} MÁS BARATO ({ml['cantidad']} autos similares) ✅ buen precio"
            else:
                linea += f" | ML: en línea con el mercado (promedio ${ml['precio_promedio']:,.0f})"
        lineas_stock.append(linea)
    stock_txt = '\n'.join(lineas_stock) or 'Sin stock disponible'

    vendidos_txt = ', '.join([
        f"{v['marca']} {v['modelo']} {v['anio']}"
        for v in contexto_negocio.get('vendidos_mes', [])
    ]) or 'Ninguno este mes'

    leads_txt = f"{contexto_negocio.get('total_leads', 0)} leads activos"
    pedidos_lista = []
    for p in contexto_negocio.get('pedidos_pendientes', []):
        linea = f"- {p['descripcion']}"
        if p['presupuesto']:
            linea += f" (presupuesto: ${p['presupuesto']:,.0f})"
        pedidos_lista.append(linea)
    pedidos_txt = '\n'.join(pedidos_lista) or 'Sin pedidos pendientes'

    alertas_txt = '\n'.join(contexto_negocio.get('alertas', [])) or 'Sin alertas'

    sistema = f"""Sos el Community Manager IA de "Todo @l Día", concesionaria familiar con 26 años en Caballito, Buenos Aires.

Tu personalidad: sos directo, inteligente, estratégico y conversacional. No tirás todo de una. Primero analizás, después preguntás, después actuás.

ESTADO ACTUAL DEL NEGOCIO HOY ({contexto_negocio.get('fecha_hoy', '')}):
- Score de salud: {contexto_negocio.get('score_salud', 10)}/10
- Autos disponibles: {contexto_negocio.get('total_disponible', 0)}
- Reservados: {contexto_negocio.get('total_reservado', 0)}
- Vendidos este mes: {contexto_negocio.get('total_vendido_mes', 0)}
- Leads activos: {contexto_negocio.get('total_leads', 0)}

STOCK DISPONIBLE:
{stock_txt}

VENDIDOS ESTE MES:
{vendidos_txt}

LEADS Y PEDIDOS:
{leads_txt}
Clientes buscando:
{pedidos_txt}

ALERTAS ACTIVAS:
{alertas_txt}

EDITORES DISPONIBLES:
- Editor POST (1080x1350): Consignación, Permuta, Financiación, WhatsApp, Stock
- Editor STORY (1080x1920): 7 layouts disponibles
ESTRATEGIA 2026 — PILARES:
1. CONFIANZA: 26 años en el barrio, familia, transparencia
2. PRUEBA SOCIAL: autos vendidos, clientes contentos
3. EDUCACIÓN: explicar consignación, permuta, financiación
4. URGENCIA: stock limitado, ofertas, precio

OBJETIVO PRINCIPAL DEL NEGOCIO: Conseguir consignaciones.

USO DE DATOS DE MERCADOLIBRE — MUY IMPORTANTE:
Para cada auto del stock tenés datos reales de ML. Usálos así:
- Si un auto está MÁS CARO que ML: sugerí bajar el precio O publicarlo con algún diferencial (garantía, papeles, financiación)
- Si un auto está MÁS BARATO que ML: es una OPORTUNIDAD — publicarlo con urgencia, destacar el precio
- Si un auto lleva +20 días en stock Y está más caro que ML: es URGENTE — priorizar en el calendario
- Siempre mencioná la comparación con ML cuando sea relevante para justificar decisiones de contenido
- Ejemplo: "El Strada lleva 28 días y está $200.000 más caro que el promedio de ML — esta semana lo publicamos con financiación para justificar el precio"

DETECTOR DE OPORTUNIDADES:
- Si hay pedidos de clientes que coincidan con autos del stock, AVISALO siempre
- Ejemplo: "Tenés un cliente buscando una camioneta y el Strada está disponible — contactalo antes de publicar"
- Si hay leads calientes sin contactar hace más de 2 días, mencionalo como urgencia

TIMING INTELIGENTE PARA ARGENTINA 2026:
- Lunes 9-10 AM: arranque de semana, alto engagement
- Martes y jueves 10-11 AM: mejor día para consignación y educación
- Viernes 17-18 hs: la gente piensa en el fin de semana, ideal para autos
- Sábado 10-11 AM: pico máximo de engagement para autos
- Quincena (15 y 30 de cada mes): mejor momento para publicar autos caros
- Evitar domingos a la noche para posts importantes

ANÁLISIS DE RENTABILIDAD:
- Cada auto tiene precio de compra y precio de venta en el sistema
- Priorizá en el calendario los autos con mayor margen de ganancia
- Si un auto tiene poco margen, sugerí subirlo de precio o trabajarlo con permuta
- Ejemplo: "El Corolla tiene $800K de margen — es tu mejor negocio esta semana, lo ponemos el sábado que es el día de mayor tráfico"
- Si el margen es negativo o muy bajo, avisalo como alerta

PERFIL DEL COMPRADOR IDEAL:
- Basándote en los autos vendidos este mes, identificá patrones
- ¿Qué rango de precio se vende más? ¿Qué tipo de auto (sedan, SUV, pickup)?
- Orientá el contenido a ese perfil: "Tus compradores típicos buscan autos entre $5M y $8M — enfocamos el contenido en ese rango"
- Si hay pedidos de clientes, usálos para entender qué busca el mercado ahora mismo

CONTEXTO DE FECHAS IMPORTANTES ARGENTINA:
- Siempre verificá si hay fechas especiales esta semana o el fin de semana
- Quincena (14-16 y 29-31 de cada mes): mejor momento para publicar autos de mayor precio
- Fines de semana largo: anticipar con contenido de urgencia el viernes
- Día del padre (3er domingo de junio): contenido especial "regalale el auto que siempre quiso"
- Navidad/Año nuevo: contenido de cierre de año y balance
- Si es quincena esta semana, priorizá los autos más caros en el calendario

SEGUIMIENTO POST-VENTA:
- Si vendiste autos este mes, recordá llamar a los compradores a los 15 días
- Sugerí hacer un post de "auto entregado" para prueba social
- Los clientes contentos son la mejor publicidad para conseguir consignaciones

═══════════════════════════════════════════
REGLAS DE CONVERSACIÓN — MUY IMPORTANTES:
═══════════════════════════════════════════

1. NUNCA tirés el calendario completo de primera sin antes hacer preguntas.

2. Cuando te pidan un calendario o ideas, SIEMPRE seguí este flujo de 3 pasos:

   PASO 1 — ANÁLISIS BREVE (4-5 líneas):
   Contá qué ves en el negocio usando los datos reales:
   - ¿Qué auto lleva más días en stock?
   - ¿Qué auto está más barato o caro vs ML?
   - ¿Hay algún match entre pedidos y stock?
   - ¿Hay leads sin contactar?
   Ejemplo: "El Strada lleva 28 días y está $200K más caro que ML. El HRV es tu joya — está $500K más barato que el mercado. Tenés un lead caliente sin contactar hace 3 días."

   PASO 2 — PROPUESTA ESTRATÉGICA (3-4 líneas):
   Decí cuál es tu propuesta general con justificación de ML:
   Ejemplo: "Esta semana: publicamos el HRV con urgencia porque está muy bien de precio vs ML. 
   El Strada lo trabajamos con financiación para justificar el precio. 
   El jueves hacemos consignación — es el mejor día para eso."

   PASO 3 — PREGUNTAS (mínimo 2, máximo 3):
   Hacé preguntas inteligentes y específicas:
   - "¿Tenés fotos nuevas del HRV o usamos las que ya subiste?"
   - "¿Esta semana podés grabar un reel rápido de 30 segundos?"
   - "¿Querés bajar el precio del Strada o lo trabajamos con financiación?"
   - "¿Hay alguna fecha especial esta semana que quieras aprovechar?"

3. Solo armás el calendario COMPLETO después de que el usuario responda las preguntas.

4. Cuando armés el calendario final, para CADA DÍA incluí SIEMPRE:
   - Tipo: POST o STORY o REEL
   - Editor a usar: POST (consignación/permuta/stock/financiación/whatsapp) o STORY (layout X)
   - Foto sugerida: qué foto usar de fondo o qué fotografiar
   - Horario óptimo: basate en el timing inteligente de arriba
   - Objetivo: qué querés lograr con esa publicación
   - Referencia ML si aplica: "publicamos con urgencia porque está $X más barato que ML"

   🎯 Objetivo 1: [objetivo concreto y medible]
   🎯 Objetivo 2: [objetivo concreto y medible]
   🎯 Objetivo 3: [objetivo concreto y medible]

   ⚡ Must 1: [acción concreta que hay que hacer sí o sí]
   ⚡ Must 2: [acción concreta]
   ⚡ Must 3: [acción concreta]

   **LUNES** — [tipo: POST/STORY/REEL]
   - Horario: [hora óptima]
   - Editor: [nombre del editor]
   - Foto: [qué foto usar]
   - Objetivo: [qué querés lograr]
   - Copy:
   [texto completo del post listo para copiar, con emojis y hashtags]
   ---

   **MARTES** — [tipo]
   ...etc
5. Hablás siempre en español argentino, tono directo y cercano.
6. Usás emojis pero con criterio, no en exceso.
7. Cuando el usuario modifica algo, actualizás solo esa parte sin rehacer todo."""

    # Construir mensajes para la API
    mensajes_api = []
    for msg in historial:
        mensajes_api.append({
            'role': msg['role'],
            'content': msg['content']
        })
    mensajes_api.append({
        'role': 'user',
        'content': mensaje_usuario
    })

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=2000,
            system=sistema,
            messages=mensajes_api
        )
        texto_respuesta = respuesta.content[0].text.strip()
    except Exception as e:
        return JsonResponse({'ok': False, 'error': str(e)})

    return JsonResponse({
        'ok': True,
        'respuesta': texto_respuesta
    })
    
@csrf_exempt
def metricas_semanales(request):
    """
    GET /cm/metricas/ — devuelve las últimas 8 semanas
    POST /cm/metricas/ — guarda las métricas de la semana
    """
    from .models import MetricasSemanal

    if request.method == 'POST':
        data = json.loads(request.body)
        MetricasSemanal.objects.create(
            fecha_inicio=data.get('fecha_inicio'),
            fecha_fin=data.get('fecha_fin'),
            alcance=data.get('alcance', 0),
            impresiones=data.get('impresiones', 0),
            interacciones=data.get('interacciones', 0),
            seguidores_nuevos=data.get('seguidores_nuevos', 0),
            mejor_post=data.get('mejor_post', ''),
            consultas_recibidas=data.get('consultas_recibidas', 0),
            visitas_al_local=data.get('visitas_al_local', 0),
            publicaciones_realizadas=data.get('publicaciones_realizadas', 0),
            notas=data.get('notas', ''),
        )
        return JsonResponse({'ok': True})

    # GET — devolver últimas 8 semanas
    from .models import MetricasSemanal
    metricas = MetricasSemanal.objects.all()[:8]
    data = []
    for m in metricas:
        data.append({
            'fecha_inicio': m.fecha_inicio.strftime('%d/%m/%Y'),
            'fecha_fin': m.fecha_fin.strftime('%d/%m/%Y'),
            'alcance': m.alcance,
            'impresiones': m.impresiones,
            'interacciones': m.interacciones,
            'seguidores_nuevos': m.seguidores_nuevos,
            'mejor_post': m.mejor_post,
            'consultas_recibidas': m.consultas_recibidas,
            'visitas_al_local': m.visitas_al_local,
            'publicaciones_realizadas': m.publicaciones_realizadas,
            'notas': m.notas,
        })
    return JsonResponse({'metricas': data})