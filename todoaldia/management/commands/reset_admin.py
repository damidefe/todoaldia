from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Reset admin user password'

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@example.com'}
        )
        user.set_password('beto8001')
        user.is_staff = True
        user.is_superuser = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS('Admin user created'))
        else:
            self.stdout.write(self.style.SUCCESS('Admin password reset'))
