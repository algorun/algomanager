import docker
from .models import RunningContainer
from django.shortcuts import get_object_or_404
import threading
from django.conf import settings
import random


def clean_containers():
    running_containers_list = RunningContainer.objects.all()
    for running_container in running_containers_list:
        if running_container.time_to_delete():
            remove_container(running_container.container_id)


def get_random_port():
    # this range contains dynamic or private ports that cannot be registered with IANA.[202] This range is used
    # for private, or customized services or temporary purposes and for automatic allocation of ephemeral ports.

    candidate_ports = range(49152, 65535)
    running_containers_list = RunningContainer.objects.all()
    for running_container in running_containers_list:
        candidate_ports.remove(running_container.port_number)

    random.shuffle(candidate_ports)
    return candidate_ports[0]


def remove_container(container_id):
    client = docker.from_env()
    try:
        client.containers.get(container_id).stop()
        client.containers.get(container_id).remove()

        running_container = get_object_or_404(RunningContainer, container_id=container_id)
        running_container.delete()

        response = {'success': True, \
                    'response': "Deleted Successfully"}
        return response
    except Exception as e:
        response = {'success': False, \
                    'response': e.message}
        return response


def run_container(docker_image, node_id, memory_limit='128m', cpu=0, pipeline_url=None, pipeline_name=None):
    client = docker.from_env()

    # clean containers that have been running for more than 24 hours
    thr = threading.Thread(target=clean_containers, args=(), kwargs={})
    thr.start()

    try:
        port = get_random_port()

        if docker_image == 'algorun/algopiper':
            algopiper_env = {'MANAGER': 'http://manager.algorun.org'}
            if pipeline_url is not None and pipeline_name is not None:
                algopiper_env['PIPELINE_URL'] = pipeline_url
                algopiper_env['PIPELINE_NAME'] = pipeline_name
            container = client.containers.run(str(docker_image), detach=True,ports={8765: port}, \
                                              environment=algopiper_env)
        else:
            container = client.containers.run(str(docker_image), detach=True,ports={8765: port}, \
                                              mem_limit=str(memory_limit), cpu_shares=int(cpu))

        new_container = RunningContainer(node_id=node_id, \
                                         docker_image=docker_image, \
                                         container_id=container.id, \
                                         port_number=port)
        new_container.save()

        server_path = getattr(settings, "SERVER_PATH", None)
        response = {'status': 'success', \
                    'endpoint': server_path + ':' + str(port)}
        return response
    except Exception as e:
        response = {'status': 'fail', \
                    'error_message': e.message}
        return response
