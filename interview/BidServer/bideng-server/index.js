
module.exports.init = init;
/******** OBJECTS ***********/
/*
  items = {
    'item name': {
        name: 'item name',
        winner: bidder,
        highestBid: bid,
        description: 'item description',
        startingPrice: 100,
        bidders: {
          'userID': {bidder}
          },
        bids: [<array of bids>],
      }
  }

  bidder = {
    userID: 'abc'
    name: 'full name',
    email: 'email@address.com',
    socket: socket
  }

  bid = {
      item: 'item',
      bidderID: userID,
      amount: 150
  }

*/
var io;

function init(input_io) {
  io = input_io;

  io.sockets.on('connection', function(socket) {

    socket.on('place bid', function(rcvdBid) {
      var bid = JSON.parse(rcvdBid);
      var itemName = bid.item;

      placeBid(itemName, bid);
      updateBidders(itemName);
    });

    socket.on('join system', function(user, itemName) {
      createUser(user, itemName, socket);
    });

  });
}

var sockets = {};
var users = {};

var items = {
  'item': {
    name: 'item',
    description: 'A random item to be auctioned off',
    startingPrice: 100,
    highestBid: 0,
    bidders: {}
  }
};

/********* FUNCTIONS ************/

// Post a bid to the most recent item
function placeBid(itemName, bid) {

  if(items[itemName]) {
    var item = items[itemName];
    var bidder = users[bid.bidderID]

    // Add bid to the bids array
    if (item.bids) {
      item.bids.push(bid);
    } else {
      item.bids = [bid];
    }

    // If this bid is the highest, update the highest bid & winner
    console.log("Checking", bid.amount, item.highestBid, bid.amount > item.highestBid);
    if (parseInt(bid.amount) > item.highestBid) {
      item.highestBid = parseInt(bid.amount);
      item.winner = bidder;
    }

    items[itemName] = item;
    console.log("Bid", bid.amount, "from", bid.bidderID);
  }
}

// Update bidders with the most recent bid stats
function updateBidders(itemName) {

  if (items[itemName]) {
    var item = items[itemName];
    var bidders = item.bidders;

    // Send all bidders a bid update with the highest bid value and winner
    for (bidder in bidders) {
      var socket = sockets[bidder];
      if (!item.winner) {
        item.winner = {
          'name': 'None'
        }
      }
      socket.emit('bid update', item.highestBid, JSON.stringify(item.winner));
    }
  }
}

// Create user for system
function createUser(rcvdUser, itemName, socket) {
  var user = JSON.parse(rcvdUser);
  var item = items[itemName];

  var newUser = {
    userID: uuid(),
    name: user.name,
    email: user.email
  }

  // Add the bidder to the bidders array if they aren't there already
  if (!item.bidders[newUser.userID]) {
    item.bidders[newUser.userID] = newUser;
  }

  items[itemName] = item;

  // Add user to the array of users
  sockets[newUser.userID] = socket;
  users[newUser.userID] = newUser;

  socket.emit('created user', newUser.userID);
  console.log("Created user:", user.name, sockets[newUser.userID].id);

  updateBidders(itemName);
}


/****** HELPER FUNCTIONS ******/

function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
