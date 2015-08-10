# api
The API used to perform the underlying container management of algopiper

## HTTP POST /run
### Parameters
- **image**: the name of the docker image to run

### Results
If the docker run is successfull, it returns JSON object in the following format:

```
{
'status': 'success',
'contianer_id': <the-container-id-returned-by-docker-daemon>,
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

## HTTP POST /stop
### Parameters
- **container_id**: the id of the container *that you previously received from the run endpoint*

### Results
If docker stop is successfull, it returns JSON object in the following format:

```
{
'status': 'success',
'contianer_id': <the-stopped-contianer-id-returned-by-docker-daemon>
}
```

If the docker stop is unsuccessfull, it returns JSON object in the following format:

```
{
'status': 'fail',
'error_message': <the-stderr-returned-by-docker-daemon>
}
```