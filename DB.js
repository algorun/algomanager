var sqlite3 = require('sqlite3').verbose();

var db_name = 'algopiper-db';
var db = new sqlite3.Database(db_name, sqlite3.OPEN_READWRITE);

exports.getNextPort = function (callback){
    // get a free port from the db. mark it as reserved
    var get_port_query = 'SELECT * FROM AvailablePorts WHERE Status = ?';
    db.get(get_port_query, 'free', function(error, row){
        if(!error && row != undefined){
            // reserve this port
            reservePort(row, callback);
        } else {
            callback('undefined');
        }
    });
}

function reservePort(row, callback){
    var reserve_port_query = 'UPDATE AvailablePorts SET Status = ? WHERE PortNumber = ?';
    db.run(reserve_port_query, ['reserved', row['PortNumber']], function(error){
        if(!error){
            callback(row);
        } else {
            callback('undefined');
        }
    });
}

exports.insertRunningContainer = function (node_id, container_id, port_number, time_created, callback){
    // mark port number as busy
    var busy_port_query= 'UPDATE AvailablePorts SET Status = ? WHERE PortNumber = ?';
    db.run(busy_port_query, ['busy', port_number], function(error){
        if(!error){
            // insert the running container into table Containers
            var insert_container_query = 'INSERT INTO Containers VALUES (?, ?, ?, ?)';
            db.run(insert_container_query, [node_id, container_id, port_number, time_created], function(error){
                if(!error){
                    callback('success');
                } else{
                    callback('undefined');
                }
            });
        } else {
            callback('undefined');
        }
    });
    
}

exports.getContainerInfo = function (node_id, callback){
    // if the node_id exists, return container info. if not, return undefined
    var check_nodeid_query = 'SELECT * FROM Containers WHERE NodeID = ?';
    db.get(check_nodeid_query, node_id, function(error, row){
        if(!error && row != undefined){
            callback(row);
        } else {
            callback('undefined');
        }
    });
}

exports.getAllRunningContainers = function (callback){
    // return a list of all running containers.
    var all_containers_query = 'SELECT * FROM Containers';
    db.all(all_containers_query,[], function(error, rows){
        callback(rows);
    });
}

exports.removeRunningContainer = function (node_id, port_number, callback){
    // remove a running container from the database
    var remove_container_query = 'DELETE FROM Containers WHERE NodeID = ?';
    db.run(remove_container_query, node_id, function(error){
        if(!error){
            // set the port to free
            var free_port_query = 'UPDATE AvailablePorts SET Status = ? WHERE PortNumber = ?';
            db.run(free_port_query, ['free', port_number], function(error){
                if(!error){
                    callback('success');
                } else {
                    callback('fail');
                }
            });
        }
    });
}

exports.freePort = function (port_number, callback){
    var free_port_query = 'UPDATE AvailablePorts SET Status = ? WHERE PortNumber = ?';
    db.run(free_port_query, ['free', port_number], function(error){
        if(!error){
            callback('success');
        } else {
            callback('fail');
        }
    });
}

exports.closeDB = function (){
    db.close();
}