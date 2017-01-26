# AlgoManager
The API used to perform the underlying [AlgoRun](https://github.com/algorun/algorun) container management of [AlgoPiper](https://github.com/algorun/algopiper)

# Prerequisites
- [Docker](http://www.docker.com/)


# Download and Install
- Clone this repository.
- Navigate to the downloaded directory and run the following command to install python dependencies:  `pip install -r requirements.txt`
- to be completed

|   Key  |                                                                                                                                                  Description                                                                                                                                                  |                                               Example                                              |
|:------:|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|:--------------------------------------------------------------------------------------------------:|
| server | The server URL that runs AlgoManager. Use http://localhost for local environments. Change it to server domain for production environments.                                                                                                                                                                    |                                          http://localhost                                          |
| images | A list of available algorithms packaged using AlgoRun in a dictionary format. A “name” value is the algorithm name that will appear of AlgoPiper interface. A “docker” value is algorithm docker image on the server. Note: all algorithms’ docker images must be existing on the server running AlgoManager. | [ {“name”: “BLASTN”, “docker”: “algorun/blastn”}, {“name”: “Bowtie”, “docker”: “algorun/bowtie”} ] |


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
