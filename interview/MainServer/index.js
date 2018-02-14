const HTTPS_PORT = 8443;
const HTTP_PORT = 8080;
// const HTTPS_PORT = 443;
// const HTTP_PORT = 80;

const nodeStatic = require('node-static');
const https = require('https');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const express = require('express');

const sendmail = require('mailgun-js')({ apiKey: 'key-77c21daa1f20d642d9982baa2479c4c6', domain: 'mg.blinkcdn.com' });
// const sendmail = require('sendmail')({silent: true});

// MONGOdb
var MongoClient = require('mongodb').MongoClient;
var mongodb = undefined;
MongoClient.connect("mongodb://localhost:27017", function(err, db) {
    if (err) {
        console.log("Mongo Err:", err);
    }
    console.log("Databsae connected.");

    mongodb = db.db("blinkDB");
});

// Data Structures

let users = {
    // uuid: {}
};

let sockets = {};
let services = {
    bid: {
        address: null,
        socket: null,
    },
    stream: {
        address: null,
        socket: null
    }
};

let rooms = {
    // roomName: {
    //   name: "name", // Identifier of the room
    //   services: [], // Array of allowed services
    //   users: {} // Dictionary of members allowed (for easy pulling)
    // },
};


/************ SERVER SETUP *************/

const certOptions = {
    key: fs.readFileSync('public/certs/key.pem'),
    cert: fs.readFileSync('public/certs/cert.pem')
};

let app = express();
let httpsServer = https.Server(certOptions, app);
httpsServer.listen(HTTPS_PORT);

app.use(express.static('public'));

let io = socketIO.listen(httpsServer);


// let fileServer = new(nodeStatic.Server)();
// let app = https.createServer(certOptions, function(req, res) {
//     fileServer.serve(req, res);
// }).listen(HTTPS_PORT);
// let io = socketIO.listen(app);

io.sockets.on('connection', function(socket) {

    socket.on('create user', function(user, roomName) {
        createUser(user, roomName, socket);
    });

    socket.on('join service', function(userID, serviceType, roomName) {
        setupService(userID, serviceType, roomName, socket);
        console.log("Joined System.", roomName);
    });

    socket.on('place bid', function(bidValue) {
        console.log(bidValue);
    });

    socket.on('send invite', function(name, email, link) {
        console.log("Got it");
        const message = {
            from: 'BlinkCDN <do_not_reply@blinkcdn.com>',
            to: name + ' <' + email + '>',
            // replyTo: 'do_not_reply@blinkcdn.com',
            subject: "You've been invited to BlinkChat!",
            text: 'The Stevens ECE department has invited you to BlinkChat! \nTo join the chat, visit ' + link
        };

        sendmail.messages().send(message, function (err, reply) {
            // if (err !== null) {
                console.log("Err:", err);
            // }
        });
    });

});



/************ SERVICES SERVER SETUP *************/

let httpServer = http.Server(app);
httpServer.listen(HTTP_PORT);
let serviceIo = socketIO.listen(httpServer);

// let serviceFileServer = new(nodeStatic.Server)();
// let serviceApp = http.createServer(function(req, res) {
//     serviceFileServer.serve(req, res);
// }).listen(HTTP_PORT);
// let serviceIo = socketIO.listen(serviceApp);

serviceIo.sockets.on('connection', function(socket) {

    socket.on('connect service', function(serviceAddress, serviceType) {
        services[serviceType].address = serviceAddress;
        services[serviceType].socket = socket;
        console.log("Connected Service:", serviceType, serviceAddress);
        syncUpdateService(serviceType);
    });

    socket.on('sync user request', function() {
        socket.emit('sync', users, rooms);
    });

    socket.on('sync', function(rcvdUsers, rcvdRooms) {
        users = rcvdUsers;
        rooms = rcvdRooms;
        updateAllServices();
    });
});

console.log("Connected.");



/******** FUNCTIONS *********/

function createUser(user, roomName, socket) {
    let newUser = {
        userID: uuid(),
        name: user.name,
        userImg: user.userImg
    };

    // Add user to the array of users
    sockets[newUser.userID] = socket;
    users[newUser.userID] = newUser;

    // Add user to room
    if(!rooms[roomName]) {
        rooms[roomName] = {
            users: {},
        };

        rooms[roomName].roomName = roomName;
        rooms[roomName].users[newUser.userID] = newUser
    } else {
        rooms[roomName].users[newUser.userID] = newUser;
    }

    socket.emit('created user', newUser.userID, newUser.name);
}

