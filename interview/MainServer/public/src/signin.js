var objs = {
    goButton: undefined,
    roomNameInput: undefined
};

$(document).ready(function() {
    console.log("Ready.");

    objs.goButton = $('#goButton');
    objs.goButton.on('click', onGoToChat);

    objs.roomNameInput = $('#roomNameInput')[0];
});

function onGoToChat() {
    console.log("Going to chat.");
    // console.log("https://" + window.location.hostname);

    window.location.href = "https://" + window.location.hostname + "/chat.html#" + objs.roomNameInput.value;
};