from django.db import models

class Auto(models.Model):
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('reservado', 'Reservado'),
        ('vendido', 'Vendido'),
        ('lead', 'Lead'),
    ]
    MONEDA_CHOICES = [('ARS', 'Pesos $'), ('USD', 'Dólares USD')]


    # ── Campos existentes ──────────────────────────────────────
    modelo = models.CharField(max_length=100)
    marca = models.CharField(max_length=100)
    anio = models.IntegerField()
    km = models.IntegerField()
    version = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=50, blank=True)
    precio = models.DecimalField(max_digits=12, decimal_places=2)
    precio_compra = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    moneda = models.CharField(max_length=3, choices=[('ARS', 'Pesos'), ('USD', 'Dólares')], default='ARS')
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    detalles = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='disponible')
    fecha_ingreso = models.DateTimeField(auto_now_add=True)
    fecha_venta = models.DateTimeField(null=True, blank=True)
    nombre_dueno = models.CharField(max_length=200, blank=True)
    telefono_dueno = models.CharField(max_length=50, blank=True)
    detalles_adicionales = models.TextField(blank=True)
    moneda = models.CharField(max_length=3, choices=MONEDA_CHOICES, default='ARS')

    # ── Campos nuevos para Leads ───────────────────────────────
    # En qué columna del kanban está el lead.
    # Solo se usa cuando estado='lead'. Los otros estados lo ignoran.
    lead_estado = models.CharField(
        max_length=20,
        choices=[
            ('sin_contacto', 'Sin contacto'),
            ('contactado',   'Contactado sin visita'),
            ('visitado',     'Visitado — cerrando'),
        ],
        default='sin_contacto',
        blank=True,
    )

    # Temperatura: qué tan probable es cerrarlo.
    # Tu papá la setea manualmente. Da señal visual de prioridad.
    lead_temperatura = models.CharField(
        max_length=10,
        choices=[
            ('caliente', 'Caliente'),
            ('tibio',    'Tibio'),
            ('frio',     'Frío'),
        ],
        default='tibio',
        blank=True,
    )

    # De dónde vino el lead. Útil para analytics futuros.
    # Manual = cargado desde el CRM
    # Web = desde la web pública (futuro)
    # meta_ads = desde formulario de Instagram/Facebook (futuro)
    lead_origen = models.CharField(
        max_length=20,
        choices=[
            ('manual',    'Manual'),
            ('web',       'Web'),
            ('meta_ads',  'Meta Ads'),
        ],
        default='manual',
        blank=True,
    )

    # Precio que pide el dueño, separado del precio de venta.
    # Así podés ver la brecha: cuánto pide vs cuánto vale.
    lead_precio_pedido = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.marca} {self.modelo} {self.anio}"


