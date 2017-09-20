const HTTPS_PORT = 3000;
const HTTP_PORT = 3001;

/******* Imports *********/

const os = require('os');
const nodeStatic = require('node-static');
const https = require('https');
const socketIO = require('socket.io')
const fs = require('fs');
const webrtc = require('wrtc');

var RTCPeerConnection     = webrtc.RTCPeerConnection;
var RTCSessionDescription = webrtc.RTCSessionDescription;
var RTCIceCandidate       = webrtc.RTCIceCandidate;

/******* HTTP SERVER *********/

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

/******* VARIABLES *********/

// STUN/TURN Config Options
const configOptions = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
		      {"url": "turn:35.167.210.171:3478",
				"username": "cbethin",
				"credential": "bethin"}]
      };

// Rooms
var rooms = {
  "name": [{
    "uuid": 0000,
    "socket": "thisSocket"
  }]
};

// MCU needed stuff
var uuid = 0101010101;
var peer1uuid = 0001010;
var sendToPeerValue = -1;

/********************************/
/********** EVENTS **************/
/********************************/

// every socket is a client
io.sockets.on('connection', function(socket) {
    console.log("Connected.");

    socket.on('hello', function(roomName, uuid) {
      joinRoom(roomName, uuid, socket);
    })

    socket.on('disconnection', function() {
      console.log(socket.id, ' disconnected!')
    });

    socket.on('log', function(message) {
      console.log("Log: ", message);
    })

    socket.on('signal', function(message, myUuid, roomName) {
      gotMessageFromClient(message, socket, roomName);
    })
});


/********************************/
/******* FUNCTIONALITY **********/
/********************************/


// Joins a client to a room
function joinRoom(roomName, clientUuid, socket) {

  var thisRoom = getRoom(roomName);
  var newPeerConnection = createPeerConnection(roomName, clientUuid, socket);
  var peer = {
    uuid: clientUuid,
    socket: socket,
    peerConnection: newPeerConnection
  }
  thisRoom.push(peer);
  rooms[roomName] = thisRoom;

  socket.emit('here', uuid);
  //sendOffer(peer, socket, roomName);
}



// Respond to messages from a client
function gotMessageFromClient(message, socket, roomName) {
  var signal = JSON.parse(message);
  var clientUuid = signal.uuid;

  // Ignore messages from ourself
  if(clientUuid == uuid) {
    console.log("Received from self");
    return;
  };

  var peer = getPeer(clientUuid, roomName);
  console.log("Looking through message...");

  // Respond accordingly
  if(signal.type == "sdp") {
      peer.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
          // Only create answers in response to offers
          if(signal.sdp.type == 'offer') {
              console.log("Got offer")
              peer.peerConnection.createAnswer().then(function(description) {
                peer.peerConnection.setLocalDescription(description).then(function() {
                    socket.emit('signal', JSON.stringify({'type': 'sdp', 'sdp': peer.peerConnection.localDescription, 'uuid': uuid}), peer.uuid, roomName);
                    //serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
                }).catch(errorHandler);
              }).catch(errorHandler);
          } else {
            console.log("Got answer")
          }
      }).catch(errorHandler);
  } else if(signal.type == "ice") {
      peer.peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
      console.log("Signal Ice:", signal.ice);
  }
}


// Send an RTC offer to a client
function sendOffer(peer, socket, roomName) {

  peer.peerConnection.createOffer().then(function(description) {
    peer.peerConnection.setLocalDescription(description).then(function() { // setAndSendDescription
        socket.emit('signal', JSON.stringify({'type': 'sdp', 'sdp': peer.peerConnection.localDescription, 'uuid': uuid}), peer.uuid, roomName);
        //serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
  }).catch(errorHandler);

  console.log("Sent offer");
}



/**************************/
/********* HELPERS ********/
/**************************/

// Create peer connection 1
function createPeerConnection(roomName, clientUuid, socket) {
  console.log("Creating Peer Connection");

  var newPeerConnection;
  newPeerConnection = new RTCPeerConnection(configOptions);
  newPeerConnection.onicecandidate = function(event) {
    if(event.candidate != null) {
        socket.emit('signal', JSON.stringify({'type': 'ice', 'ice': event.candidate, 'uuid': uuid}), clientUuid, roomName);
    }
  };

  newPeerConnection.onaddstream = function(event) {
    console.log('Received remote stream:', event.stream);
    console.log(window.URL.createObjectURL(event.stream));
  };

  return newPeerConnection;
}


// Returns the desired room, and creates it if necessary
function getRoom(roomName) {
  var thisRoom = [];

  if (!rooms[roomName]) {
    rooms[roomName] = thisRoom;
  } else {
    thisRoom = rooms[roomName];
  }

  return thisRoom;
}

// Retreive a peer from a room given the roomName and uuid of peer
function getPeer(uuid, roomName) {

  if (rooms[roomName]) {
    for (var i=0; i < rooms[roomName].length; i++) {
      if (rooms[roomName][i].uuid == uuid) {
        return rooms[roomName][i];
      }
    }
  }

  return "not found";
}


// Others
function log() {
  var array = ['Message from server:'];
  array.push.apply(array, arguments);
  socket.emit('log', array);
}

function errorHandler(error) {
    console.log(error);
}
