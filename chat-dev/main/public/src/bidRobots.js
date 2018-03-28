var  MIN_BID_INTERVAL = 500;
var  MAX_BID_INTERVAL = 5000;
var  NUM_ROBOTS = 5;

var robots = []; // Array of robot bidders; // GET 7 USER ROBOTS SET UP ON THIS ONE THING !!!!!!!!!!!!!!!
var imageNames = ["pig.png", "tiger.png", "lion.png", "duck.png", "troll.png"];
roomName = 'helloAdele'
var lastRobotToBid;

$(document).ready(function() {
  $('#startAuctionButton').click(function() {
    setupSocket();
  });
});

var lastBidValue = 0;
var placeBidTimer;
var isOnBreak = false;

//////////////////////
// ROBOT FUNCTIONS
//////////////////////

function getRobotWithId(robotID) {
  var hasFoundRobot = false;
  var ourRobot;
  for (var i = 0; i < robots.length; i++) {
    if (robots[i].userID == robotID && !hasFoundRobot) {
      ourRobot = robots[i];
      foundRobot = true;
      break;
    }
  }

  return {'robot': ourRobot, 'didFindRobot': hasFoundRobot};
}

function randomlyPlaceBid() {
  if (!isOnBreak) {
    var robotNumber = Math.floor(Math.random() * NUM_ROBOTS);

    if (robotNumber == lastRobotToBid) {
      randomlyPlaceBid();
    } else {
      lastRobotToBid = robotNumber
      var time = (Math.floor(Math.random() * MAX_BID_INTERVAL) + MIN_BID_INTERVAL);
      var nextBidValue = lastBidValue + 100;

      console.log(robotNumber, "will place bid of", nextBidValue, "in", time, "ms");
      placeBidTimer = setTimeout(function() {
        if (!isOnBreak) {
          var text = "<p>" + robotNumber + " placed a bid of " + nextBidValue + "</p>"
          printToScreen(text);
          bidEng.placeBid(robots[robotNumber], nextBidValue);
        }
      }, time);
    }
  }
};


function createRobots() {
  for (var i = 0; i < NUM_ROBOTS; i++) {
    robots[i] = {};
    robots[i].name = i.toString();
    robots[i].userImg = "img/" + imageNames[i];

    socket.emit('create user', robots[i], roomName);
  }

  clearTimeout(placeBidTimer);
  randomlyPlaceBid();
}

//////////////////
// OTHER FUNCTIONS
//////////////////

function setupSocket() {

  socket = io.connect();

  socket.on('created user', function(userID, userName) {
    var robotIndex = parseInt(userName);
    robots[robotIndex].userID = userID;

    // Send Join Bid System Message
    bidEng.onBidUpdate = updateHTML;
    socket.emit('join service', robots[robotIndex].userID, 'bid', roomName);

    bidEng.onFinalBidUpdate = onFinalBidUpdate;
    bidEng.onTimeUpdate = onTimeUpdate;
    bidEng.onNewLot = onNewLot;

    currentText = $('#robotInfoText').html();
    console.log(currentText);
  });

  socket.on('joined service', function(userID, serviceType, serviceAddress) {
    if (serviceType == 'bid') {
      bidEng.serviceAddress = serviceAddress;
      bidEng.setupService();
      bidEng.socket.emit('connect to bid', userID, roomName);
    }
  });

  createRobots();
}

function updateHTML() {
  // Send Join Bid System Message
  bidEng.onBidUpdate = function(highestBid, winner, bidCount) {
    console.log("Bid Update:", highestBid, winner, bidCount);
    if (highestBid > lastBidValue) {
      lastBidValue = highestBid;
      clearTimeout(placeBidTimer);
      randomlyPlaceBid();
    }
  };
}

function onFinalBidUpdate() {
  lastBidValue = 0;
  isOnBreak = true;
  clearTimeout(placeBidTimer);
  printToScreen("Final Bid received");
}

function onTimeUpdate(timeLeft) {
  // Do something with time update;
}

function onNewLot() {
  clearTimeout(placeBidTimer);
  randomlyPlaceBid();
  isOnBreak = false;
  printToScreen("New Lot");
}

function printToScreen(text) {
  var currentText = $('#robotInfoText').html();
  $('#robotInfoText').html(function() {
    return currentText + text;
  });
}


/* BIDENG */

// BidEng Object
var bidEng = {
  // Properties
  socket: null,
  serviceAddress: null,
  // Functions
  onBidUpdate: null,
}

bidEng.setupService = function(robot) {
  bidEng.socket = io.connect(bidEng.serviceAddress);
  console.log("Connected to BidEng Server", bidEng.serviceAddress);

  bidEng.socket.on('bid update', function(highestBid, winner, bidCount) {
    bidEng.onBidUpdate(highestBid, winner, bidCount);
  });

  bidEng.socket.on('bid setup', function(mostRecentBids, bidCount) {
    console.log("Got setup");
    for(var i = 0; i < mostRecentBids.length; i++) {
      bidEng.onBidUpdate(mostRecentBids[i].bid, mostRecentBids[i].winner, bidCount);
    }
  });

  bidEng.socket.on('final bid', function() {
    bidEng.onFinalBidUpdate();
  });

  bidEng.socket.on('new lot', function() {
    bidEng.onNewLot();
  });
}

bidEng.placeBid = function(robot, bidValue) {

  var bid = {
    roomName: roomName,
    bidderID: robot.userID,
    amount: bidValue
  };

  bidEng.socket.emit('place bid', bid);
}
