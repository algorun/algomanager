var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var exec = require("child_process").exec;

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

app.post('/run', function (req, res) {
    var docker_image = req.body.image;
    var container_port = available_ports.shift();
    var run_command = 'docker run -d -p ' + container_port + ':8765 ' + docker_image;
    exec(run_command, function (err, stdout, stderr) {
        var run_result = {};
        if (!err){
            run_result['status'] = 'success';
            run_result['container_id'] = stdout.trim();
            run_result['endpoint'] = 'http://localhost:' + container_port;
            
            // save the container port number for future remove
            running_containers[stdout.trim()] = container_port;
            
            res.status = 200;
            res.send(run_result);
        } else {
            run_result['status'] = 'fail';
            run_result['error_message'] = stderr.trim();
            
            // return the port back to the pool
            available_ports.push(container_port);
            
            res.status = 200;
            res.send(run_result);
        }
    });
});

app.post('/stop', function (req, res) {
    var container_id = req.body.container_id;
    var stop_command = 'docker stop ' + container_id;
    exec(stop_command, function (err, stdout, stderr) {
        var stop_result = {};
        if (!err){
            stop_result['status'] = 'success';
            stop_result['container_id'] = stdout.trim();
            
            // return the port back to the pool
            available_ports.push(running_containers[container_id]);
            delete running_containers[container_id];
            
            res.status = 200;
            res.send(stop_result);
        } else {
            stop_result['status'] = 'fail';
            stop_result['error_message'] = stderr.trim();
            
            res.status = 200;
            res.send(stop_result);
        }
    });
});

app.use(express.static(__dirname));

var server = app.listen(8764, function () {

  host = server.address().address;
  port = server.address().port;

  console.log('API server listening at http://%s:%s ..', host, port);

});
