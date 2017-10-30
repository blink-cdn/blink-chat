// HTML Objects
var localVideoObject;
var remoteVideoObjects = [];
var broadcastButton;
var hangupButton;

// Variables
var roomName;
var localStreams = {
  0: null,
  1: null,
  2: null
};
var peers = [{
  "uuid": {}
}]; // for holding peer objects
var sendToPeerValue = -1;



var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

const configOptions = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
              { url: 'turn:turn:numb.viagenie.ca',
                credential: 'enter1234',
                username: 'bethin.charles@yahoo.com'
              }]};

var peerConnection;
var peerConnection2;

var peers = [];

var uuid = uuid(); // Unique identifier of client
var socket = io.connect(); // Connects to socket.io server

// Adding audio/video to stream
var constraints = {
  video: true,
  audio: true
}


/*********************************************/
/*************** SIGNALING *******************/
/*********************************************/

// When it receives a ready message, send back the here message and setup the connections
// as needed.
socket.on('ready', function(identifier, numClients) {
  socket.emit('here', uuid, roomName);

  console.log('Socket is ready');

  //setupConnections(numClients);
});

// When it receives a here message, save the UUID of the here message client to
// one of the peers.
socket.on('here', function(new_uuid) {
  console.log("Here from " + uuid);

  //if new_uuid is still blank, AND if new_uuid doesn't exist yet AND this device isn't the uuid
  if (!peers[new_uuid] && uuid != new_uuid && peers.length < 2) {
    var newPeerConnection = createPeerConnection(new_uuid, peers.length);
    peers.push({
      "uuid": new_uuid,
      "number": (peers.length),
      "peerConnection": newPeerConnection
    });
  } else {
    console.log("Whoops");
  }
});

// On signal, go to gotMessageFromServer to handle the message
socket.on('signal', function(message) {
  console.log('Client received message:', message);
  gotMessageFromServer(message);
});

// Logs messages from server
socket.on('log', function(array) {
  console.log.apply(console, array);
});

socket.on('disconnectClient', function(uuid, roomName) {
  console.log(uuid, " left the room.")
  hangup(uuid);
});

function gotMessageFromServer(message) {
    var signal = JSON.parse(message);
    var peerNumber;

    // Ignore messages from ourself
    if(signal.uuid == uuid) {
      console.log("Received from self");
      return;
    };

    for (var i=0; i < peers.length; i++) {
      if (peers[i].uuid == signal.uuid) {
        peerNumber = i;
        console.log("Message from:", peerNumber);
        break;
      } else {
        console.log("UUID:", uuid);
      }
    }

    if (peers[peerNumber].uuid == signal.uuid) {
      //sendToPeerValue = peer.number;

      if(signal.type == "sdp") {
          peers[peerNumber].peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
              // Only create answers in response to offers
              if(signal.sdp.type == 'offer') {
                  console.log("Got offer")
                  sendToPeerValue = peerNumber;
                  peers[peerNumber].peerConnection.createAnswer().then(setAndSendDescription).catch(errorHandler);
              } else {
                console.log("Got answer")
              }
          }).catch(errorHandler);
      } else if(signal.type == "ice") {
          peers[peerNumber].peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
          console.log("Signal Ice:", signal.ice);
      }
    }
}

/*******************************************/
/**************** Simple Function ***********/
/*******************************************/


// Once the page has loaded, connect the JS objects to HTML objects
function pageReady() {
    localVideoObject = document.getElementById('localVideo');
    var remoteVideoObject = document.getElementById('remoteVideo');
    var remoteVideoObject2 = document.getElementById('remoteVideo2');
    remoteVideoObjects.push(remoteVideoObject);
    remoteVideoObjects.push(remoteVideoObject2);
    consoleWindow = document.getElementById('console');

    broadcastButton = document.getElementById('broadcastButton');
    hangupButton = document.getElementById('hangup');
    startCameraButton = document.getElementById('startCamera');

    roomName = window.location.hash.substr(1);
    console.log("roomName:", roomName);
    socket.emit('join', uuid, roomName); // Joins the server's room

    hangupButton.disabled = true;

    window.addEventListener("beforeunload", function(e) {
        socket.emit('disconnectServer', uuid, roomName); // Disconnects from roomm
    }, false);

    broadcastButton.addEventListener('click', joinRoom);
}

