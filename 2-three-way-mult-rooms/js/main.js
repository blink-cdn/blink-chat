var localVideoObject;
var remoteVideoObject;
var remoteVideoObject2;
var roomName;

var localStream;
var localStream2;

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

const configOptions = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
		      {"url": "turn:35.167.210.171:3478",
				"username": "cbethin",
				"credential": "bethin"}]};

var peerConnection;
var peerConnection2;

var clickCountCall1 = 0;
var clickCountCall2 = 0;

var peer1uuid = ""; // Saves UUID of Peer 1
var peer2uuid = ""; // and of Peer 2

var uuid = uuid(); // Unique identifier of client
var socket = io.connect(); // Connects to socket.io server
socket.emit('join', uuid, roomName); // Joins the server's room

var isCaller; // Ignore this.. it's vestigial but could be useful lol
var configuration =  null;
var peerConnectionConfig = null;

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
  socket.emit('here', uuid);

  console.log('Socket is ready');
  isCaller = identifier;

  setupConnections(numClients);
});

// When it receives a here message, save the UUID of the here message client to
// one of the peers.
socket.on('here', function(new_uuid) {
  console.log("Here from " + uuid);

  if (peer1uuid == "" && peer1uuid != new_uuid && peer2uuid != new_uuid && uuid != new_uuid) {
    peer1uuid = new_uuid;
  } else if (peer2uuid == "" && peer1uuid != new_uuid && peer2uuid != new_uuid && uuid != new_uuid) {
    peer2uuid = new_uuid;
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


function gotMessageFromServer(message) {
    var signal = JSON.parse(message);

    // Ignore messages from ourself
    if(signal.uuid == uuid) return;

    if(signal.uuid == peer1uuid) {
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
    } else if (signal.uuid == peer2uuid) {
      if(signal.type == "sdp") {
          peerConnection2.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
              // Only create answers in response to offers
              if(signal.sdp.type == 'offer') {
                  console.log("Got offer2 ")
                  peerConnection2.createAnswer().then(setAndSendDescription2).catch(errorHandler);
              } else {
                console.log("Got answer2 ")
              }
          }).catch(errorHandler);
      } else if(signal.type == "ice") {
          peerConnection2.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
      }
    }
}

/*******************************************/
/**************** Simple Function ***********/
/*******************************************/


// Once the page has loaded, connect the JS objects to HTML objects
function pageReady() {
    localVideoObject = document.getElementById('localVideo');
    remoteVideoObject = document.getElementById('remoteVideo');
    remoteVideoObject2 = document.getElementById('remoteVideo2');
    consoleWindow = document.getElementById('console');

    broadcastButon1 = document.getElementById('broadcast1');
    broadcastButon2 = document.getElementById('broadcast2');
    hangupButton = document.getElementById('hangup');
    startCameraButton = document.getElementById('startCamera');

    roomName = window.location.hash.substr(1);
    console.log("Room:", roomName);
    hangupButton.disabled = true;
}

// Open the local stream and create peer connection.
function setupCamera() {
  console.log("Setting up Camera");
  setupMediaStream(false);
}

// Start broadcasting to peer
function startCall() {
  setupMediaStream(true);
  console.log("Sending Offer");
  peerConnection.createOffer().then(setAndSendDescription).catch(errorHandler);
}

// Start broadcasting to peer 2
function startCall2() {
  setupMediaStream2(true);
  console.log("Sending Offer");
  peerConnection2.createOffer().then(setAndSendDescription2).catch(errorHandler);
}

// Close connections
function hangup() {
  console.log('Ending call');
  peerConnection.close();
  peerConnection = null;
  peerConnection2.close();
  peerConnection2 = null;
  hangupButton.disabled = true;
  broadCastButton1.disabled = false;
  broadCastButton2.disabled = false;
  remoteVideoObject.src = null;
}

/********************************************/
/************* Peer Connections *************/
/********************************************/

function setupConnections(numClients) {
  // Create 1 or two connections based on # of connections to server
  if (numClients == 2) {
    console.log('Client 2 Ready.');
    createPeerConnection();
    console.log("2 Clients");
  } else if (numClients == 3) {
    console.log("Client 3 Ready.");
    createPeerConnection();
    createPeerConnection2();
  }
}

// Get the media from camaera/microphone.
function setupMediaStream(startStream) {

  if(navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
      alert('Your browser does not support getUserMedia API');
  }

  // If you want to start the stream, addStream to connection
  if (startStream == true) {
    peerConnection.addStream(localStream);
  }
}

// Get the media from camaera/microphone.
function setupMediaStream2(startStream) {

  if(navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess2).catch(errorHandler);
  } else {
      alert('Your browser does not support getUserMedia API');
  }

  // If you want to start the stream, addStream to connection
  if (startStream == true) {
    peerConnection2.addStream(localStream2);
  }
}

// Create peer connection 1
function createPeerConnection() {
  console.log("Creating Peer Connection");

  peerConnection = new RTCPeerConnection(configOptions);
  peerConnection.onicecandidate = sendIceCandidate;
  peerConnection.onaddstream = gotRemoteStream;
}

// Create peer connection 1
function createPeerConnection2() {
  console.log("Creating Peer Connection");

  peerConnection2 = new RTCPeerConnection(peerConnectionConfig);
  peerConnection2.onicecandidate = sendIceCandidate2;
  peerConnection2.onaddstream = gotRemoteStream2;
}

/****************************************/
/******** RTC Response Functions ********/
/****************************************/

// Set localStream object and connect local webcam to video feed
function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideoObject.src = window.URL.createObjectURL(stream);
}

function getUserMediaSuccess2(stream) {
    localStream2 = stream;
    localVideoObject.src = window.URL.createObjectURL(stream);
    //console.log("Getting User Media Success 2");
}

function setAndSendDescription(description) {
    peerConnection.setLocalDescription(description).then(function() {
        socket.emit('signal', JSON.stringify({'type': 'sdp', 'sdp': peerConnection.localDescription, 'uuid': uuid}), peer1uuid);
        //serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
}

function setAndSendDescription2(description) {
    peerConnection2.setLocalDescription(description).then(function() {
      console.log("description:", description);
        socket.emit('signal', JSON.stringify({'type': 'sdp', 'sdp': peerConnection2.localDescription, 'uuid': uuid}), peer2uuid);
        //serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
    console.log("Setting & Sending description 2");
}

function sendIceCandidate(event) {
    if(event.candidate != null) {
        socket.emit('message', JSON.stringify({'type': 'ice', 'ice': event.candidate, 'uuid': uuid}));
        //serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
}

function sendIceCandidate2(event) {
    if(event.candidate != null) {
        socket.emit('message', JSON.stringify({'type': 'ice', 'ice': event.candidate, 'uuid': uuid}));
        //serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
    console.log("Sending Ice Candidate 2");
}

function gotRemoteStream(event) {
    console.log('Received remote stream');
    console.log(event.stream);
    remoteVideoObject.src = window.URL.createObjectURL(event.stream);
}

function gotRemoteStream2(event) {
    console.log("Got Remote Stream 2");
    remoteVideoObject2.src = window.URL.createObjectURL(event.stream);
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
