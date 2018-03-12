// Connects to socket.io server
var socket;
var uuid;
var roomName = window.location.hash;

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

    addUsersToInviteModal(ECE_faculty);

  // Setup Socket;
  setupSocket();
  user.name = 'user';
  socket.emit('create user', user, roomName);

  $('#publishButton').click(function() {
      $('#infoText').attr('hidden', 'true');
      streamEng.publish();
      $('#publishButton').css('opacity', '0.25');
  });

  $('#message-button').click(sendMessage);

  $('#message-input').keyup(function(event) {
      if (event.keyCode === 13) {
        sendMessage();
      }
  });

    $('#open-chat-button').click(function() {
        chatBox = $('#chat-box');
        if (chatBox.hasClass('showBox')) {
            $('#chat-box').removeClass("showBox");
        } else {
            $('#chat-box').addClass("showBox");
        }
    });


});

$('#invitePeopleButton').on('click', function() {
    $('#inviteModal').modal('toggle');
    $('#link-ref').html(function() { return window.location.href });
});

/******* SOCKET ********/

function setupSocket() {

  socket = io.connect();

  socket.on('created user', function(userID) {

    user.userID = userID;
      console.log("Connected");

    // Send join stream system Message
    socket.emit('join service', user.userID, 'stream', roomName);
  });

  socket.on('joined service', function(userID, serviceType, serviceAddress) {
    var engine = services[serviceType];
    engine.serviceAddress = serviceAddress;

    engine.setupService();
  });

  socket.on('chat message', function(message, fromUser) {

      var darker = "";
      if (fromUser.userID === user.userID) {
          darker = "darker";
      }
      var html = "<div class=\"message-item " + darker + "\">" +
          "<img class=\"message-img\" src=\"img/charles.jpeg\"/>" +
          "<p class=\"message-text\">" + message + "</p> </div>";

      $('#messages').append(html);
  });

  // streamEng.onSubscribeDone = function() {
  //     streamEng.publish();
  // };

  streamEng.onPublish = function(stream) {
    if (!isPublished) {
      numPublishers++;
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

function addUsersToInviteModal(users) {
    for (username in users) {
        var user = users[username];

        var html = "<div class=\"row userRow centering\">" +
            "<img class=\"userImg\" src=\"/img/" + user.img + "\"/>" +
            "<p class=\"userName\">" + user.name + "</p>" +
            "<button class=\"btn btn-secondary inviteBtn\" id=\"" + user.name.split(' ')[0] + "\"onclick=\"sendInviteTo(\'" + user.name + "\')\">Invite</button>" +
            "</div>";

        $('#users').append(html);
    }
}

function sendInviteTo(name) {
    var split_str = name.split(' ');
    var username = split_str[split_str.length - 1];
    socket.emit('send invite', name, ECE_faculty[username].email, window.location.href);
    var button = $('#'+name.split(' ')[0]);
    button.html(function() {
        return "<img src=\"img/check.png\" style=\"width: 30px\"/>"
    });
    button.attr("disabled", "true");

}

const ECE_faculty = {
    'Sid': {
        name: 'Sid Ahuja',
        email: 'sid@blinkcdn.com',
        img: 'sid.jpg'
    },
    'Mukund': {
        name: 'Mukund Iyengar',
        email: 'mukund@blinkcdn.com',
        img: 'mukund.jpg'
    },
    'Charles': {
        name: 'Charles Bethin',
        email: 'charles@blinkcdn.com',
        img: 'charles.jpeg'
    },
    'Justin': {
        name: 'Justin Trugman',
        email: 'justin@blinkcdn.com',
        img: 'justin.jpg'
    },
    'Sushant': {
        name: 'Sushant Mongia',
        email: 'sushantmongia@gmail.com',
        img: 'sushant.jpg'
    },
    'Vrushali': {
        name: 'Vrushali Gaikwad',
        email: 'vrushaligaikwad9@gmail.com',
        img: 'vrushali.jpg'
    },
    'Zhang': {
        name: 'Yu Zhang',
        email: 'memo40k@outlook.com',
        img: 'zhang.jpg'
    },
    'Nate': {
        name: 'Nathan Van Eck',
        email: 'natvaneck@gmail.com',
        img: 'blink.png'
    },
    'Test': {
        name: 'Test',
        email: 'justin@blinkcdn.com',
        img: 'blink.png'
    }
};

function sendMessage() {
    message = $('#message-input').val();
    socket.emit("chat message", message, user, roomName);
    message = $('#message-input').val("");
}
