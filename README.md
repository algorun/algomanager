# AlgoManager
The API used to perform the underlying [AlgoRun](https://github.com/algorun/algorun) container management of [AlgoPiper](https://github.com/algorun/algopiper)

# Prerequisites
- [Docker](http://www.docker.com/)


# Download and Install
- Download this repository.
- Navigate to the downloaded folder. 
- Run `docker run -v $(pwd):/app -v /var/run/docker.sock:/run/docker.sock -p 8080:8000 -d --name algomanager algorun/algomanager`
- Go to [http://localhost:8080](http://localhost:8080) and make sure it is working

# Configuring Production Environment
If you want to set AlgoManager on a shared server, edit algomanager/settings.py file. Change `SERVER_PATH = 'http://localhost'` to `SERVER_PATH = 'http://server_IP'`

# Add Available Algorithms
Now, let AlgoManager be aware of what algorithms ([AlgoRun]((https://github.com/algorun/algorun)) containers) are available on your machine (or server).
- Run `docker exec -it algomanager bash`
- Run `python manage.py createsuperuser`. This will prompt you to create an admin user to manage the available algorithms on this algomanager instance.
- Now exit this bash using `exit`. Go to [http://localhost:8080/admin/](http://localhost:8080/admin/). Enter your newly created username and password. 
After you login, click on +Add, right beside *Available Algorithms*. Enter the name of the algorithm and its AlgoRun container.
For example: _Name=REACT_ and _Docker Image=algorun/react:latest_. Don't forget to `docker pull` those images from Docker Hub, before you make them available.

Congratulations! AlgoManager is fully functional on your machine/server.  

# API
If you are setting up AlgoManager to be used from AlgoPiper, no further steps are needed at this point.

If you plan to use AlgoManager for a different tool, you can read the API endpoints definitions below.

## HTTP GET /api/v1/list
Returns a JSON object showing available images on the server.
```
    {"images":[{"name":"my_name1","docker":"my_docker_image_1"},
               {"name":"my_name2","docker":"my_docker_image_2"}]}
```

## HTTP POST /api/v1/deploy
### Parameters
- **docker_image**: the name of the docker image to run
- **node_id**: the node id of node-red that is requesting the deploy
- **cpu_share**: (optional) an integer value as defined by the official docker run command option: [--cpu-shares](https://docs.docker.com/engine/reference/run/#/cpu-share-constraint) 
- **memory_limit**: (optional) a string value to limit the memory available for that container. Examples: '128m', '2g', '512k'

### Results
If the docker run is successfull, it returns JSON object in the following format:

```
{
    'status': 'success',
    'endpoint': <hostname:portnumber>
}
```

If the docker run is unsuccessfull, it returns JSON object in the following format:

```
{
    'status': 'fail',
    'error_message': <the-stderr-returned-by-docker-daemon>
}
```
