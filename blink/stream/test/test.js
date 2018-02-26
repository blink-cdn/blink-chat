var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var streamRooms = 2;
MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var query = {stream_Room: streamRooms};
    dbo.collection("stream").find(query).toArray(function (err, result) {
        if (err) throw err;
        console.log(result);
        db.close();
    });
});