
/* GOOGLE STUFF */

function onSuccess(googleUser) {
  console.log('Logged in as: ' + googleUser.getBasicProfile().getName());
  var hostName = window.location.hostname;
  roomName = window.location.hash.substr(1);
  window.location.href = "https://" + hostName + '/courseview.html#' + roomName;
  }
function onFailure(error) {
  console.log(error);
}
function renderButton() {
  gapi.signin2.render('my-signin2', {
    'scope': 'profile email',
    'width': 240,
    'height': 50,
    'longtitle': true,
    'theme': 'dark',
    'onsuccess': onSuccess,
    'onfailure': onFailure
  });
}
