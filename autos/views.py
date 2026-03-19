from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import Auto, FotoAuto, DocumentoAuto, ContenidoGenerado

import anthropic
import os
import json
import base64

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def index(request):
    autos = Auto.objects.all().order_by('-fecha_ingreso')
    context = {
        'autos': autos,
        'autos_disponibles': autos.filter(estado='disponible').count(),
        'autos_reservados': autos.filter(estado='reservado').count(),
        'autos_vendidos': autos.filter(estado='vendido').count(),
    }
    return render(request, 'autos/index.html', context)

def nuevo_auto(request):
    if request.method == 'POST':
        auto = Auto.objects.create(
            marca=request.POST.get('marca'),
            modelo=request.POST.get('modelo'),
            anio=int(request.POST.get('anio')),
            km=int(request.POST.get('km')),
            version=request.POST.get('version', ''),
            color=request.POST.get('color', ''),
            precio=float(request.POST.get('precio')),
            detalles=request.POST.get('detalles', ''),
        )
        fotos = request.FILES.getlist('fotos')
        for foto in fotos:
            FotoAuto.objects.create(auto=auto, imagen=foto)
        return redirect(f'/auto/{auto.id}/')
    return render(request, 'autos/nuevo.html')

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
                            "text": """Analizás fotos de autos/motos para publicaciones en Instagram y Mercado Libre de un negocio familiar llamado 'Todo @l Día' de Caballito, Buenos Aires.

Analizá esta foto y respondé SOLO con este JSON exacto sin texto extra:
{
    "puntuacion": 8,
    "iluminacion": "buena/regular/mala",
    "angulo": "lateral derecho/frontal/trasero/etc",
    "vehiculo_completo": true,
    "cortado_donde": "ninguno/adelante/atras/arriba/abajo",
    "fondo": "limpio/regular/malo",
    "comentario_positivo": "lo que está bien de esta foto",
    "comentario_negativo": "lo que está mal o se podría mejorar",
    "mensaje_papa": "consejo directo y simple para mejorar la foto la próxima vez",
    "apta_publicacion": true
}

REGLAS:
- Si el vehículo está cortado en cualquier parte apta_publicacion debe ser false
- Si la iluminación es mala apta_publicacion debe ser false  
- Si el fondo es muy malo (ropa, objetos, desorden) bajar la puntuación
- puntuacion va de 1 a 10
- mensaje_papa debe ser simple y directo, como si le hablaras a alguien que no sabe de fotos"""
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

    prompt = f"""Sos el community manager de 'Todo @l Día', negocio familiar de venta de autos con 26 años en Caballito, Buenos Aires.

MARCA: Rojo, Negro, Blanco. Profesional, confiable, cercano. Familia atendiendo familias.
VALORES: Papeles 100% al día, autos impecables, gestión sin estrés.
SERVICIOS: Venta por comisión, permutas autos/motos, créditos con DNI.

AUTO:
- {auto.marca} {auto.modelo} {auto.anio}
- {auto.km:,} km · {auto.version} · {auto.color}
- Precio: ${auto.precio:,.0f}
- Detalles: {auto.detalles}

Respondé SOLO con este JSON sin texto extra:
{{
    "copy_instagram_1": "copy con emojis y hashtags, tono cercano",
    "copy_instagram_2": "copy más corto y directo",
    "copy_instagram_3": "copy enfocado en financiación y permutas",
    "texto_mercadolibre": "descripción optimizada sin emojis",
    "titulo_placa": "TÍTULO EN MAYÚSCULAS PARA LA PLACA",
    "puntos_placa": ["Año y km", "Estado del auto", "Financiación disponible"],
    "consejos": "consejo breve sobre fotos o publicación"
}}"""

    try:
        respuesta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1500,
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
        }
    )

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

    # Generar texto con IA para las placas
    prompt = f"""Sos el community manager de 'Todo @l Día', autos en Caballito, Buenos Aires.
    
AUTO: {auto.marca} {auto.modelo} {auto.anio} - {auto.km:,} km - ${auto.precio:,.0f}
DETALLES: {auto.detalles}

Respondé SOLO con este JSON:
{{
    "titulo_story": "TÍTULO CORTO EN MAYÚSCULAS MÁXIMO 4 PALABRAS",
    "subtitulo_story": "subtítulo atractivo máximo 6 palabras",
    "precio_formateado": "${auto.precio:,.0f}",
    "badge": "NUEVO INGRESO",
    "punto1": "dato clave 1",
    "punto2": "dato clave 2", 
    "punto3": "dato clave 3"
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