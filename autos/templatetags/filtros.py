from django import template

register = template.Library()

@register.filter
def peso_ar(value):
    """Formatea número con puntos como separador de miles — estilo argentino"""
    try:
        return '{:,.0f}'.format(float(value)).replace(',', '.')
    except (ValueError, TypeError):
        return value

@register.filter  
def moneda_ar(value, moneda='ARS'):
    """Muestra precio con símbolo según moneda"""
    try:
        num = '{:,.0f}'.format(float(value)).replace(',', '.')
        if moneda == 'USD':
            return f'USD {num}'
        return f'$ {num}'
    except (ValueError, TypeError):
        return value