from django.contrib import admin

# Register your models here.

from .models import RunningContainer, AvailableAlgorithms

admin.site.register(RunningContainer)
admin.site.register(AvailableAlgorithms)