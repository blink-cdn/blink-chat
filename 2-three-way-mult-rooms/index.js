const HTTPS_PORT = 3000;

/*******Start*********/

const os = require('os');
const nodeStatic = require('node-static');
const https = require('https');
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
var rooms = [];

/********************************/
/********** EVENTS **************/
/********************************/

io.sockets.on('connection', function(socket) {

      socket.on('here', function(uuid) {
        console.log("Here from: ", uuid);
        for (var i = 0; i < rooms[0].clients.length; i++) {
          rooms[0].clients[i].socket.emit('here', uuid);
          console.log("Send \'here\' to ", rooms[0].clients[i].socket.id);
        }
      })

      socket.on('signal', function(message, destUuid){
        onSignal(message, socket, destUuid);
      });

      socket.on('disconnection', function() {
        console.log(socket.id, ' disconnected!')
      })

      socket.on('join', function(uuid) {
        onJoin(uuid, socket);
      })
});


/********************************/
/******* FUNCTIONALITY **********/
/********************************/

function onSignal(message, socket, destUuid) {
  room = rooms[0];
  console.log("---");
  for (var i = 0; i < room.clients.length; i++) {
    if (room.clients[i].uuid == destUuid) {
      console.log("Sending", message.type, " from ", socket.id, " to ", room.clients[i].uuid)
      room.clients[i].socket.emit('signal', message, socket.id);
    };
  };
  //socket.broadcast.emit('signal', message, socket.id);
}

function onJoin(uuid, socket) {

  if (rooms.length <= 0) {
    //If there are no rooms, make a new room at index 0
    console.log(socket.id, " created new room!");
    rooms[0] = {
      clients: [{"uuid": uuid, "socket": socket}]
    }
  } else if (rooms.length > 0 && rooms[rooms.length] && rooms[rooms.length-1].clients.length === 2) {
    // If rooms exist, check if the most recently created room is full. If it is,
    // then create a new room.
    console.log(socket.id, " created new room!");
    rooms[rooms.length] = {
      clients: [{"uuid": uuid, "socket": socket}]
    }
  } else if (rooms.length > 0 && rooms[rooms.length-1] && rooms[rooms.length-1].clients.length === 1) {
    // If rooms exist, and the most recent room only has one client,
    // add this client to the room
    console.log("Rooms:", rooms.length, "Clients:", rooms[rooms.length-1].clients.length);
    clientsInThisRoom = rooms[rooms.length-1].clients
    clientsInThisRoom.push({'uuid': uuid, 'socket': socket});
    rooms[rooms.length-1].clients = clientsInThisRoom;

    // open the room and send idetifier to each
    var room_id = "hello";
    for (var i=0; i<2; i++) {
      clientsInThisRoom[i].socket.join(room_id);
    }

    clientsInThisRoom[0].socket.emit('ready', true, 2);
    clientsInThisRoom[1].socket.emit('ready', false, 2);
    console.log(socket.id, " joined the room!");

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
