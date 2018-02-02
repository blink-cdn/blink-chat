const HTTPS_PORT = 443;
const BREAK_TIME = 30000; // 60 seconds
const AUCTION_TIME = 120000; // 2 minutes
var NUM_BID_ITEMS = 10;

const nodeStatic = require('node-static');
const https = require('https');
const socketIO = require('socket.io');
const fs = require('fs');
const os = require('os');

/************  SERVER SETUP *************/

const certOptions = {
  key: fs.readFileSync('certs/key.pem'),
  cert: fs.readFileSync('certs/cert.pem')
}

var fileServer = new(nodeStatic.Server)();
var app = https.createServer(certOptions, function(req, res) {
  fileServer.serve(req, res);
}).listen(HTTPS_PORT);

var io = socketIO.listen(app);
console.log("Connected.");

io.sockets.on('connection', function(socket) {

  socket.on('connect to bid', function(userID, roomName) {
    setupBidUser(userID, roomName, socket);
  });

  socket.on('place bid', function(bid) {
    var roomName = bid.roomName;

    placeBid(roomName, bid, socket);
    addBidToUserLog(bid);
  });

});

/******* SETUP MAIN SERVER CONNECTION *********/

var io_client = require('socket.io-client');
var mySocket = io_client.connect("http://bid.blinkcdn.com");
mySocket.emit('connect service', "https://bidserver.blinkcdn.com", "bid");

mySocket.on('sync', function(rcvdUsers, rcvdRooms) {
  // See what new rooms are added
  var timersToSet = [];
  for (roomName in rcvdRooms) {
    if (!rooms[roomName]) {
      timersToSet.push(roomName);
      isRoomOnBreak[roomName] = false;
    }
  }

  // Update this server's info
  users = rcvdUsers;
  rooms = rcvdRooms;


  // Start auction timers
  timersToSet.forEach(function(roomName) {
    if (rooms[roomName].services.bid.hasStartedBid == false) {
      console.log("Starting", roomName, "auction timer");
      startAuctionTimer(roomName);
      rooms[roomName].services.bid.hasStartedBid = true;
      syncWithMain();
    }
  });

});

/******** OBJECTS ***********/

var rooms = {
  /* roomName: {
    name: "name", // Identifier of the room
    services: [], // Array of allowed services
    users: {}, // Dictionary of members allowed (for easy pulling)
    bid: {
      lots: [{
        itemName: "Mona Lisa",
        description: "Does it need a description?",
        itemImg: "img/items/monalisa.png"
        },
        {
        itemName: "Rolex Daytona 116500",
        description: "High end fancy watch.",
        itemImg: "img/items/rolex.png"
        }],
      currentLotNumber: 0,
      highestBid: 0,
      bidCount: 0,
      bids: [],
      isOnBreak: 0,
    }
  }, */
}

// var auctionTimers = {
//   // roomName: {
//   //   auctionTimer: null,
//   //   breakTimer: null,
//   // },
// }

var users = {};
var sockets = {
  uuid: "socket",
}

var mostRecentBids = [];
var currentTime = 0;
var timer;

var isRoomOnBreak = {
  "roomName": false,
}

/********* FUNCTIONS ************/

function placeBid(roomName, bid, socket) {

  if (!isRoomOnBreak[roomName]) {
    // Add/update user socket
    if (!sockets[bid.bidderID]) {
      sockets[bid.bidderID] = socket;
    }

    // Update Bid
    if(rooms.hasOwnProperty(roomName) && rooms[roomName].hasOwnProperty('services') && rooms[roomName].services.hasOwnProperty('bid')) {

      var bidRoom = rooms[roomName].services.bid;
      var bidder = rooms[roomName].users[bid.bidderID];

      // Add bid to the bids array
      if (bidRoom.bids) {
        bidRoom.bids.push(bid);
      } else {
        bidRoom.bids = [bid];
      }

      // Create the highest bid field if it doesn't exist
      if (!bidRoom.highestBid) {
        bidRoom.highestBid = 0;
      }

      // If this bid is the highest, update the highest bid & winner
      if (parseInt(bid.amount) > bidRoom.highestBid) {
        bidRoom.bidCount++;
        bidRoom.highestBid = parseInt(bid.amount);
        bidRoom.winner = bidder;
        mostRecentBids.unshift({'bid': bidRoom.highestBid, 'winner': bidRoom.winner});
      }

      rooms[roomName].services.bid = bidRoom;
      console.log("Bid", bid.amount, "from", bid.bidderID);

      syncWithMain();
      updateBidders(roomName);
    } else {
      console.log("Received bid for unknown room.");
    }
  }
}

function addBidToUserLog(bid) {
  var userID = bid.bidderID;
  bid.time = getDateTime();

  if (users.hasOwnProperty(userID)) {
    var user = users[userID];

    if (user.hasOwnProperty('bids')) {
      var bids = user.bids;
      bids.push(bid);
      user.bids = bids;
    } else {
      user.bids = [bid];
    }
  }

  syncWithMain();
}

// Update bidders with the most recent bid stats
function updateBidders(roomName) {

  if (rooms.hasOwnProperty(roomName) && rooms[roomName].hasOwnProperty('services') && rooms[roomName].services.hasOwnProperty('bid')) {

    var lot = rooms[roomName].services.bid;
    var bidViewers = rooms[roomName].users;

    // Send all bidders a bid update with the highest bid value and winner
    for (bidViewer in bidViewers) {
      if (sockets.hasOwnProperty(bidViewer)) {
        var socket = sockets[bidViewer];
        if (!lot.winner) {
          lot.winner = {
            'name': 'None'
          }
        }

        socket.emit('bid update', lot.highestBid, lot.winner, lot.bidCount);
      }
    }
  }
}

