# AlgoManager
The API used to perform the underlying [AlgoRun](https://github.com/algorun/algorun) container management of [AlgoPiper](https://github.com/algorun/algopiper)

# Prerequisites
- [Docker](http://www.docker.com/)


# Download and Install
- Clone this repository.
- Run `docker run -v <absolute_path_to_this_repo/algomanager>:/app -v /var/run/docker.sock:/run/docker.sock -p 8080:8000 --rm -d algorun/algomanager`
- Go to http://localhost:8080 and make sure it is working

## Configuring Production Environment
If you want to set AlgoManager on a shared server, edit algomanager/settings.py file. Change `SERVER_PATH = 'http://localhost'` to `SERVER_PATH = 'http://server_IP'`

# API
## HTTP GET /api/v1/list
Returns a JSON object showing available images on the server to ask for deployment.
```
    {"images":[{"name":"my_name1","docker":"my_docker_image_1"},
               {"name":"my_name2","docker":"my_docker_image_2"}]}
```

## HTTP POST /api/v1/deploy
### Parameters
- **docker_image**: the name of the docker image to run
- **node_id**: the node id of node-red that is requesting the deploy

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
