// BidEng Object
var bidEng = {
  // Properties
  socket: null,
  serviceAddress: null,
  // Functions
  onBidUpdate: null,
  onFinalBidUpdate: null,
  onNewLot: null,
  onTimeUpdate: null
}

bidEng.setupService = function() {
  bidEng.socket = io.connect(bidEng.serviceAddress);
  console.log("Connected to BidEng Server", bidEng.serviceAddress);

  bidEng.socket.on('bid update', function(highestBid, winner, bidCount) {
    console.log("Bid Update:", highestBid, winner, bidCount);
    bidEng.onBidUpdate(highestBid, winner, bidCount);
  });

  bidEng.socket.on('bid setup', function(mostRecentBids, bidCount) {
    console.log("Got setup");
    for(var i = mostRecentBids.length-1; i >= 0; i--) {
      bidEng.onBidUpdate(mostRecentBids[i].bid, mostRecentBids[i].winner, bidCount);
    }
  });

  bidEng.socket.on('final bid', function(highestBid, bidWinner, bidCount, lot) {
    bidEng.onFinalBidUpdate(highestBid, bidWinner, bidCount, lot);
  });

  bidEng.socket.on('new lot', function(lot) {
    bidEng.onNewLot(lot);
  });

  bidEng.socket.on('time update', function(timeLeft, isOnBreak) {
    bidEng.onTimeUpdate(timeLeft, isOnBreak);
  });

  bidEng.socket.emit('connect to bid', user.userID, roomName);
}

bidEng.placeBid = function(bidValue) {
  console.log("Bidding:", bidValue);

  var bid = {
    roomName: roomName,
    bidderID: user.userID,
    amount: bidValue
  };

  bidEng.socket.emit('place bid', bid);
}
