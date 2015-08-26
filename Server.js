/* Need to install Express npm install express */
/* Need to install body-parser npm install body-parser */
/* Need to install multer npm install multer */
/* Need to install Dockerode npm install dockerode */
var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var Docker = require('dockerode');
var enableDestroy = require('./CloseServer.js');
var CronJob = require('cron').CronJob;
var request = require('request');

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
var running_containers = [];
var stop_after = 8*60*60*1000;   // the idle time after which to stop a running container

app.get('/api/v1/status', function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    if(req.query.node_id){
        for(var i = 0; i<running_containers.length; i++){
            if(running_containers[i]['node_id'] === req.query.node_id){
                res.status = 200;
                res.send({"endpoint": 'http://x.algorun.org:' + running_containers[i]['container_port']});
                return;
            }
        }
        if(i == running_containers.length){
            res.status = 404;
            res.send({"endpoint": 'not found'});
            return;
        }
        
    } else {
        res.status = 200;
        res.send();
        return;
    }
});

app.post('/api/v1/deploy', function (req, res) {
    var docker_image = req.body.image;
    var node_id = req.body.node_id;
    for(var i = 0; i<running_containers.length; i++){
        if(running_containers[i]['node_id'] === node_id){
            res.status = 200;
            res.send({"status": 'success', "endpoint": 'http://x.algorun.org:' + running_containers[i]['container_port']});
            return;
        }
    }
    var container_port = available_ports.shift();
    docker.createContainer({Image: docker_image, Cmd: ['/bin/bash']}, function (err, container) {
        var run_result = {};
        if(err){
            run_result['status'] = 'fail';
            run_result['error_message'] = err;
            
            // return the port back to the pool
            available_ports.push(container_port);
            res.header("Access-Control-Allow-Origin", "*");
		    res.header("Access-Control-Allow-Headers", "X-Requested-With");                
            res.status = 200;
            res.send(run_result);
            return;
        }
        container.start(  {"PortBindings": {"8765/tcp": [{"HostPort": container_port.toString()}]}}, function (err, data) {
            var run_result = {};
            if(!err){
                run_result['status'] = 'success';
                run_result['endpoint'] = 'http://x.algorun.org:' + container_port;
            
                // save the container information number for future remove
                var new_container = { 'container_id': container.id,
                                     'container_port': container_port,
                                     'node_id': node_id,
                                     'time_created': new Date()};
                running_containers.push(new_container);

                res.header("Access-Control-Allow-Origin", "*");
		        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                res.status = 200;
                res.send(run_result);
                return;
            } else {
                run_result['status'] = 'fail';
                run_result['error_message'] = err;
            
                // return the port back to the pool
                available_ports.push(container_port);

                res.header("Access-Control-Allow-Origin", "*");
		        res.header("Access-Control-Allow-Headers", "X-Requested-With");                
                res.status = 200;
                res.send(run_result);
                return;
            }
        });
    });
});

process.on('SIGINT', function () {
    // stop all running AlgoManager containers
    if(running_containers.length !== 0){
        for(var i = 0; i<running_containers.length; i++){
            docker.getContainer(running_containers[i]["container_id"]).stop(function(){});
            console.log("container " + running_containers[i]["container_id"] + " stopped .. ");
        }
    }
    gc.stop();
    server.destroy();
});

app.use(express.static(__dirname));

var server = app.listen(8764, function () {

  host = server.address().address;
  port = server.address().port;

  console.log('AlgoManager server listening at http://%s:%s ..', host, port);

});
enableDestroy(server);

// definition for the garbage collector
// run every hour
var cron_expression = '0 0 * * * *';
var gc = new CronJob(cron_expression, function(){
    var now = new Date();
    // loop through running containers to stop the ones that have more than X hours being idle
    console.log(running_containers);
    if(running_containers.length !== 0){
        running_containers.forEach(function(acontainer, index){
            (function(c, i){
                var endpoint = "http://x.algorun.org:" + c["container_port"] + "/v1/status";
                request(endpoint, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var continaer_status = JSON.parse(body);
                        var running_since;
                        if(continaer_status["last_used"] !== 'never') {
                            running_since = now - (new Date(continaer_status["last_used"]));
                            if(running_since >= stop_after){
                                // stop this container now and remove it from the running list
                                docker.getContainer(c["container_id"]).stop(function(error, response, body){});
                                console.log("container " + c["container_id"] + " stopped .. ");
                                // return the port back
                                available_ports.push(c["container_port"]);
                                // remove it from running containers
                                var index_to_remove = running_containers.indexOf(c);
                                running_containers.splice(index_to_remove, 1);
                            }
                        } else {
                            // the container is never used. check its creation time
                            created_since = now - (new Date(c["time_created"]));
                            if(created_since >= stop_after){
                                // stop this container now and remove it from the running list
                                docker.getContainer(c["container_id"]).stop(function(error, response, body){});
                                console.log("container " + c["container_id"] + " stopped .. ");
                                // return the port back
                                available_ports.push(c["container_port"]);
                                // remove it from running containers
                                var index_to_remove = running_containers.indexOf(c);
                                running_containers.splice(index_to_remove, 1);
                            }
                        }
                    } else {
                        console.error("Error getting container " + running_containers[i]["container_id"] + " status!");
                    }
                });
            }(acontainer, index));
        });
    }
}, null, true, "America/New_York");