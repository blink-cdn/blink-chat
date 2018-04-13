// Connects to socket.io server
var socket;
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
var masterUser = undefined;
var user = {};
var services = {
  "stream": streamEng
};

// For video framings
var isPublished = false;
var numPublishers = 0;
var videoIndices = [];
var activeVideos = [];
var hiddenVideos = [];

$(document).ready(function() {
    socket = io.connect();

    // Check if a user is created, if so make sure to disconnect them first
    loadUserFromCache(function() {
      if (user !== undefined) {
          socket.emit('disconnect client', user.userID, user.roomName);
          user = {};
      } else {
          user = {};
      }

      // Setup Socket;
      setupSocket();
      user.name = 'user';
      socket.emit('create user', user, roomName);
      $('#publishButton').click(function() {
          $('#screenshareButton').attr("disabled", "true");
          $('#screenshareButton').css('opacity', '0.25');
          $('#publishButton').attr("disabled", "true");
          $('#publishButton').css('opacity', '0.25');

          $('#infoText').attr('hidden', 'true');
          streamEng.publish();
          $('#publishButton').css('opacity', '0.25');
      });
      $('#screenshareButton').click(function() {
          streamEng.shouldScreenshare = true;
          $('#screenshareButton').attr("disabled", "true");
          $('#publishButton').attr("disabled", "true");
          $('#screenshareButton').css('opacity', '0.25');
          $('#publishButton').css('opacity', '0.25');

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
              $('#remote-video-div').removeClass("video-on-chat-open");
          } else {
              $('#chat-box').addClass("showBox");
              $('#remote-video-div').addClass("video-on-chat-open");
          }
      });
      $('#invitePeopleButton').click(function() {
          $('#inviteModal').modal('toggle');
          $('#link-ref').html(function() { return window.location.href });
      });

      listenForNewMessages();
    });
});



/******* SOCKET ********/

function setupSocket() {
  socket.on('created user', function(userID) {
    user.userID = userID;
    saveUsersToCache(user);

    // Send join stream system Message
    socket.emit('join service', user.userID, 'stream', roomName);
  });
  socket.on('joined service', function(userID, serviceType, serviceAddress) {
    var engine = services[serviceType];
    engine.serviceAddress = serviceAddress;

    engine.setupService();
  });
  socket.on('chat message', function(message, fromUser) {
      var msg = {
          fromUser: fromUser,
          message: message
      };

      addMessageToChatBox(msg);
  });

  // streamEng.onSubscribeDone = function() {
  //     streamEng.publish();
  // };

  // streamEng.onPublish = function(stream) {
  //     console.log("On Publish called");
  //
  //     if (!isPublished) {
  //         numPublishers++;
  //         activeVideos.push('#local-video');
  //     }
  //     isPublished = true;
  //
  //     $('#local-video-div').html(function() {
  //         return "<video muted id=\"local-video\" class=\'"
  //               + (streamEng.shouldScreenshare ? "screenshare" : "")
  //               + "\' autoplay></video>";
  //     });
  //
  //     document.getElementById('local-video').srcObject = stream;
  //     applyColumnClassesToVideo();
  // };

  streamEng.onPublish = function(stream) {
      console.log("On Publish called");

      if (!isPublished) {
          numPublishers++;
          // activeVideos.push('#local-video');
      }

      isPublished = true;

      $('#local-video-div').html(function() {
        return "<video muted id=\"local-video\" autoplay></video>";
      });

      document.getElementById('local-video').srcObject = stream;
      applyColumnClassesToVideo();
  }

  streamEng.onAddNewPublisher = function(videoIndex) {
    if (!videoIndices.includes(videoIndex)) {
        // Add video to videoIndices list (master list) and active video list
        var videoId = "#remoteVideo"+videoIndex.toString();
        videoIndices.push(videoIndex);
        activeVideos.push(videoId);

        // Add video to HTML
        var newVideoLayer = "<div class=\"videoStream\"><video id=\"remoteVideo" + videoIndex + "\" autoplay></video>";
        $('#remote-video-div').html(function() {
            return $('#remote-video-div').html() + newVideoLayer
        });
    }

    applyColumnClassesToVideo();
  };
  streamEng.onDeletePublisher = function(videoIndex) {
    removeVideo(videoIndex);
  }
}

