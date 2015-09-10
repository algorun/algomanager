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
var db = require('./DB.js');

var server_path = 'http://x.algorun.org:';
//var server_path = 'http://localhost:';

var docker = new Docker({socketPath: '/var/run/docker.sock'});

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data

var stop_after = 1 * 60 * 60 * 1000;   // the idle time after which to stop a running container in milliceconds

app.post('/api/v1/deploy', function (req, res) {
    var docker_image = req.body.image;
    var node_id = req.body.node_id;
    
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    // check to see if the node already has a running container
    db.getContainerInfo(node_id, function(result){
        if(result !== 'undefined'){
            res.status = 200;
            res.send({"status": 'success', "endpoint": server_path + result['Port']});
            return;
        } else {
            // node doesn't have a container running. get next port and initialize container.
            db.getNextPort(function(result){
                if(result !== 'undefined'){
                    // successfully reserved a port number
                    var container_port = result['PortNumber'];
                    docker.createContainer({Image: docker_image, Cmd: ['/bin/bash']}, function (err, container) {
                        var run_result = {};
                        if(err){
                            run_result['status'] = 'fail';
                            run_result['error_message'] = JSON.stringify(err);
                            
                            // return the port back to the pool
                            db.freePort(container_port, function(){});
                            
                            res.status = 500;
                            res.send(run_result);
                            return;
                        }
                        container.start(  {"PortBindings": {"8765/tcp": [{"HostPort": container_port.toString()}]}}, function (err, data) {
                            var run_result = {};
                            if(!err){
                                run_result['status'] = 'success';
                                run_result['endpoint'] = server_path + container_port;
                                
                                // save the container information number for future remove
                                db.insertRunningContainer(node_id, container.id, container_port, new Date(), function(result){
                                   if(result !== 'undefined'){
                                        res.status = 200;
                                        res.send(run_result);
                                        return;
                                   } else {
                                        res.status = 500;
                                        res.send({"status": 'fail', "error_message": 'cannot manage container'});
                                        return;
                                   } 
                                });
                                
                            } else {
                                run_result['status'] = 'fail';
                                run_result['error_message'] = JSON.stringify(err);
            
                                // return the port back to the pool
                                db.freePort(container_port, function(){});
                                
                                res.status = 500;
                                res.send(run_result);
                                return;
                            }
                        });
                    });
                } else {
                    res.status = 500;
                    res.send({"status": 'fail', "error_message": 'cannot reserve port for the container'});
                    return;
                }
            });
        }
    });
});

app.use(express.static(__dirname));

var server = app.listen(8764, function () {

    var host = server.address().address;
    var port = server.address().port;
    
    console.log('AlgoManager server listening at http://%s:%s ..', host, port);
    cleanup();
});
enableDestroy(server);

// definition for the garbage collector
// run every hour
var cron_expression = '0 0/5 * * * *';
var gc = new CronJob(cron_expression, function(){
    var now = new Date();
    // loop through running containers to stop the ones that have more than X hours being idle
    db.getAllRunningContainers(function(result){
        result.forEach(function(acontainer, index){
            (function(c, i){
                var endpoint = server_path + c["Port"] + "/v1/status";
                request(endpoint, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var continaer_status = JSON.parse(body);
                        var running_since;
                        if(continaer_status["last_used"] !== 'never') {
                            running_since = now - (new Date(continaer_status["last_used"]));
                            if(running_since >= stop_after){
                                // stop this container now and remove it from the running list
                                docker.getContainer(c["ContainerID"]).stop(function(error, response, body){});
                                console.log("container " + c["ContainerID"] + " stopped .. ");
                                // return the port back
                                db.removeRunningContainer(c["NodeID"], c["Port"], function(result){});
                            }
                        } else {
                            // the container is never used. check its creation time
                            created_since = now - (new Date(c["Created"]));
                            if(created_since >= stop_after){
                                // stop this container now and remove it from the running list
                                docker.getContainer(c["ContainerID"]).stop(function(error, response, body){});
                                console.log("container " + c["ContainerID"] + " stopped .. ");
                                // return the port back
                                db.removeRunningContainer(c["NodeID"], c["Port"], function(result){});
                            }
                        }
                    } else {
                        console.error("Error getting container " + c["ContainerID"] + " status!");
                    }
                });
            }(acontainer, index));
        });
    });
}, null, true, "America/New_York");

function cleanup(){
    // stop all running AlgoManager containers
    db.getAllRunningContainers(function(result){
        result.forEach(function(acontainer, index){
            (function(c, i){
                docker.getContainer(c["ContainerID"]).stop(function(error, response, body){});
                console.log("container " + c["ContainerID"] + " stopped .. ");
                db.removeRunningContainer(c["NodeID"], c["Port"], function(result){});
            }(acontainer, index));
        });
    });
}
// stop running containers on process exit
process.on('SIGINT', function () {
    cleanup();
    db.closeDB();
    gc.stop();
    server.destroy();
});