// Open the local stream and create peer connection.
function setupCamera() {
  console.log("Setting up Camera");
  setupMediaStream(false);
}

function joinRoom() {
  // It only runs two of each cuz of that error;
  try {
    startCall();
  } catch(err) {
    console.log("Error:", err)
  }
  try {
    startCall();
  } catch(err) {
    console.log("Error:", err)
  }

  // try {
  //   startCall2();
  // } catch(err) {
  //   console.log("Error:", err)
  // }
  // try {
  //   startCall2();
  // } catch(err) {
  //   console.log("Error:", err)
  // }

}

// Start broadcasting to peer
function startCall() {
  setupMediaStream(true, 0);
  console.log("Sending Offer");
  sendToPeerValue = 0;
  peers[0].peerConnection.createOffer().then(setAndSendDescription).catch(errorHandler);
  hangupButton.disabled = false;
}

// Start broadcasting to peer 2
function startCall2() {
  hangupButton.disabled = false;
  setupMediaStream(true, 1);
  console.log("Sending Offer");
  sendToPeerValue = 1;
  peers[1].peerConnection.createOffer().then(setAndSendDescription).catch(errorHandler);
  hangupButton.disabled = false;
}

// Close connections
function hangup(uuid) {
  // console.log('Ending call');
  // if (uuid == peer1uuid || !uuid ) {
  //   peerConnection.close();
  //   peerConnection = null;
  //   remoteVideoObjects[0].src = null;
  // } else if (uuid == peer2uuid || !uuid) {
  //   peerConnection2.close();
  //   peerConnection2 = null;
  //   remoteVideoObjects[1] = null;
  // }

  hangupButton.disabled = true;
  broadcastButton.disabled = false;

}

/********************************************/
/************* Peer Connections *************/
/********************************************/

function setupConnections(numClients) {
  // Create 1 or two connections based on # of connections to server
  if (numClients == 2) {
    console.log('Client 2 Ready.');
    // peerConnection = createPeerConnection();
    console.log("2 Clients");
  } else if (numClients == 3) {
    console.log("Client 3 Ready.");
    // peerConnection = createPeerConnection();
    // peerConnection2 = createPeerConnection();
  }
}

// Get the media from camaera/microphone.
function setupMediaStream(startStream, peerNumber) {

  if(navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        localStreams[peerNumber] = stream;
        console.log("Adding media stream to:", 0);
        localVideoObject.src = window.URL.createObjectURL(stream);
      }).catch(errorHandler);
  } else {
      alert('Your browser does not support getUserMedia API');
  }

  // If you want to start the stream, addStream to connection
  if (startStream == true) {
      console.log("Adding media stream to:", peerNumber);
      peers[peerNumber].peerConnection.addStream(localStreams[peerNumber]);
  }

}

// Create peer connection 1
function createPeerConnection(peerUuid, peerNumber) {
  console.log("Creating Peer Connection");

  var newPeerConnection;
  newPeerConnection = new RTCPeerConnection(peerConnectionConfig);
  newPeerConnection.onicecandidate = function(event) {
    if(event.candidate != null) {
        socket.emit('signal', JSON.stringify({'type': 'ice', 'ice': event.candidate, 'uuid': uuid}), peerUuid, roomName);
    }
  };

  newPeerConnection.onaddstream = function(event) {
    console.log('Received remote stream');
    console.log(event.stream);
    remoteVideoObjects[peerNumber].src = window.URL.createObjectURL(event.stream);
  };

  console.log("Created Object:", newPeerConnection);
  return newPeerConnection;
}

/****************************************/
/******** RTC Response Functions ********/
/****************************************/

function setAndSendDescription(description) {

  peers[sendToPeerValue].peerConnection.setLocalDescription(description).then(function() {
      socket.emit('signal', JSON.stringify({'type': 'sdp', 'sdp': peers[sendToPeerValue].peerConnection.localDescription, 'uuid': uuid}), peers[sendToPeerValue].uuid, roomName);
      //serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
  }).catch(errorHandler);
}


/****************
    Helper Functions
****************/


function errorHandler(error) {
    console.log(error);
}

function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
