var streamViewEng = {
  socket: null,
  serviceAddress: null
};


/******** WebRTC Functionality *****/
var remoteVideoObject;
var broadcastButton;
var hangupButton;
var signalRcvd;

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

var broadcaster = {};

// Adding audio/video to stream
var constraints = {
  video: true,
  audio: true
}

/**************** Simple Function ***********/

streamViewEng.setupService = function() {
  streamViewEng.socket = io.connect(streamViewEng.serviceAddress);
  console.log("Connected to Stream Server", streamViewEng.serviceAddress, roomName);

  streamViewEng.socket.emit('connect to stream', user.userID, roomName);

  // The broadcaster is ready to stream, create a PC for it
  streamViewEng.socket.on('ready', function(castID) {
    console.log("Broadcaster is ready.");

    var newPeerConnection = createPeerConnection(castID);
    broadcaster = {
      "castID": castID,
      "peerConnection": newPeerConnection
    };
  });

  // On signal, go to gotMessageFromServer to handle the message
  streamViewEng.socket.on('signal', function(message) {
    gotMessageFromServer(message);
  });

  // Broadcaster has disconnected
  streamViewEng.socket.on('cast disconnect', function() {
    console.log("Broadcaster disconnected");
  });
  setupPage();
}

// Setup DOM elements and responses
function setupPage() {
    remoteVideoObject = document.getElementById('remote-video');

    // If client is going to disconnect, let server know
    window.addEventListener("beforeunload", function(e) {
        streamViewEng.socket.emit('disconnect client', user.userID, roomName); // Disconnects from roomm
    }, false);
}


/******** Peer Connections ********/

function setupConnections(numClients) {
  // Create 1 or two connections based on # of connections to server
  if (numClients == 2) {
    console.log('Client 2 Ready.');
    // createPeerConnection();
  }
}

// Create and return a peer connection
function createPeerConnection(peerUserID) {
  console.log("Creating Peer Connection");

  var newPeerConnection;
  newPeerConnection = new RTCPeerConnection(configOptions);

  newPeerConnection.onicecandidate = function(event) {
    if(event.candidate != null) {
        socket.emit('signal', JSON.stringify({'type': 'ice', 'ice': event.candidate, 'uuid': user.userID}), peerUserID, roomName);
    }
  };

  newPeerConnection.onaddstream = function(event) {
    console.log('Received remote stream', event.stream);
    remoteVideoObject.src = window.URL.createObjectURL(event.stream);
  };

  console.log("Created Object:", newPeerConnection);
  return newPeerConnection;
}

function gotMessageFromServer(message) {

  var signal = JSON.parse(message);
  var peerUserID = signal.uuid;

  // Ignore messages from ourself
  if(signal.uuid == user.userID) return;

  if (signal.uuid == broadcaster.castID) {
    if(signal.type == "sdp") {
        broadcaster.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {

            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                console.log("Got offer")
                broadcaster.peerConnection.createAnswer().then(setAndSendDescription).catch(errorHandler);
            } else {
              console.log("Got answer")
            }

        }).catch(errorHandler);
    } else if(signal.type == "ice") {
        broadcaster.peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
        console.log("Signal Ice:", signal.ice);
    }
  }
}

function setAndSendDescription(description) {
  console.log("Sending description", description.type);

  broadcaster.peerConnection.setLocalDescription(description).then(function() {
      streamViewEng.socket.emit('signal', JSON.stringify({'type': 'sdp', 'sdp': broadcaster.peerConnection.localDescription, 'uuid': user.userID}), broadcaster.castID, roomName);
      //serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
  }).catch(errorHandler);

}


/******** Helper Functions ********/

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
