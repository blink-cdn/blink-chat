var options = ["e.g ECE Meeting", "e.g Team Building",
    "e.g Lecture Planning", "e.g Family Chat",
    "e.g Work Dinner", "e.g Random Nonsense",
    "e.g My Room", "e.g Rooms for Days",
    "e.g My Fav Students"];

var objs = {
    goButton: undefined,
    roomNameInput: undefined
};

var masterUser = undefined;

$(document).ready(function() {
    console.log("Ready.");
    var modal = document.getElementById('myModal');
    var btn = document.getElementById("myBtn");
    var span = document.getElementsByClassName("close")[0];

    if (window.location.hostname === "svc.blinkcdn.com") {
      $('#login-text').css('visibility', 'visible');
    }

    $('#login-btn').click(function() {
      firebase.auth().signInWithPopup(provider).then(function(result) {
          // This gives you a Google Access Token. You can use it to access the Google API.
          var token = result.credential.accessToken;
          // The signed-in user info.
          var user = result.user;
          handleSignIn(user);
      }).catch(function(error) {
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;
          // The email of the user's account used.
          var email = error.email;
          // The firebase.auth.AuthCredential type that was used.
          var credential = error.credential;
      });
    });
    $('.close').click(function() {
      $('#myModal').css('display', 'none');
    })
    $('#back-button').click(function() {
      $('#pods-container').animate({
        right: "-100vw"
      }, 550, null);

      $('#head-container').animate({
        right: "0"
      }, 300, function() {
        console.log("Animated");
      });

      $('#pods-list').html(function() { return "" });
      pods = null;
    })
    objs.goButton = $('#goButton');
    objs.goButton.on('click', onGoToChat);

    objs.roomNameInput = $('#roomNameInput')[0];

    $(".navbar").scrollTop

    // typeAnimations(options, document.getElementById('roomNameInput'));
    // printLetter("ECE Meeting", document.getElementById('roomNameInput'), 0);
});

function onGoToChat(roomName_input) {
    console.log("Going to chat.");
    // console.log("https://" + window.location.hostname);

    var roomname = stringToLink(objs.roomNameInput.value.toLowerCase());
    goToChat(roomname);
}

function goToChat(roomname) {
  window.location.href = "https://" + window.location.hostname + "/chat.html#" + roomname;
}

/////////////////
//// SIGN IN ////
/////////////////

var pods = undefined;

function handleSignIn(user) {
  console.log(user);
  console.log(user.email);
  masterUser = user;
  getPods(user);
}

function getPods(user) {
  var userId = user.uid;
  firebase.database().ref('/users/'+userId+'/pods').once('value').then(function(snapshot) {
    pods = snapshot.val();
    displayPods();
  });
}

function displayPods() {
  $('#pods-list').html(function() { return "" });
  if (pods === null) {
    $('#pods-list').append("<h5 id=\"no-pod-found\">No pods found.</h5>");
  } else {
    for (pod in pods) {
      var html = "<li class=\"pod-link\" id=\"" + pods[pod] + "\">" + pod + "</li>"
      $('#pods-list').append(html);
    }
  }

  $('.pod-link').click(function(event) {
    console.log(event.target.id);
    goToChat(event.target.id);
  });

  console.log("Pods:", pods);
  $('#head-container').animate({
    right: "100vw"
  }, 550, function() {
    console.log("Animated");
  });

  $('#pods-container').animate({
    right: "0"
  }, 300, function() {
    console.log("Animated");
  });
}

function newPod(podName) {
  var newPodKey = database.ref().child("users").push().key;
}


///////////////////////////
//// TYPING ANIMATIONS ////
///////////////////////////

function typeAnimations(arrOptions, element) {

    setTimeout(function() {
        printLetter(arrOptions[0], element, 0);
    }, 800);

    setInterval(function() {
        if (element === document.activeElement) {
            element.attr("placeholder", "");
        } else {
            var index = randDelay(0, arrOptions.length-1);
            printLetter(arrOptions[index], element, 0);
        }

    }, 6000)
}
function randDelay(min, max) {
    return Math.floor(Math.random() * (max-min+1)+min);
}
function printLetter(string, el, count) {
    // split string into character separated array
    var arr = string.split(''),
        input = el,
        // store full placeholder
        origString = string,
        // get current placeholder value
        curPlace = $(input).attr("placeholder"),
        // append next letter to current placeholder
        placeholder = curPlace + arr[count];

    setTimeout(function(){
        // print placeholder text
        $(input).attr("placeholder", placeholder);
        // increase loop count
        count++;
        // run loop until placeholder is fully printed
        if (count < arr.length) {
            printLetter(origString, input, count);
        } else {
            setTimeout(function() {
                removeLetter(origString, input, count);
            }, randDelay(400, 600));

        }
        // use random speed to simulate
        // 'human' typing
    }, randDelay(90, 150));
}
function removeLetter(string, el, count) {
    // var arr = string.split('');
    var input = el;
    var origString = string;
    var curPlace = $(input).attr("placeholder");
    var arr = curPlace.split('');
    arr.pop();

    setTimeout(function() {
        $(input).attr("placeholder", arr.join(""));
        count--;
        if (count > 0) {
            removeLetter(origString, input, count);
        }
    }, randDelay(100, 100));
}

function stringToLink(string) {
    var returnString = "";

    for (i in string) {
        if (string[i] == " ") {
            returnString += "_";
        } else {
            returnString += string[i];
        }
    }

    return returnString;
};
