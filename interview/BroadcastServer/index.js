// const HTTPS_PORT = 4000;
// const MAIN_SERVER_ADDR = "http://localhost:3000";
// const STREAM_SERVER_ADDR = "https://localhost:4000";
const HTTPS_PORT = 443;
const MAIN_SERVER_ADDR = "http://devchat.blinkcdn.com:8080";
const STREAM_SERVER_ADDR = "https://devstream.blinkcdn.com";

const express = require('express');
const https = require('https');
const socketIO = require('socket.io');
const fs = require('fs');

/******** OBJECTS ***********/

// Rooms
let streamRooms = {};
setupMongoCollection();
retreiveStreamRoomData();

/************  SERVER SETUP *************/

const certOptions = {
    key: fs.readFileSync('certs/dev-key.pem'),
    cert: fs.readFileSync('certs/dev-cert.pem')
};

let app = express();
let httpsServer = https.Server(certOptions, app);
httpsServer.listen(HTTPS_PORT);
let io = socketIO.listen(httpsServer);

// let fileServer = new(nodeStatic.Server)();
// let app = https.createServer(certOptions, function(req, res) {
//     fileServer.serve(req, res);
// }).listen(HTTPS_PORT);
// let io = socketIO.listen(app);
console.log("Connected.");

io.sockets.on('connection', function(socket) {

    console.log("here");

    socket.on('signal', function(message, destUuid, roomName) {
        onSignal(message, destUuid, roomName, socket);
    });

    socket.on('disconnect client', function(userID, roomName) {
        onDisconnect(userID, roomName);
    });

    socket.on('publish', function(userID, roomName) {
        onJoin(userID, socket, roomName, true);
    });

    socket.on('subscribe', function(userID, roomName) {
        onJoin(userID, socket, roomName, false);
    });

});

/******* SETUP MAIN SERVER CONNECTION *********/

let io_client = require('socket.io-client');
let mySocket = io_client.connect(MAIN_SERVER_ADDR);
mySocket.emit('connect service', STREAM_SERVER_ADDR, "stream");

mySocket.on('sync', function(rcvdUsers, rcvdRooms) {
    users = rcvdUsers;
    rooms = rcvdRooms;
});

mySocket.on('disconnect', function() {
    // console.log("DISCONNECTED");
    // console.log(mySocket.connected);
    var tryToConnect = setInterval(function() {
        if (mySocket.connected) {
            clearInterval(tryToConnect);
            console.log("Connected.");
            mySocket.emit('connect service', STREAM_SERVER_ADDR, "stream");
        }
        console.log("Trying to connect.");
        mySocket = io_client.connect(MAIN_SERVER_ADDR);
    }, 300);
});

/******* FUNCTIONALITY **********/

function onSignal(message, destUserID, roomName, socket) {
    if (streamRooms[roomName].clients[destUserID]) {
        streamRooms[roomName].clients[destUserID].socket.emit('signal', message);
    }
}

function onDisconnect(userID, roomName) {
    console.log(userID, "Disconnecting");

    if(streamRooms[roomName]) {
        let clientsInRoom = streamRooms[roomName].clients;

        if (clientsInRoom.length === 1) {
            streamRooms[roomName] = null;
            delete streamRooms[roomName];
            return;
        }

        else {
            // Remove Client from room
            delete streamRooms[roomName].clients[userID];

            // Let everyone know
            for (clientID in clientsInRoom) {
                clientsInRoom[clientID].socket.emit('disconnect user', userID, roomName);
            }
        }
    }

    saveStreamRoomData(streamRooms);
}

