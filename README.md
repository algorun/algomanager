# api
The API used to perform the underlying container management of algopiper

## HTTP GET /api/v1/status

Use it to know the status of the AlgoManager

### Results
It returns the last time the api was called
```
{
'last_used': <timestamp>
}
```

### Optional Parameters
- **node_id**: the node id from node-red

### results
It returns the last time the api was called along with the endpoint (not found if the node_id is not found)
```
{
'last_used': <timestamp>,
'endpoint': <hostname:portnumber>
}
``` 

## HTTP POST /api/v1/deploy
### Parameters
- **image**: the name of the docker image to run
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