// Create user for system
function setupService(userID, serviceType, roomName, socket) {

    // Set the proper server address
    let serviceAddress;

    // Add service structure
    if (!rooms[roomName].hasOwnProperty('services')) {
        rooms[roomName].services = {};
    }

    if (!rooms[roomName].services.hasOwnProperty(serviceType)) {
        rooms[roomName].services[serviceType] = createService(serviceType);
    }

    if (services[serviceType]) {
        serviceAddress = services[serviceType].address;
        socket.emit('joined service', userID, serviceType, serviceAddress);
        console.log("Joined service:", userID, serviceType, serviceAddress);
    } else {
        console.log("Service to setup not found.");
    }

    syncUpdateService(serviceType);
}

function syncUpdateService(serviceType) {
    mongodb.collection("blink-main-rooms").insertOne({room: rooms});
    console.log(mongodb.collection("blink-main-rooms").find().sort({_id: 1}));

    if(services[serviceType].socket) {
        services[serviceType].socket.emit('sync', users, rooms);
    } else {
        console.log("Failed to update service. Please check service type:", serviceType);
    }
}

function updateAllServices() {
    for (service in services) {
        syncUpdateService(service);
    }

    mongodb.collection("blink-main-rooms").insertOne({room: rooms});
    mongodb.collection("blink-main-rooms").find({}, function(err, result) {
        console.log(result);
    });
}


/****** HELPER FUNCTIONS ******/

function createService(serviceType) {

    if (serviceType == "bid") {
        return {
            lots: [{
                itemName: "Mona Lisa",
                description: "Does it need a description?",
                itemImg: "items/monalisa.jpg"
            },
                {
                    itemName: "Rolex Daytona 116500",
                    description: "High end fancy watch.",
                    itemImg: "items/rolex.jpg"
                },
                {
                    itemName: "The Raj Pink",
                    description: "The World's Largest known Fancy Intense Pink Diamond",
                    itemImg: "items/pinkDiamond.png"
                },
                {
                    itemName: "Moussaieff Blue Diamond Ring",
                    description: "Superb and exceptional fancy vivid blue diamond ring",
                    itemImg: "items/blueDiamond.png"
                },
                {
                    itemName: "Audemars Piguet",
                    description: "A LIMITED EDITION SKELETONIZED PLATINUM AUTOMATIC WRISTWATCH WITH DATE REF 15203PT.OO.1240PT.01 MVT 822702 CASE H59883 NO 25/40 ROYAL OAK 40TH ANNIVERSARY CIRCA 2012",
                    itemImg: "items/ap.png"
                },
                {
                    itemName: "Jaeger-LeCoultre",
                    description: "A LIMITED EDITION PLATINUM RECTANGULAR REVERSIBLE SKELETONIZED WRISTWATCH REF 270.6.49 NO 51/500 REVERSO PLATINUM NUMBER ONE CIRCA 2001",
                    itemImg: "items/jWatch.png"
                },
                {
                    itemName: "CESARE TACCHI | Come è liscia la tua pelle",
                    description: "Signed, titled and dated 1965 on the reverse, ink on padded fabric nails on board",
                    itemImg: "items/paint1.jpg"
                },
                {
                    itemName: "ANDY WARHOL | Onion Soup from Campbell's Soup",
                    description: "Signed and numbered 165/250 on the reverse, silkscreen on paper, executed in 1969",
                    itemImg: "items/paint2.jpg"
                },
                {
                    itemName: "ROBERTO CRIPPA | Insetto",
                    description: "Iron, executed in the Fifites",
                    itemImg: "items/sculpt1.jpg"
                },
                {
                    itemName: "MARIO SCHIFANO | Gigli d'acqua per terra",
                    description: "Handmade senneh knots wool carpe realized by Bosmann manifacture, executed in 1984",
                    itemImg: "items/carpet1.jpg"
                },
            ],
            currentLotNumber: 0,
            highestBid: 0,
            bidCount: 0,
            bids: [],
            hasStartedBid: false,
        }
    }

}

function uuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

// function stringToLink(string) {
//     var returnString = "";
//
//     for (i in string) {
//         if (string[i] == " ") {
//             returnString += "_";
//         } else {
//             returnString += string[i];
//         }
//     }
//
//     return returnString;
// };

/******** MONGO ********/

