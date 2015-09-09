# api
The API used to perform the underlying container management of algopiper

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
