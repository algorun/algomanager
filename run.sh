docker stop algomanager
docker rm algomanager
docker run -v $(pwd):/app -v /var/run/docker.sock:/run/docker.sock -p 8000:8764 -d --name algomanager algorun/algomanager
