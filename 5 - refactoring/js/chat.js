function join() {
  var roomNameBox = document.getElementById("roomNameBox");
  var roomName = roomNameBox.value;
  var hostName = window.location.hostname;
  console.log(hostName); 
  window.location.href = "https://" + hostName + "/chatpage.html#" + roomName;

}
