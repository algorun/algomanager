from __future__ import unicode_literals

from django.db import models
from django.utils import timezone
from datetime import timedelta


class RunningContainer(models.Model):
    node_id = models.CharField('Node ID', max_length=200)
    docker_image = models.CharField('Docker Image', max_length=200)
    container_id = models.CharField('Container ID', max_length=200)
    port_number = models.IntegerField('Port Number')
    started_at = models.DateTimeField(auto_now_add=True, blank=True)

    def __str__(self):
        return self.container_id

    def time_to_delete(self):
        elapsed_time = timezone.now() - self.started_at
        if elapsed_time.days >= 1:
            return True
        else:
            return False


class AvailableAlgorithms(models.Model):
    algorithm_name = models.CharField('Name', max_length=200)
    docker_image = models.CharField('Docker Image', max_length=200)

    def __str__(self):
        return self.docker_image