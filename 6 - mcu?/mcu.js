
const HTTPS_PORT = 4000;
/****************************/
/******  WebRTC Stuff *******/
/****************************/

const webrtc = require('wrtc');
const nodeStatic = require('node-static');
const http = require('http');
const fs = require('fs');
const io_client = require('socket.io-client');
const socketIO = require('socket.io');

// Create HTTP Server
var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(HTTPS_PORT);

// Add Socket.IO to server
var io = socketIO.listen(app);
var serverConn = io_client.connect('http://localhost:3001');
serverConn.emit('log', 'helloAdele4ever');


io.sockets.on('connection', function(socket) {

  socket.on('join', function(uuid, roomName) {
    console.log("got join");
  //   if (!rooms[roomName]) {
  //    //If the room does not exist, create it
  //    console.log(socket.id, " created new room with id:", roomName);
  //    rooms[roomName] = {
  //      clients: [{"uuid": uuid}]
  //    }
  //  } else if (rooms[roomName].clients.length === 1) {
  //    // If rooms exist, and the most recent room only has one client,
  //    // add this client to the room
  //    clientsInThisRoom = rooms[roomName].clients
  //    clientsInThisRoom.push({'uuid': uuid});
  //    rooms[roomName].clients = clientsInThisRoom;
   //
  //    serverConn.emit('signal', JSON.stringify({'type': 'added to room'}, uuid));
  //  }
  });

  socket.on('signal', function(message) {
    console.log("Message received");
    gotMessageFromServer(message);
  });

});



function gotMessageFromServer(message) {
    var signal = JSON.parse(message);

    // Ignore messages from ourself
    if(signal.uuid == uuid) return;

    if (signal.type == "added to room") {
      console.log("MCU Ready");
      createPeerConnection();
      startCall();
    }

    if (signal.type == "sdp") {
      if (signal.sdp.type == "offer") {
        console.log("Got offer");
      }
    }

    if(signal.type == "sdp") {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                console.log("Got offer")
                peerConnection.createAnswer().then(setAndSendDescription).catch(errorHandler);
            } else {
              console.log("Got answer")
            }
        }).catch(errorHandler);
    } else if(signal.type == "ice") {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
}