function onJoin(userID, socket, roomName, isPublishing) {

    // IF it is a publisher, setup as the broadcaster;
    if (isPublishing === true) {

        // If Room Doesn't Exist
        if (!streamRooms[roomName]) {
            streamRooms[roomName] = {
                clients: {},
                numPublishers: 0
            };
        }

        // If the publisher is new
        if (!streamRooms[roomName].clients[userID] || streamRooms[roomName].clients[userID].socket === undefined) {
            streamRooms[roomName].numPublishers++;

            streamRooms[roomName].clients[userID] = {
                isPublished: true,
                isSubscribed: false,
                socket: socket,
                userID: userID,
                publisherNumber: streamRooms.numPublishers-1
            };
        }


        // If publisher already published inform the publisher of all subscribers
        if (streamRooms[roomName].clients[userID].isPublished === true) {
            for (otherClientID in streamRooms[roomName].clients) {
                if (otherClientID !== userID) {
                    socket.emit('subscriber ready', otherClientID, streamRooms[roomName].clients[userID].publisherNumber)
                }
            }
            return;
        }

        // If publisher hasn't published yet
        else if (streamRooms[roomName].clients[userID].isPublished === false) {
            streamRooms[roomName].numPublishers++;

            streamRooms[roomName].clients[userID].isPublished = true;
            streamRooms[roomName].clients[userID].publisherNumber = streamRooms[roomName].numPublishers-1;
        }

        for (otherClientID in streamRooms[roomName].clients) {
            if (otherClientID !== userID) {
                streamRooms[roomName].clients[otherClientID].socket.emit('publisher ready', userID, streamRooms[roomName].clients[userID].publisherNumber);
                socket.emit('subscriber ready', otherClientID, streamRooms[roomName].clients[userID].publisherNumber)
            }
        }

        console.log("Streamer joined the session:", roomName);
        saveStreamRoomData(streamRooms);
        return;
    }

    // If Subscribing
    else {

        // if the room doesn't exist, create the room
        if (!streamRooms[roomName]) {
            console.log("Client created room:", roomName);
            streamRooms[roomName] = {
                clients: {},
                numPublishers: 0
            };
        }

        // If client is in the room, turn their subscribe on
        // If not add them in and update their socket.
        if (streamRooms[roomName].clients[userID]) {
            streamRooms[roomName].clients[userID].isSubscribed = true;
            streamRooms[roomName].clients[userID].socket = socket;
        } else {
            streamRooms[roomName].clients[userID] = {
                isPublished: false,
                isSubscribed: true,
                socket: socket,
                userID: userID,
                publisherNumber: -1
            };
        }

        // Loop through all publishers and let them know a new;
        // subscriber has joined
        for (clientID in streamRooms[roomName].clients) {
            let client = streamRooms[roomName].clients[clientID];
            if (client.isPublished) {
                client.socket.emit('subscriber ready', userID, client.publisherNumber);
                socket.emit('publisher ready', clientID, client.publisherNumber);
            }
        }

        saveStreamRoomData(streamRooms)
    }
}

function saveStreamRoomData(room_data) {
    // Connect to database and saves streamrooms object
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";

    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.log("Connect Err:", err);
        }
        var dbo = db.db("mydb");
        var myobj = {stream_room: stringifyStreamRoom(room_data)};
        console.log(myobj);
        // dbo.collection("stream_rooms").insertOne(myobj, function (err, res) {
        //     if (err) {
        //         console.log("Insert Err:", err);
        //     } else {
        //         console.log("Stream rooms saved.");
        //     }
        //     db.close();
        // });
    });
}

function retreiveStreamRoomData() {
    // Queries database for streamRoom
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        var query = {stream_room: streamRooms};
        dbo.collection("stream").find(query).toArray(function (err, result) {
            if (err) throw err;
            console.log(result);
            db.close();
        });
    });
}

function setupMongoCollection() {
    // Setup Mongo
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.log("Connect Err:", err);
        }
        var dbo = db.db("mydb");
        dbo.createCollection("stream_rooms", function (err, res) {
            if (err) {
                console.log("Create Collection Error:", err);
            } else {
                console.log("Created collection");
            }
        });
    });
}

function stringifyStreamRoom(room_data) {
    var newStreamRoom = Object.assign({}, room_data);
    for (roomName in newStreamRoom) {
        for (clientID in newStreamRoom[roomName].clients) {
            newStreamRoom[roomName].clients[clientID].socket = undefined;
        }
    }

    return JSON.stringify(newStreamRoom);
}