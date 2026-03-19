from django.db import models

class Auto(models.Model):
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('reservado', 'Reservado'),
        ('vendido', 'Vendido'),
    ]

    modelo = models.CharField(max_length=100)
    marca = models.CharField(max_length=100)
    anio = models.IntegerField()
    km = models.IntegerField()
    version = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=50, blank=True)
    precio = models.DecimalField(max_digits=12, decimal_places=2)
    detalles = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='disponible')
    fecha_ingreso = models.DateTimeField(auto_now_add=True)
    fecha_venta = models.DateTimeField(null=True, blank=True)

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
    fecha_generacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Contenido de {self.auto}"