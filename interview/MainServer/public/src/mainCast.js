// Connects to socket.io server
var socket;
var uuid;
var roomName = 'helloAdele';
console.log("Connected");

// Setup HTML Objects
var button;
var bidValueInput;

var user = {};

var services = {
  "stream": streamEng
}

$(document).ready(function() {

  // Setup Socket
  setupSocket();

  user.name = prompt("Please enter your name", "full name");
  user.email = "cbethin@stevens.edu";

  // Join main SERVER
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

    //engine.setupService();
    setupPage();
  });

  console.log("Setup socket");
}

// Once the page has loaded, connect the JS objects to HTML objects
function setupPage() {
    isBroadcaster = true;

    localVideoObject = document.getElementById('local-video');
    broadcastButton = document.getElementById('subscribeButton');
    hangupButton = document.getElementById('endService');

    window.addEventListener("beforeunload", function(e) {
        streamEng.disconnect() // Disconnects from roomm
    }, false);

    broadcastButton.onclick = streamEng.setupService;
    hangupButton.onclick = streamEng.endService;
}
