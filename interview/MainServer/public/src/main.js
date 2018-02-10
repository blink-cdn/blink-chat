// Connects to socket.io server
var socket;
var uuid;
var roomName = window.location.hash;

console.log("Connected");
var isIE = /*@cc_on!@*/false || !!document.documentMode;
var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));
var isEdge = !isIE && !!window.StyleMedia;

if (isIE || isSafari || isEdge) {
    alert("For best experience, please switch to a supported web browser. Supported browsers include Google Chrome, Mozilla Firefox, and Opera")
}



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

// For video framings
var isPublished = false;
var numPublishers = 0;
var videoIndices = [];

$(document).ready(function() {
  // Setup Socket;
  setupSocket();
  user.name = 'user';
  socket.emit('create user', user, roomName);

  $('#publishButton').click(function() {
      $('#infoText').attr('hidden', 'true');
      streamEng.publish();
      $('#publishButton').css('opacity', '0.25');
  });

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
  //
  // streamEng.onSubscribeDone = function() {
  //     streamEng.publish();
  // };

  streamEng.onPublish = function(stream) {
    if (!isPublished) {
      numPublishers++;
      console.log("Upped");
    }

    isPublished = true;

    $('#local-video-div').html(function() {
      return "<video muted id=\"local-video\" autoplay></video>";
    });

    $('#local-video').attr('src', window.URL.createObjectURL(stream));
    applyColumnClassesToVideo();
  }

  streamEng.onAddNewPublisher = function(videoIndex) {
    numPublishers++;
    if (!videoIndices.includes(videoIndex)) {
        videoIndices.push(videoIndex);
        var newVideoLayer = "<div class=\"videoStream\"><video id=\"remoteVideo" + videoIndex + "\" autoplay></video>";
        $('#remote-video-div').html(function() {
            return $('#remote-video-div').html() + newVideoLayer
        });
    }

    applyColumnClassesToVideo();
    console.log("Displayed video:", videoIndex);
  };

  streamEng.onDeletePublisher = function(videoIndex) {
    numPublishers--;
    console.log("Deleting:", videoIndex);
    $('#remoteVideo'+ videoIndex.toString()).parent().closest('div').remove();
    removeItemFromArray(videoIndices, videoIndex);
    applyColumnClassesToVideo();
  }
}

function applyColumnClassesToVideo() {
  var columnSize;
  var smallColumnSize;
  if (numPublishers === 1) {
    columnSize = 12;
    smallColumnSize = 12;
  } else if (numPublishers === 2) {
    columnSize = 6;
    smallColumnSize=12;
  } else if (numPublishers >= 3) {
    columnSize = 4;
    smallColumnSize = 6;
  }

  if (isPublished) {
    $('#local-video-div').attr('class',"");
    $('#local-video-div').addClass("col col-lg-" + columnSize.toString() + " col-md-" + columnSize.toString() + " col-sm-" + smallColumnSize.toString() + " col-" + smallColumnSize.toString());
    $('body').attr('class', 'bg-dark');
  }

  for (var i = 0; i < videoIndices.length; i++) {
    var videoIndex = videoIndices[i];
    $('.videoStream').attr('class',"videoStream");
    $('.videoStream').addClass("col col-lg-" + columnSize.toString() + " col-md-" + columnSize.toString() + " col-sm-" + smallColumnSize.toString() + " col-" + smallColumnSize.toString());
    $('.videoStream').addClass('centering');
  }

  if (numPublishers === 0) {
      $('body').attr('class', 'bg-light');
      $('#infoText').attr('hidden', 'false');
  } else {
      $('#infoText').attr('hidden', 'true');
      $('body').attr('class', '');
      $('body').css('background-color', 'black');
  }
}

function removeItemFromArray(array, item) {
  var index = array.indexOf(item);
  if (index > -1) {
    array.splice(index, 1);
  }
}