var options = ["e.g ECE Meeting", "e.g Team Building",
    "e.g Lecture Planning", "e.g Family Chat",
    "e.g Work Dinner", "e.g Random Nonsense",
    "e.g My Room", "e.g Rooms for Days",
    "e.g My Fav Students"];

var objs = {
    goButton: undefined,
    roomNameInput: undefined
};

$(document).ready(function() {
    console.log("Ready.");

    objs.goButton = $('#goButton');
    objs.goButton.on('click', onGoToChat);

    objs.roomNameInput = $('#roomNameInput')[0];

    typeAnimations(options, document.getElementById('roomNameInput'));
    // printLetter("ECE Meeting", document.getElementById('roomNameInput'), 0);
});

function onGoToChat() {
    console.log("Going to chat.");
    // console.log("https://" + window.location.hostname);

    var roomname_in = stringToLink(objs.roomNameInput.value);
    window.location.href = "https://" + window.location.hostname + "/chat.html#" + roomname_in;
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
            $(input).attr("placeholder", "");
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