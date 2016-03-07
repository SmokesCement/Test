var app         = require('express')(),
    http        = require('http').Server(app),
    UUID        = require('node-uuid'),
    io          = require('socket.io')(http),
	MongoClient = require('mongodb').MongoClient,
	assert 		= require('assert');

app.get('/', function(req, res){
    res.sendFile(__dirname + "/index.html");
});
app.get('/jquery.js', function(req, res){
    res.sendFile(__dirname + "/lib/jquery.js");
});
app.get('/socket.io.js', function(req, res){
    res.sendFile(__dirname + "/lib/socket.io.js");
});

var url = 'mongodb://$OPENSHIFT_MONGODB_DB_HOST:$OPENSHIFT_MONGODB_DB_PORT/';
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");
  db.close();
});

http.listen(3000, function(){
    console.log('Listening on *:3000');
});