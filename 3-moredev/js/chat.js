function join() {
  var roomNameBox = document.getElementById("roomNameBox");
  var roomName = roomNameBox.value;
  
  window.location.href = "https://34.210.247.50:3000/chatpage.html#" + roomName;

}