class FotoAuto(models.Model):
    auto = models.ForeignKey(Auto, on_delete=models.CASCADE, related_name='fotos')
    imagen = models.ImageField(upload_to='autos/')
    es_principal = models.BooleanField(default=False)
    aprobada = models.BooleanField(default=False)
    analisis_ia = models.TextField(blank=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Foto de {self.auto} - {'Principal' if self.es_principal else 'Secundaria'}"


class DocumentoAuto(models.Model):
    TIPO_CHOICES = [
        ('titulo', 'Título del Vehículo'),
        ('libre_deuda', 'Libre de Deuda'),
        ('vtv', 'VTV'),
        ('seguro', 'Seguro'),
        ('otro', 'Otro'),
    ]

    auto = models.ForeignKey(Auto, on_delete=models.CASCADE, related_name='documentos')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    archivo = models.FileField(upload_to='documentos/')
    descripcion = models.CharField(max_length=200, blank=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.auto}"


class ContenidoGenerado(models.Model):
    auto = models.ForeignKey(Auto, on_delete=models.CASCADE, related_name='contenidos')
    copy_instagram = models.TextField(blank=True)
    copy_facebook = models.TextField(blank=True)
    texto_mercadolibre = models.TextField(blank=True)
    consejos = models.TextField(blank=True)
    tagline = models.CharField(max_length=200, blank=True)
    copy_informe = models.TextField(blank=True)
    copy_recepcion = models.TextField(blank=True)
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    copy_whatsapp = models.TextField(blank=True)

    def __str__(self):
        return f"Contenido de {self.auto}"


class GastoAuto(models.Model):
    TIPO_CHOICES = [
        ('fijo', 'A cargo de Todo @l Día'),
        ('variable', 'Gasto adicional'),
    ]

    CATEGORIA_FIJA_CHOICES = [
        ('limpieza', 'Limpieza del vehículo'),
        ('publicacion', 'Publicación de fotos'),
        ('cochera', 'Cochera / guardado'),
        ('fotos_profesionales', 'Fotos y videos / reels profesionales'),
        ('otro_fijo', 'Otro servicio incluido'),
        ('gestoria', 'Gestoría y tramitación de papeles sin vueltas'),
    ]

    auto = models.ForeignKey(Auto, on_delete=models.CASCADE, related_name='gastos')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='variable')
    categoria_fija = models.CharField(max_length=30, choices=CATEGORIA_FIJA_CHOICES, blank=True)
    descripcion = models.CharField(max_length=200)
    monto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fecha = models.DateField(auto_now_add=True)
    comprobante = models.ImageField(upload_to='comprobantes/', null=True, blank=True)
    bonificado = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.descripcion} — ${self.monto}"


class RecepcionAuto(models.Model):
    auto = models.OneToOneField(Auto, on_delete=models.CASCADE, related_name='recepcion')
    fecha = models.DateTimeField(auto_now_add=True)
    nombre_cliente = models.CharField(max_length=200, blank=True)
    telefono_cliente = models.CharField(max_length=50, blank=True)

    tiene_titulo = models.BooleanField(default=True)
    tiene_dni_titular = models.BooleanField(default=True)
    tiene_vtv = models.BooleanField(default=True)
    tiene_seguro = models.BooleanField(default=True)
    tiene_libre_deuda = models.BooleanField(default=True)
    tiene_service_history = models.BooleanField(default=True)
    tiene_llave_duplicado = models.BooleanField(default=True)
    tiene_manual = models.BooleanField(default=True)

    estado_carroceria = models.CharField(max_length=20, choices=[
        ('impecable', 'Impecable'),
        ('bueno', 'Bueno'),
        ('regular', 'Regular'),
        ('con_detalles', 'Con detalles'),
    ], default='bueno')
    detalles_carroceria = models.TextField(blank=True)

    tiene_gato = models.BooleanField(default=True)
    tiene_rueda_auxilio = models.BooleanField(default=True)
    tiene_balizas = models.BooleanField(default=True)
    tiene_08_firmado = models.BooleanField(default=True)
    tiene_verificacion_policial = models.BooleanField(default=True)
    tiene_grabado_autopartes = models.BooleanField(default=True)
    funciona_ac = models.BooleanField(default=True)
    funciona_calefaccion = models.BooleanField(default=True)
    funciona_vidrios = models.BooleanField(default=True)
    funciona_cierre_central = models.BooleanField(default=True)
    funciona_luces = models.BooleanField(default=True)
    kilometraje_ingreso = models.IntegerField(null=True, blank=True)
    combustible_ingreso = models.CharField(max_length=20, choices=[
        ('lleno', 'Lleno'),
        ('tres_cuartos', '3/4'),
        ('medio', '1/2'),
        ('cuarto', '1/4'),
        ('reserva', 'Reserva'),
    ], default='medio')

    observaciones = models.TextField(blank=True)
    firma_cliente = models.BooleanField(default=True)

    def __str__(self):
        return f"Recepción de {self.auto}"


class DocumentoRecepcion(models.Model):
    recepcion = models.ForeignKey(RecepcionAuto, on_delete=models.CASCADE, related_name='documentos')
    descripcion = models.CharField(max_length=200)
    archivo = models.FileField(upload_to='recepciones/')
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.descripcion} — {self.recepcion.auto}"


