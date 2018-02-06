//STATUS: WOrking
var localVideoObject;
var remoteVideoObject;
var broadcastButton;

var roomName = "helloAdele";
var localStreams = {};
var sendToPeerValue = -1;

const configOptions = {"iceServers": [{"url": "stun:stun.l.google.com:19302"},
              { url: 'turn:numb.viagenie.ca',
                credential: 'enter1234',
                username: 'bethin.charles@yahoo.com'
              }]};

// var subscibers = [];
// var publishers = [];
var peers = [];
var peerNumberOf = {
  "userID": "peerNumber",
}

var constraints = {
  video: true,
  audio: true
}

///////////////////////
//// StreamCast Eng Stuff

var streamEng = {
    socket: null,
    serviceAddress: null,
    onSubscribeDone: undefined
};

var numPublishers = 0;

streamEng.setupService = function() {
  streamEng.subscribe();
};

streamEng.publish = function() {
  setupMediaStream(false);
  streamEng.socket.emit('publish', user.userID, roomName);
  user.isPublished = true;
  console.log("Publishing");
};

streamEng.subscribe = function() {
  setupPage();
  streamEng.socket = io.connect(streamEng.serviceAddress);
  console.log("Connected to Stream Server", streamEng.serviceAddress, roomName);

  $('#publishButton').click(function() {
    streamEng.publish();
  });

  streamEng.socket.emit('subscribe', user.userID, roomName);

  // When it receives a here message, add user to peers (only publishers get here msg's)
  streamEng.socket.on('here', function(clientID) {

    if (!peerNumberOf.hasOwnProperty(clientID)) {
      //if clientID is still blank, AND if clientID doesn't exist yet AND this device isn't the userID
      if (user.userID != clientID) {
        console.log("Here from:", clientID);
        var newPeerConnection = createPeerConnection(clientID);
        peers.push({
          "userID": clientID,
          "number": (peers.length),
          "peerConnection": newPeerConnection
        });
        peerNumberOf[clientID] = peers.length - 1;

      }
      joinRoom();

    } else {
      console.log("Already connected to this peer. Initiating stream");

      var peerNumber = peerNumberOf[clientID];
      setupMediaStream(true, peerNumber);
    }

    if (streamEng.onSubscribeDone != "undefined") {
        streamEng.onSubscribeDone();
    }

  });

  // The broadcaster is ready to stream, create a PC for it
  streamEng.socket.on('publisher ready', function(publisherID, publisherNumber) {
    console.log("A new publisher is ready:", publisherNumber);

    if (!peerNumberOf.hasOwnProperty(publisherID)) {
      if (user.userID != publisherID) {
        var newPeerConnection = createPeerConnection(publisherID, publisherNumber);
        peers.push({
          "userID": publisherID,
          "number": (peers.length),
          "peerConnection": newPeerConnection,
          "publisherNumber": publisherNumber
        });

        peerNumberOf[publisherID] = peers.length - 1;
      }
    } else {
      peers[peerNumberOf[publisherID]].publisherNumber = publisherNumber;
      peers[peerNumberOf[publisherID]].peerConnection.onaddstream = function(event) {
        console.log('Received remote stream');
        $('#remoteVideo'+ publisherNumber.toString()).attr('src', window.URL.createObjectURL(event.stream));
        console.log("Adding stream to:", peers[peerNumberOf[publisherID]].publisherNumber);
      };
    }

    streamEng.onAddNewPublisher(publisherNumber);
  });

  // On signal, go to gotMessageFromServer to handle the message
  streamEng.socket.on('signal', function(message) {
    gotMessageFromServer(message);
  });

  // Handle client disconnect
  streamEng.socket.on('disconnect user', function(userID, roomName) {
     if (peerNumberOf.hasOwnProperty(userID)) {
       var peerNumber = peerNumberOf[userID];
       if (peers[peerNumber].hasOwnProperty("publisherNumber")) {
         // If it's a publisher, delete publishers
         streamEng.onDeletePublisher(peers[peerNumber].publisherNumber);
       }

       peers.splice(peerNumber, 1);
     }
  });

}


//////////////////////////
////// To make this work

function gotMessageFromServer(message) {
    var signal = message;
    var peerNumber = -1;

    // Ignore messages from ourself
    if(signal.userID == user.userID) {
      console.log("Received from self");
      return;
    }

    if (true) {
      // If I'm the broadcaster, loop through my peers and find the right
      // peer connection to use to send to
      peerNumber = peerNumberOf[signal.userID]

      if (peers[peerNumber].userID == signal.userID) {

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
        }
      }
    }


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
}

function startCall() {
    setupMediaStream(true, peers.length-1);
}


// Get the media from camaera/microphone.
function setupMediaStream(startStream, peerNumber) {

  if(navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        localStreams[peerNumber] = stream;

        if (startStream == false) {
          streamEng.onPublish(stream);
        }

        // If you want to start the stream, addStream to connection
        if (startStream == true) {
            peers[peerNumber].peerConnection.addStream(localStreams[peerNumber]);

            sendToPeerValue = peerNumber;
            peers[peerNumber].peerConnection.createOffer().then(setAndSendDescription).catch(errorHandler);
        }
      }).catch(errorHandler);
  } else {
      alert('Your browser does not support getUserMedia API');
  }
}

// Create peer connection 1
function createPeerConnection(peerUserID, publisherNumber) {

  var newPeerConnection = new RTCPeerConnection(configOptions);
  newPeerConnection.onicecandidate = function(event) {
    if(event.candidate != null) {
        streamEng.socket.emit('signal', {'type': 'ice', 'ice': event.candidate, 'userID': user.userID}, peerUserID, roomName);
    }
  };

  if (publisherNumber != null) {
    newPeerConnection.onaddstream = function(event) {
      console.log('Received remote stream');
      $('#remoteVideo'+ publisherNumber.toString()).attr('src', window.URL.createObjectURL(event.stream));
      console.log("Adding stream to:", publisherNumber);
    };
  }


  return newPeerConnection;
}

function setAndSendDescription(description) {

  if (sendToPeerValue == -10) {
    broadcaster.peerConnection.setLocalDescription(description).then(function() {
        streamEng.socket.emit('signal', {'type': 'sdp', 'sdp': broadcaster.peerConnection.localDescription, 'userID': user.userID}, broadcaster.castID, roomName);
    }).catch(errorHandler);
  } else {
    peers[sendToPeerValue].peerConnection.setLocalDescription(description).then(function() {
        streamEng.socket.emit('signal', {'type': 'sdp', 'sdp': peers[sendToPeerValue].peerConnection.localDescription, 'userID': user.userID}, peers[sendToPeerValue].userID, roomName);
    }).catch(errorHandler);
  }
}

// Setup DOM elements and responses
function setupPage() {
    user.isPublished = false;
    user.isSubscribed = true;

    localVideoObject = document.getElementById('local-video');
    remoteVideoObject = document.getElementById('remote-video');


    // If client is going to disconnect, let server know
    window.addEventListener("beforeunload", function(e) {
        streamEng.socket.emit('disconnect client', user.userID, roomName); // Disconnects from roomm
    }, false);
}

///////////////////
function errorHandler(error) {
    console.log(error);
}