// Send info needed to setup bid to user
function setupBidUser(userID, roomName, socket) {

  sockets[userID] = socket;

  var topSixBids = []
  if (sockets.hasOwnProperty(userID)) {

    var socket = sockets[userID]
    topSixBids = getTopSixBids();

    if (rooms[roomName]) {
      setBidWinnerIfNull(roomName);
      var bidRoom = rooms[roomName].services.bid;

      var lots = bidRoom.lots;
      var lotNumberToSend = (bidRoom.currentLotNumber + 1) % NUM_BID_ITEMS;
      if (isRoomOnBreak[roomName]) {

        socket.emit('final bid', bidRoom.highestBid, bidRoom.winner, bidRoom.bidCount, bidRoom.lots[lotNumberToSend]);
      } else {
        lotNumberToSend = bidRoom.currentLotNumber % NUM_BID_ITEMS;
        socket.emit('new lot', bidRoom.lots[lotNumberToSend]);
        socket.emit('bid setup', getTopSixBids(), rooms[roomName].services.bid.bidCount);
      }
    }
  }

}

/******* TIMER FUNCTIONALITY **********/

function startAuctionTimer(roomName) {

  isRoomOnBreak[roomName] = false;
  currentTime = 0;

  timer = setInterval(function() {
    currentTime++;
    var timeLeft = (AUCTION_TIME / 1000) - currentTime;
    if (timeLeft > 0) {
      updateTimeToAllBidders(currentTime, isRoomOnBreak[roomName]);
    } else {
      console.log("Auction Timer Stopped");
      onEndOfAuction(roomName);
    }
  }, 1000);

}

function onEndOfAuction(roomName) {

  clearInterval(timer);
  var currentLotNumber = rooms[roomName].services.bid.currentLotNumber;

  for (bidViewer in rooms[roomName].users) {

    if (sockets.hasOwnProperty(bidViewer)) {
      var bidRoom = rooms[roomName].services.bid;
      if (!bidRoom.winner) {
        bidRoom.winner = {
          'name': 'None',
          'userID': '-1',
          'userImg': null
        }

        rooms[roomName].services.bid = bidRoom;
      }
      sockets[bidViewer].emit('final bid', bidRoom.highestBid, bidRoom.winner, bidRoom.bidCount, bidRoom.lots[(currentLotNumber+1)%NUM_BID_ITEMS]);
    }
  }

  syncWithMain();
  startBreakTimer(roomName);
}

function startBreakTimer(roomName) {

  currentTime = 0;
  isRoomOnBreak[roomName] = true;

  timer = setInterval(function() {
    currentTime++;
    var timeLeft = (BREAK_TIME / 1000) - currentTime;
    if (timeLeft > 0) {
      updateTimeToAllBidders(currentTime, isRoomOnBreak[roomName]);
    } else {
      console.log("Break stopped for", roomName);
      onEndOfBreak(roomName);
    }
  }, 1000);
}

function onEndOfBreak(roomName) {

  // Reset Room Stats
  rooms[roomName].services.bid.bids = [];
  rooms[roomName].services.bid.bidCount = 0;
  rooms[roomName].services.bid.highestBid = 0;
  rooms[roomName].services.winner = {name: "None", userID: "-1", userImg: null};
  rooms[roomName].services.bid.currentLotNumber++;
  mostRecentBids = [];
  syncWithMain();

  clearInterval(timer);
  var currentLotNumber = rooms[roomName].services.bid.currentLotNumber
  var bidRoom = rooms[roomName].services.bid;


  for (bidViewer in rooms[roomName].users) {
    if (sockets.hasOwnProperty(bidViewer)) {
      var socket = sockets[bidViewer];
      setBidWinnerIfNull(roomName);

      socket.emit('new lot', bidRoom.lots[currentLotNumber%NUM_BID_ITEMS]);
    }
  }

  console.log("Restarting timer for", roomName);
  startAuctionTimer(roomName);

}

function updateTimeToAllBidders(time, isOnBreak) {
  var timeLeft;

  if (isRoomOnBreak[roomName] == false) {
    timeLeft = (AUCTION_TIME / 1000) - currentTime;
  } else if (isRoomOnBreak[roomName] == true) {
    timeLeft = (BREAK_TIME / 1000) - currentTime;
  }

  for (userID in rooms[roomName].users) {
    if (sockets[userID]) {
      sockets[userID].emit('time update', timeLeft, isOnBreak);
    } else {
      console.log("Socket not found for:", userID);
    }

  }
}

/****** HELPER FUNCTIONS ******/

function setBidWinnerIfNull(roomName) {
  var bidRoom = rooms[roomName].services.bid;
  if (!bidRoom.winner) {
    bidRoom.winner = {
      'name': 'None',
      'userID': '-1',
      'userImg': 'none',
    }

    rooms[roomName].services.bid = bidRoom;
  }
}

function syncWithMain() {
 mySocket.emit('sync', users, rooms);
}

function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function getTopSixBids() {
  var topSixBids = []
  var numBidsToSend = 0;

  if (mostRecentBids.length > 5) {
    numBidsToSend = 5;
  } else {
    numBidsToSend = mostRecentBids.length;
  }

  for(var i = 0; i <= numBidsToSend; i++) {
    if (mostRecentBids[i]) {
      topSixBids.push(mostRecentBids[i]);
    }
  }

  return topSixBids;
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}
