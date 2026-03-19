from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('auto/nuevo/', views.nuevo_auto, name='nuevo_auto'),
    path('auto/<int:auto_id>/', views.detalle_auto, name='detalle_auto'),
    path('auto/<int:auto_id>/analizar/', views.analizar_fotos, name='analizar_fotos'),
    path('auto/<int:auto_id>/contenido/', views.generar_contenido, name='generar_contenido'),
    path('auto/<int:auto_id>/estado/', views.cambiar_estado, name='cambiar_estado'),
    path('auto/<int:auto_id>/pack/', views.generar_pack, name='generar_pack'),
    path('auto/<int:auto_id>/pack/ver/', views.ver_pack, name='ver_pack'),
    path('foto/<int:foto_id>/aprobar/', views.aprobar_foto, name='aprobar_foto'),
]