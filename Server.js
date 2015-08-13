/* Need to install Express npm install express */
/* Need to install body-parser npm install body-parser */
/* Need to install multer npm install multer */
/* Need to install Dockerode npm install dockerode */
var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});

var host = '';
var port = '';

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data

var available_ports = [];
var start_port = 49152;
var end_port = 65535;
for(var i = start_port; i<= end_port; i++) {
    available_ports.push(i);
}
var running_containers = {};
var last_used = 'never';

app.get('/api/v1/status', function (req, res) {
    res.status = 200;
    res.send({"last_used": last_used});
});

app.post('/api/v1/deploy', function (req, res) {
    last_used = new Date();
    var docker_image = req.body.image;
    var container_port = available_ports.shift();
    docker.createContainer({Image: docker_image, Cmd: ['/bin/bash']}, function (err, container) {
        container.start(  {"PortBindings": {"8765/tcp": [{"HostPort": container_port.toString()}]}}, function (err, data) {
            var run_result = {};
            if(!err){
                run_result['status'] = 'success';
                run_result['endpoint'] = 'http://localhost:' + container_port;
            
                // save the container port number for future remove
                running_containers[container.id] = container_port;
                
                res.status = 200;
                res.send(run_result);
            } else {
                run_result['status'] = 'fail';
                run_result['error_message'] = err;
            
                // return the port back to the pool
                available_ports.push(container_port);
                
                res.status = 200;
                res.send(run_result);
            }
        });
    });
});

process.on('SIGINT', function () {
    // stop all running AlgoManager containers
    if(running_containers){
        for (var key in running_containers) {
            if (running_containers.hasOwnProperty(key)) {
                docker.getContainer(key).stop(function(){});
                console.log("container " + key + " stopped .. ");
            }
        }
    }
    server.close();
});

app.use(express.static(__dirname));

var server = app.listen(8764, function () {

  host = server.address().address;
  port = server.address().port;

  console.log('AlgoManager server listening at http://%s:%s ..', host, port);

});
