// Connects to socket.io server
var socket;
var uuid;
var roomName = 'helloAdele';
console.log("Connected");

// Setup HTML Objects
var button;

/* user = {
  name:
  userImg:
  userID:
}*/
var user = {};

var services = {
  "stream": streamEng
}

$(document).ready(function() {

  // Setup Socket
  setupSocket();

  user.name = 'user';
  socket.emit('create user', user, roomName);
});

/******* SOCKET ********/

function setupSocket() {

  socket = io.connect();

  socket.on('created user', function(userID) {
    user.userID = userID;

    // Send join stream system Message
    socket.emit('join service', user.userID, 'stream', roomName);
  });

  socket.on('joined service', function(userID, serviceType, serviceAddress) {
    var engine = services[serviceType];
    engine.serviceAddress = serviceAddress;

    engine.setupService();
  });

  streamEng.onAddNewPublisher = function(videoIndex) {
    var newVideoLayer = "<center><video id=\"remoteVideo" + videoIndex + "\" autoplay></video></center>"
    $('#remote-video-div').html(function() {
      return $('#remote-video-div').html() + newVideoLayer
    });
    console.log("Added:", videoIndex);
  }

  streamEng.onDeletePublisher = function(videoIndex) {
    console.log("Deleting:", videoIndex);
    $('#remoteVideo'+ videoIndex.toString()).remove();
  }
}
