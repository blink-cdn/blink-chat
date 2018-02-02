// Connects to socket.io server
var socket;
var uuid;
var roomName = 'blink-watching';
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

// For video framings
var isPublished = false;
var numPublishers = 0;
var videoIndices = [];

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

    streamEng.onPublish = function(stream) {
        // Do nothing. Watcher does not publish.
    };

    streamEng.onAddNewPublisher = function(videoIndex) {
        numPublishers++;
        videoIndices.push(videoIndex);

        if (numPublishers == 1) {
            var newVideoLayer = "<div class=\"videoStream\"><video id=\"remoteVideo" + videoIndex + "\" autoplay></video>";
            $('#remote-video-div').html(function() {
                return $('#remote-video-div').html() + newVideoLayer
            });

            applyColumnClassesToVideo();
            console.log('Video', videoIndex, 'added but not shown.');
            return;
        }

        console.log('Video', videoIndex, 'added.');
    };

    streamEng.onDeletePublisher = function(videoIndex) {
        numPublishers--;
        if (numPublishers == 0) {
            $('#remoteVideo'+ videoIndex.toString()).parent().closest('div').remove();
            removeItemFromArray(videoIndices, videoIndex);
            applyColumnClassesToVideo();
            console.log("Deleting:", videoIndex);
        }
    }
}

function applyColumnClassesToVideo() {
    var columnSize;
    var smallColumnSize;
    if (numPublishers == 1) {
        columnSize = 12;
        smallColumnSize = 12;
    } else if (numPublishers == 2) {
        columnSize = 6;
        smallColumnSize=12;
    } else if (numPublishers >= 3) {
        columnSize = 4;
        smallColumnSize = 6;
    }

    if (isPublished) {
        $('#local-video-div').attr('class',"");
        $('#local-video-div').addClass("col col-lg-" + columnSize.toString() + " col-md-" + columnSize.toString() + " col-sm-" + smallColumnSize.toString() + " col-" + smallColumnSize.toString());
    }

    for (var i = 0; i < videoIndices.length; i++) {
        var videoIndex = videoIndices[i];
        $('.videoStream').attr('class',"videoStream");
        $('.videoStream').addClass("col col-lg-" + columnSize.toString() + " col-md-" + columnSize.toString() + " col-sm-" + smallColumnSize.toString() + " col-" + smallColumnSize.toString());
    }

    console.log("Classes applied.");
}