from django.apps import AppConfig


class MissingPetsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app.missing_pets'
    label = 'missing_pets'