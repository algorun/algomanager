from django.http import HttpResponse
from django.shortcuts import render
from algorun import run_container
from models import RunningContainer, AvailableAlgorithms
import uuid
import json


def launch(request):
    docker_image = request.GET.get('docker_image', None)
    if 'visitor' in request.COOKIES:
        visitor = request.COOKIES['visitor']
    else:
        visitor = uuid.uuid4()

    # check to see if there is a running container for that user with the same docker image
    try:
        running_container = RunningContainer.objects.get(visitor_id=visitor, docker_image=docker_image)
    except RunningContainer.DoesNotExist:
        running_container = None

    if running_container:
        result = {'success': True, \
                  'response': running_container.port_number}
    else:
        result = run_container(docker_image, visitor)

    response = HttpResponse(json.dumps(result))
    response.set_cookie('visitor', visitor)

    return response


def list(self):
    images = []
    available_algorithms = AvailableAlgorithms.objects.all()
    for algorithm in available_algorithms:
        av_algo = {'name': algorithm.algorithm_name, \
                   'docker': algorithm.docker_image}
        images.append(av_algo)

    result = {'images': images}
    response = HttpResponse(json.dumps(result))

    return response