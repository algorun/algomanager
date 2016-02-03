var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var Docker = require('dockerode');
var enableDestroy = require('./CloseServer.js');
var CronJob = require('cron').CronJob;
var request = require('request');
var nmap = require('libnmap');
var forever = require('forever');
fs = require('fs')

var opts = {range: ['localhost'], ports: '10000-60000'}; // allow docker containers to be run on this port range
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var server_path = 'http://localhost:';
var running_containers = [];
var available_images;

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

function cleanup(){
    // stop all running AlgoManager containers
        running_containers.forEach(function(acontainer, index){
            (function(c, i){
                docker.getContainer(c["container_id"]).stop(function(error, response, body){});
                console.log("container " + c["container_id"] + " stopped .. ");
            }(acontainer, index));
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
    
    fs.readFile('docker_images.json', 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        available_images = JSON.parse(data)["images"];
    });
    
    console.log('AlgoManager server listening at http://%s:%s ..', host, port);
});
enableDestroy(server);
forever.startServer(server);

app.get('/api/v1/list', function(req, res){
    res.status = 500;
    res.send({'images': available_images});
    return;
});

app.post('/api/v1/deploy', function(req, res){
    var docker_image = req.body.docker_image;
    var node_id = req.body.node_id;
    
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    // check to see if the docker_image is available on the server
    if(available_images.indexOf(docker_image.trim()) < 0){
        res.status = 500;
        res.send({"status": 'fail', "error_message": "the requested docker image is not available on this server. use GET /api/v1/list to get all available images."});
        return;
    }
    
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
                running_containers.push({'node_id': node_id, container_id: container.id, 'port': container_port, 'docker_image': docker_image, 'created': new Date()});
                res.status = 200;
                res.send({"status": 'success', "endpoint": server_path + container_port});
                return;
            });
        });
    });
});

// definition for the garbage collector
// run every minute
var cron_expression = '0 * * * * *';
var gc = new CronJob(cron_expression, function(){
    var now = new Date();
    var stop_after = 2 * 60 * 60 * 1000;   // the time after which to stop a running container in milliceconds (2 hours)
    
    // loop through running containers to stop the ones that have more than X hours being idle
    for(var i=0;i<running_containers.length;i++){
        var running_since = now - running_containers[i]['created'];
        if(running_since >= stop_after){
            docker.getContainer(running_containers[i]['container_id']).stop(function(error, response, body){});
            running_containers.splice(i--, 1); // remove it from the running containers
        }
    }
}, null, true, "America/New_York");

// stop running containers on process exit
process.on('SIGINT', function () {
    cleanup();
    gc.stop();
    server.destroy();
});