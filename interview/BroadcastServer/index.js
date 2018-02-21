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
    while(mySocket.connected == false) {
        setTimeout(function () {
            console.log("Trying to connect.");
            mySocket = io_client.connect(MAIN_SERVER_ADDR);
        }, 300);
    }

    console.log("Connected.");
});

/******* FUNCTIONALITY **********/

function onSignal(message, destUserID, roomName, socket) {
    if (streamRooms[roomName].clients[destUserID]) {
        streamRooms[roomName].clients[destUserID].socket.emit('signal', message);
        // streamData(streamRooms);
    }
}

function onDisconnect(userID, roomName) {
    console.log(userID, "Disconnecting");

    if(streamRooms[roomName]) {
        let clientsInRoom = streamRooms[roomName].clients;
        // streamData(streamRooms);


        if (clientsInRoom.length === 1) {
            streamRooms[roomName] = null;
            delete streamRooms[roomName];
            // streamData(streamRooms);
            return;
        }

        else {
            // Remove Client from room
            delete streamRooms[roomName].clients[userID];
            // streamData(streamRooms);


            // Let everyone know
            for (clientID in clientsInRoom) {
                clientsInRoom[clientID].socket.emit('disconnect user', userID, roomName);
            }
        }
    }
}

function onJoin(userID, socket, roomName, isPublishing) {

    // IF it is a publisher, setup as the broadcaster;
    if (isPublishing === true) {

        // If Room Doesn't Exist
        if (!streamRooms[roomName]) {
            streamRooms[roomName] = {
                clients: {},
                numPublishers: 0
            }
            // streamData(streamRooms);
        }

        // If publisher already published inform the publisher of all subscribers
        else if (streamRooms[roomName].clients[userID].isPublished === true) {
            for (otherClientID in streamRooms[roomName].clients) {
                if (otherClientID !== userID) {
                    socket.emit('subscriber ready', otherClientID, streamRooms[roomName].clients[userID].publisherNumber)
                    // streamData(streamRooms);
                }
            }

            return;
        }

        // If publisher hasn't published yet
        else if (streamRooms[roomName].clients[userID].isPublished === false) {
            streamRooms[roomName].numPublishers++;

            streamRooms[roomName].clients[userID].isPublished = true;
            streamRooms[roomName].clients[userID].publisherNumber = streamRooms[roomName].numPublishers-1;
            // streamData(streamRooms);
        }

        // If the publisher is new
        else if (!streamRooms[roomName].clients[userID]) {
            streamRooms[roomName].numPublishers++;

            streamRooms[roomName].clients[userID] = {
                isPublished: true,
                isSubscribed: false,
                socket: socket,
                userID: userID,
                publisherNumber: streamRooms.numPublishers-1
            }

            // streamData(streamRooms);
        }

        for (otherClientID in streamRooms[roomName].clients) {
            if (otherClientID !== userID) {
                streamRooms[roomName].clients[otherClientID].socket.emit('publisher ready', userID, streamRooms[roomName].clients[userID].publisherNumber);
                socket.emit('subscriber ready', otherClientID, streamRooms[roomName].clients[userID].publisherNumber)
                // streamData(streamRooms);
            }
        }

        console.log("Streamer joined the session:", roomName);
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

            // streamData(streamRooms)
        }

        // If client is in the room, turn their subscribe on
        // If not add them in
        if (streamRooms[roomName].clients[userID]) {
            streamRooms[roomName].clients[userID].isSubscribed = true;
            streamData(streamRooms);
        } else {
            streamRooms[roomName].clients[userID] = {
                isPublished: false,
                isSubscribed: true,
                socket: socket,
                userID: userID,
                publisherNumber: -1
                // streamData(streamRooms);
        }
        }

        // Loop through all publishers and let them know a new;
        // subscriber has joined
        for (clientID in streamRooms[roomName].clients) {
            let client = streamRooms[roomName].clients[clientID];
            if (client.isPublished) {
                client.socket.emit('subscriber ready', userID, client.publisherNumber);
                socket.emit('publisher ready', clientID, client.publisherNumber);
                // // streamData(streamRooms);
            }
        }

    }
}
function streamData(streamRooms) {
    // Connect to database and saves streamrooms object
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        var myobj = { stream_Room: streamRooms};
        dbo.collection("stream").insertOne(myobj, function (err, res) {
            if (err) throw err;
            console.log("1 document inserted");
            db.close();
        });
    });
}

function queryData(streamRooms) {
    // Queries database for streamRoom
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        var query = {stream_Room: streamRooms};
        dbo.collection("stream").find(query).toArray(function (err, result) {
            if (err) throw err;
            console.log(result);
            db.close();
        });
    });
}