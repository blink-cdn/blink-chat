// const HTTPS_PORT = 4000;
// const MAIN_SERVER_ADDR = "http://localhost:3000";
// const STREAM_SERVER_ADDR = "https://localhost:4000";
const HTTPS_PORT = 443;
const MAIN_SERVER_ADDR = "http://devchat.blinkcdn.com:8080";
const STREAM_SERVER_ADDR = "https://devstream.blinkcdn.com";

const nodeStatic = require('node-static');
const https = require('https');
const socketIO = require('socket.io');
const fs = require('fs');
const os = require('os');

/******** OBJECTS ***********/

// Rooms
var streamRooms = {};

/************  SERVER SETUP *************/

const certOptions = {
  key: fs.readFileSync('certs/privkey.pem'),
  cert: fs.readFileSync('certs/fullchain.pem')
}

var fileServer = new(nodeStatic.Server)();
var app = https.createServer(certOptions, function(req, res) {
  fileServer.serve(req, res);
}).listen(HTTPS_PORT);

var io = socketIO.listen(app);
console.log("Connected.");

// combine isPublished/isSubscribed into user base

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

var io_client = require('socket.io-client');
var mySocket = io_client.connect(MAIN_SERVER_ADDR);
mySocket.emit('connect service', STREAM_SERVER_ADDR, "stream");

mySocket.on('sync', function(rcvdUsers, rcvdRooms) {
  users = rcvdUsers;
  rooms = rcvdRooms;
});

/******* FUNCTIONALITY **********/

function onSignal(message, destUserID, roomName, socket) {
  var signal = message;
  var room = streamRooms[roomName];

  if (streamRooms[roomName].clients[destUserID]) {
    streamRooms[roomName].clients[destUserID].socket.emit('signal', message);
  }
}

function onDisconnect(userID, roomName) {
  console.log(userID, "Disconnecting");

  if(streamRooms[roomName]) {
      var clientsInRoom = streamRooms[roomName].clients

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
    }

    // If publisher already published inform the publisher of all subscribers
    else if (streamRooms[roomName].clients[userID].isPublished === true) {
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
    }

    for (otherClientID in streamRooms[roomName].clients) {
      if (otherClientID !== userID) {
        streamRooms[roomName].clients[otherClientID].socket.emit('publisher ready', userID, streamRooms[roomName].clients[userID].publisherNumber);
        socket.emit('subscriber ready', otherClientID, streamRooms[roomName].clients[userID].publisherNumber)
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
      }
    }

    // If client is in the room, turn their subscribe on
    // If not add them in
    if (streamRooms[roomName].clients[userID]) {
      streamRooms[roomName].clients[userID].isSubscribed = true;
    } else {
      streamRooms[roomName].clients[userID] = {
        isPublished: false,
        isSubscribed: true,
        socket: socket,
        userID: userID,
        publisherNumber: -1
      }
    }

    // Loop through all publishers and let them know a new;
      // subscriber has joined
    for (clientID in streamRooms[roomName].clients) {
      var client = streamRooms[roomName].clients[clientID];
      if (client.isPublished) {
        client.socket.emit('subscriber ready', userID, client.publisherNumber);
        socket.emit('publisher ready', clientID, client.publisherNumber);
      }
    }

  }
}
