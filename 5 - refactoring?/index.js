const HTTPS_PORT = 443;

/*******Start*********/

const os = require('os');
const nodeStatic = require('node-static');
const https = require('https');
const http = require('http');
const socketIO = require('socket.io')
const fs = require('fs');

const certOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

// Create HTTP Server
var fileServer = new(nodeStatic.Server)();
var app = https.createServer(certOptions, function(req, res) {
  fileServer.serve(req, res);
}).listen(HTTPS_PORT);

// Add Socket.IO to server
var io = socketIO.listen(app);

// Rooms
var rooms = {
  "name": {}
};

/********************************/
/********** EVENTS **************/
/********************************/

io.sockets.on('connection', function(socket) {

      socket.on('here', function(uuid, roomName) {
        console.log("Here from: ", uuid);
        for (var i = 0; i < rooms[roomName].clients.length; i++) {
          rooms[roomName].clients[i].socket.emit('here', uuid);
          console.log("Send \'here\' to ", rooms[roomName].clients[i].socket.id);
        }
      })

      socket.on('signal', function(message, destUuid, roomName) {
        onSignal(message, socket, destUuid, roomName);
      });

      socket.on('disconnection', function() {
        console.log(socket.id, ' disconnected!')
      });

      socket.on('disconnectServer', function(uuid, roomName) {
        onDisconnect(uuid, roomName);
      });

      socket.on('join', function(uuid, roomName) {
        onJoin(uuid, socket, roomName);
      });
});


/********************************/
/******* FUNCTIONALITY **********/
/********************************/

function onSignal(message, socket, destUuid, roomName) {
  room = rooms[roomName];
  console.log("roomName:", roomName);
  for (var i = 0; i < room.clients.length; i++) {
    if (room.clients[i].uuid == destUuid) {
      console.log("Sending", message.type, " from ", socket.id, " to ", room.clients[i].uuid)
      room.clients[i].socket.emit('signal', message, socket.id);
    };
  };
  //socket.broadcast.emit('signal', message, socket.id);
}

function onDisconnect(uuid, roomName) {
    console.log(uuid, "Disconnecting"); 
    if(rooms[roomName]) {
        var clientsInRoom = rooms[roomName].clients
        console.log("0 ", clientsInRoom[0]);
        console.log("1", clientsInRoom[1]);
        for(var i = 0; i < clientsInRoom.length; i++) {
           console.log("i:", i);
           if (clientsInRoom[i].uuid == uuid) {
              // If this is the client, just remove them from the room
              clientsInRoom.splice(i, 1);
              rooms[roomName].clients = clientsInRoom;
           } else {
              // If this isn't the client, let them know the other client is leaving
              clientsInRoom[i].socket.emit('disconnectClient', uuid, roomName);
              console.log("Sent disconnect")
           }
        }
     }
}

function onJoin(uuid, socket, roomName) {

   if (!rooms[roomName]) {
    //If the room does not exist, create it
    console.log(socket.id, " created new room with id:", roomName);
    rooms[roomName] = {
      clients: [{"uuid": uuid, "socket": socket}]
    }
  } else if (rooms[roomName].clients.length === 1) {
    // If rooms exist, and the most recent room only has one client,
    // add this client to the room
    clientsInThisRoom = rooms[roomName].clients
    clientsInThisRoom.push({'uuid': uuid, 'socket': socket});
    rooms[roomName].clients = clientsInThisRoom;

    // open the room and send idetifier to each
    // for (var i=0; i<2; i++) {
    //   clientsInThisRoom[i].socket.join(roomName);
    // }

    clientsInThisRoom[0].socket.emit('ready', true, 2);
    clientsInThisRoom[1].socket.emit('ready', false, 2);
    console.log(socket.id, " joined the room ", roomName);

  } /*else if (rooms.length > 0 && rooms[rooms.length - 1] && rooms[rooms.length-1].clients.length === 2) {
    clientsInThisRoom = rooms[rooms.length-1].clients
    clientsInThisRoom.push({'uuid': uuid, 'socket': socket});
    rooms[rooms.length-1].clients = clientsInThisRoom;

    // open the room and send idetifier to each
    var room_id = "hello2";
    for (var i=0; i<3; i++) {
      clientsInThisRoom[i].socket.join(room_id);
    }

    clientsInThisRoom[0].socket.emit('ready', true, 3);
    clientsInThisRoom[1].socket.emit('ready', false, 3);
    clientsInThisRoom[2].socket.emit('ready', false, 3);
    console.log(socket.id, " joined the room now!");
  }*/
}

function log() {
  var array = ['Message from server:'];
  array.push.apply(array, arguments);
  socket.emit('log', array);
}
