from django.http import HttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect
from django.conf import settings
from algorun import run_container
from models import RunningContainer, AvailableAlgorithms
import json


def home(request):
    return render(request, 'api_v1/index.html')


@require_http_methods(["POST"])
@csrf_exempt
def deploy(request):
    docker_image = request.POST.get('docker_image', None)
    node_id = request.POST.get('node_id', None)
    memory_limit = request.POST.get('memory_limit', '128m')
    cpu_share = request.POST.get('cpu_share', 0)

    if docker_image is None or node_id is None:
        result = { 'status': 'fail', 'error_message': 'missing parameter values!'}
        response = HttpResponse(json.dumps(result))
        return response

    try:
        running_container = RunningContainer.objects.get(node_id=node_id, docker_image=docker_image)
    except RunningContainer.DoesNotExist:
        running_container = None

    if running_container:
        server_path = getattr(settings, "SERVER_PATH", None)
        result = {'status': 'success', \
                  'endpoint': server_path + ':' + str(running_container.port_number)}
    else:
        result = run_container(docker_image, node_id, memory_limit, cpu_share)

    print result
    response = HttpResponse(json.dumps(result))

    return response


@require_http_methods(["GET"])
@csrf_exempt
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