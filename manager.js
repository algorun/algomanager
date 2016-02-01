var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var Docker = require('dockerode');
var enableDestroy = require('./CloseServer.js');
var CronJob = require('cron').CronJob;
var request = require('request');
var nmap = require('libnmap');
var opts = {range: ['localhost'], ports: '10000-60000'}; // allow docker containers to be run on this port range
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var server_path = 'http://localhost:';
var running_containers = [];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function scanPorts(callback){
    var busy_ports = [];
    nmap.scan(opts, function(err, report) {
        if (err) {
            callback({status: "fail", error: err});
        }
        for (var item in report) {
	       var ports = report[item]['host'][0]['ports'][0]['port'];
	           ports.forEach(function(entry){
		          busy_ports.push(parseInt(entry['item']['portid']));
	           });
        }
        callback({status: "success", ports: busy_ports});
    });
}

function getRandomAvailablePort(callback){
    scanPorts(function(result){
        if(result['status'] === 'fail'){
            console.error(result['error'])
            callback(-1);
            return;
        }
        var available = result['ports'];
        var port = getRandomInt(10000, 60000);
        while(available.indexOf(port) >= 0){
            port = getRandomInt(10000, 60000);
        }
        callback(port);
    });    
}

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data
app.use(express.static(__dirname));

var server = app.listen(8764, function () {

    var host = server.address().address;
    var port = server.address().port;
    
    console.log('AlgoManager server listening at http://%s:%s ..', host, port);
});

app.post('/api/v1/deploy', function(req, res){
    var docker_image = req.body.docker_image;
    var node_id = req.body.node_id;
    
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    // check to see if the node already has a running container
    for(var i = 0; i<running_containers.length; i++){
        if(running_containers[i]['node_id'] === node_id && running_containers[i]['docker_image'] === docker_image){
            res.status = 200;
            res.send({"status": 'success', "endpoint": server_path + running_containers[i]['port']});
            return;    
        }
    }
    
    // node doesn't have a container running. get a random available port and initialize container.
    getRandomAvailablePort(function(container_port){
        if(container_port == -1){
            res.status = 500;
            res.send({"status": 'fail', "error_message": "failed to allocate port number"});
            return;
        }
        
        docker.createContainer({Image: docker_image, Cmd: ['/bin/bash']}, function (err, container) {
            if(err){
                res.status = 500;
                res.send({"status": 'fail', "error_message": JSON.stringify(err)});
                return;
            }
            container.start({"PortBindings": {"8765/tcp": [{"HostPort": container_port.toString()}]}}, function (err, data) {
                if(err){
                    res.status = 500;
                    res.send({"status": 'fail', "error_message": JSON.stringify(err)});
                    return;
                }
                
                // save running container info
                running_containers.push({'node_id': node_id, container_id: container.id, 'port': container_port, 'docker_image': docker_image, 'cteated': new Date()});
                res.status = 200;
                res.send({"status": 'success', "endpoint": server_path + container_port});
                return;
            });
        });
    });
});
enableDestroy(server);
function cleanup(){
    // stop all running AlgoManager containers
        running_containers.forEach(function(acontainer, index){
            (function(c, i){
                docker.getContainer(c["container_id"]).stop(function(error, response, body){});
                console.log("container " + c["container_id"] + " stopped .. ");
            }(acontainer, index));
        });
}
// stop running containers on process exit
process.on('SIGINT', function () {
    cleanup();
    server.destroy();
});