class Pedido(models.Model):
    descripcion = models.CharField(max_length=200)
    nombre_cliente = models.CharField(max_length=200, blank=True)
    telefono_cliente = models.CharField(max_length=50, blank=True)
    notas = models.TextField(blank=True)
    presupuesto = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    resuelto = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.descripcion} — {self.nombre_cliente or 'Anónimo'}"


# ══════════════════════════════════════════════════════════════
# MODELOS NUEVOS — Sistema de Leads
# ══════════════════════════════════════════════════════════════

class LeadComentario(models.Model):
    """
    Historial de un lead. Tiene dos tipos:
    - 'comentario': tu papá escribe algo manualmente ("bajó el precio", "viene el viernes")
    - 'cambio_estado': se crea automáticamente cuando arrastrás la tarjeta de columna

    Así tenés el timeline completo de cada lead sin hacer nada extra.
    """
    TIPO_CHOICES = [
        ('comentario',    'Comentario manual'),
        ('cambio_estado', 'Cambio de estado'),
        ('temperatura',   'Cambio de temperatura'),
    ]

    auto = models.ForeignKey(
        Auto,
        on_delete=models.CASCADE,
        related_name='lead_comentarios',
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='comentario')
    texto = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']  # el más reciente primero

    def __str__(self):
        return f"{self.auto} — {self.get_tipo_display()} — {self.fecha.strftime('%d/%m/%Y %H:%M')}"


class LeadRechazado(models.Model):
    """
    Se crea cuando rechazás un lead desde el kanban.
    NO borra el Auto — solo registra por qué no se cerró.

    Guarda suficiente info para el Dashboard BI futuro:
    - motivo: el motivo principal
    - detalle: texto libre si querés agregar más info
    - origen_lead: de dónde vino (manual/web/meta_ads)
    - dias_en_pipeline: cuántos días estuvo activo antes de rechazarlo
    - columna_rechazo: desde qué columna lo rechazaron
    - fecha_ingreso_lead: cuándo entró como lead (para cruzar con temporadas)
    """
    MOTIVO_CHOICES = [
        ('precio',         'Precio'),
        ('documentacion',  'Documentación'),
        ('danos',          'Daños'),
        ('otro',           'Otro'),
    ]

    # Relación con el auto. OneToOne porque un auto se rechaza una sola vez.
    # Si quisieran reabrir un lead en el futuro, habría que cambiar esto.
    auto = models.OneToOneField(
        Auto,
        on_delete=models.CASCADE,
        related_name='lead_rechazo',
    )

    motivo = models.CharField(max_length=20, choices=MOTIVO_CHOICES)
    detalle = models.TextField(blank=True)  # "pedía $15k, ofrecimos $11k"

    # Datos para analytics — se calculan automáticamente al rechazar
    origen_lead = models.CharField(max_length=20, blank=True)
    dias_en_pipeline = models.IntegerField(default=0)
    columna_rechazo = models.CharField(max_length=20, blank=True)
    fecha_ingreso_lead = models.DateTimeField(null=True, blank=True)

    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Rechazo: {self.auto} — {self.get_motivo_display()}"

class MetricasSemanal(models.Model):
    """Métricas semanales cargadas manualmente cada lunes."""
    fecha_inicio = models.DateField()  # lunes de esa semana
    fecha_fin = models.DateField()     # domingo de esa semana
    
    # Meta
    alcance = models.IntegerField(default=0, help_text="Personas alcanzadas")
    impresiones = models.IntegerField(default=0)
    interacciones = models.IntegerField(default=0)
    seguidores_nuevos = models.IntegerField(default=0)
    mejor_post = models.CharField(max_length=200, blank=True, help_text="Descripción del post que más funcionó")
    
    # Negocio
    consultas_recibidas = models.IntegerField(default=0, help_text="Consultas por WhatsApp/Instagram")
    visitas_al_local = models.IntegerField(default=0)
    publicaciones_realizadas = models.IntegerField(default=0)
    
    # Notas
    notas = models.TextField(blank=True)
    
    fecha_carga = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_inicio']

    def __str__(self):
        return f"Semana del {self.fecha_inicio} al {self.fecha_fin}"