//Hides Video when one is clicked
function fullscreenVideo(videoId) {

    var actives = activeVideos.slice();
    for (id in actives) {
        if (actives[id] !== videoId) {
            $(actives[id]).parent().hide();
            hiddenVideos.push(actives[id]);
            removeItemFromArray(activeVideos, actives[id]);
        }
    }

    // setTimeout(applyColumnClassesToVideo, 200);
    applyColumnClassesToVideo();
}
function unFullscreenVideo() {

    for (id in hiddenVideos) {
        activeVideos.push(hiddenVideos[id]);
    }
    hiddenVideos = [];

    $('video').parent().show();
    // setTimeout(applyColumnClassesToVideo, 200);
    applyColumnClassesToVideo();
}
function removeVideo(videoIndex) {
    $('#remoteVideo'+ videoIndex.toString()).parent().closest('div').remove();
    removeItemFromArray(videoIndices, videoIndex);
    removeItemFromArray(activeVideos, "#remoteVideo"+videoIndex.toString());
    applyColumnClassesToVideo();
}
function applyColumnClassesToVideo() {
    var videos = document.querySelectorAll('video');
    for (i in videos) {
        videos[i].onclick = function(event) {
            if (activeVideos.length === 1) {
                unFullscreenVideo();
            } else {
                fullscreenVideo("#" + event.target.id);
            }
        };
    };

    var columnSize;
    var smallColumnSize;
    if (activeVideos.length === 1) {
        columnSize = 12;
        smallColumnSize = 12;
    } else if (activeVideos.length === 2) {
        columnSize = 6;
        smallColumnSize=12;
    } else if (activeVideos.length >= 3) {
        columnSize = 4;
        smallColumnSize = 6;
    }

    if (isPublished) {
        $('#local-video-div').attr('class',"");
        $('#local-video-div').addClass("col col-lg-" + columnSize.toString() + " col-md-" + columnSize.toString() + " col-sm-" + smallColumnSize.toString() + " col-" + smallColumnSize.toString());
        $('body').attr('class', 'bg-dark');
    }

    for (var i = 0; i < videoIndices.length; i++) {
    $('.videoStream').attr('class',"videoStream");
    $('.videoStream').addClass("col col-lg-" + columnSize.toString() + " col-md-" + columnSize.toString() + " col-sm-" + smallColumnSize.toString() + " col-" + smallColumnSize.toString());
    $('.videoStream').addClass('centering');
  }

    if (activeVideos.length === 0) {
        $('body').attr('class', 'bg-light');
        $('#infoText').attr('hidden', 'false');
        $('.navbar-brand').css('color', 'black');
    } else {
        $('#infoText').attr('hidden', 'true');
        $('body').attr('class', '');
        $('body').css('background-color', 'black');
        $('.navbar-brand').css('color', 'whitesmoke');
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
    var username = split_str[0];
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
    'Yu': {
        name: 'Yu Zhang',
        email: 'memo40k@outlook.com',
        img: 'zhang.jpg'
    },
    'Nathan': {
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

function loadUserFromCache(callback) {
    var user_string = localStorage['blink-chat-user-info'];
    if (user_string !== undefined) {
        user = JSON.parse(user_string);
    } else {
        user = undefined;
    }

    if (localStorage['blink-user-info'] !== undefined) {
      masterUser = JSON.parse(localStorage['blink-user-info']);
      user.name = masterUser.displayName;
      user.userID = masterUser.uid;
    }

    callback();
}

function saveUsersToCache(user) {
    user.roomName = roomName;
    localStorage['blink-chat-user-info'] = JSON.stringify(user);
}

/****** MESSAGES **********/

function sendMessage() {
    var message = $('#message-input').val();
    $('#message-input').val("");

    var msg = {
        fromUser: user,
        message: message
    };

    updateMessagesToFirebase(msg);
}
function addMessageToChatBox(message) {
    var darker = "";
    if (message.fromUser.userID === user.userID) {
        darker = "darker";
    }

    var html = "<div class=\"message-item " + darker + "\">" +
        "<img class=\"message-img\" src=\"img/blink.png\"/>" +
        "<p class=\"message-text\">" + message.message + "</p> </div>";

    $("#messages").append(html);
    $('#messages').scrollTop($('#messages').prop("scrollHeight"));
}

/***** FIREBASE *******/

function updateMessagesToFirebase(message) {
    var roomName_name = "rooms/" + roomName.substring(1);

    var newMessageKey = database.ref().child(roomName_name).push().key;
    var updates = {};
    updates[roomName_name + '/messages/' + newMessageKey] = message;
    database.ref().update(updates);
}

function listenForNewMessages() {
    var roomName_name = "rooms/" + roomName.substring(1);
    var messageRef = database.ref(roomName_name + '/messages');
    messageRef.on('child_added', function(snapshot) {
        addMessageToChatBox(snapshot.val());
    });
}
