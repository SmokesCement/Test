var app         = require('express')(),
    http        = require('http').Server(app),
    UUID        = require('node-uuid'),
    io          = require('socket.io')(http),
    database    = require('./database.json'),
    fs          = require('fs'),
    ROT         = require('rot-js/lib/rot');

app.get('/', function(req, res){
    res.sendFile(__dirname + "/index.html");
});
app.get('/jquery.js', function(req, res){
    res.sendFile(__dirname + "/lib/jquery.js");
});
app.get('/socket.io.js', function(req, res){
    res.sendFile(__dirname + "/lib/socket.io.js");
});
app.get('/md5.js', function(req, res){
    res.sendFile(__dirname + "/lib/md5.js");
});
app.get('/rot.js', function(req, res){
    res.sendFile(__dirname + "/lib/rot.js");
});

port = process.env.PORT || 80;

//--- game ---

var seed = -1;
var freeCells = [];

var Main = {};

Main._init = function() {
    ROT.RNG.setSeed(0);
    
    seed = ROT.RNG.getSeed();
    
    this._generateMap();
}

Main.map = {};
Main._generateMap = function() {
    var digger = new ROT.Map.Digger();
    
    var digCallback = function(x, y, value) {
        if (value) { return; } /* do not store walls */
        
        var key = x + "," + y;
        freeCells.push(key);
        this.map[key] = ".";
    }
    digger.create(digCallback.bind(this));
}

Main._init();

//------------

//-- socket --

//Retrieve User from Database
var getUser = function(username) {
    var user = database[username];
    
    return user;
}

//Store the database in an external .json file
var saveDatabase = function() {
    fs.writeFile('database.json', JSON.stringify(database), 'utf8', function (err) {
        if (err) return console.log(err);
    });
}

//List of authenticated users, linked by userid to a user from the database
var authenticatedUserlist = {};

//On connection...
io.on('connection', function(socket) {
    //Assign a userid
    socket.userid = UUID();
    
    console.log("connected userid", socket.userid);
    
    //On login message from client
    socket.on('login', function(data) {
        var username = data.username;
        var password = data.password;
        
        console.log("login userid", socket.userid, username, password);
        
        //Retrieve authenticated User
        var user = authenticatedUserlist[socket.userid];
        
        //Check if authenticated
        var validUser = (!!user);
        
        //If invalid try to authenticate
        if (!validUser) {
            console.log("login");
            
            console.log(password);
            user = getUser(username);
            
            validUser = (!!user);
            
            if (!validUser) {
                console.log("username not found");
                
                socket.emit('login', {authorised : false});
            } else {
                if (password == user.password) {
                    authenticatedUserlist[socket.userid] = user;
                    
                    console.log("logged in");
                    
                    socket.emit('login', {authorised : true});
                } else {
                    console.log("incorrect password");
                    
                    socket.emit('login', {authorised : false});
                }
            }
        } else {
            //Already logged in!
            console.log("logged in");
            
            socket.emit('login', {authorised : true});
        }
    });
    
    socket.on('seed', function() {
        //Retrieve authenticated User
        var user = authenticatedUserlist[socket.userid];
        
        //Check if authenticated
        var validUser = (!!user);
        
        //If valid send seed
        if (validUser) {
            socket.emit('seed', {seed: seed});
			
			if (user._x == -1 || user.y == -1) {
				var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
				var key = freeCells.splice(index, 1)[0];
				var parts = key.split(",");
				user._x = parseInt(parts[0]);
				user._y = parseInt(parts[1]);
			}
			
			for (var i in authenticatedUserlist) {
				if (i != socket.userid) {
					var userlist = authenticatedUserlist[i];
					
					socket.emit('move', {_name: userlist._name, _x: userlist._x, _y: userlist._y, _char: "@", _col: "#f00"});
				}
			}
			
			socket.broadcast.emit('move', {_name: user._name, _x: user._x, _y: user._y, _char: "@", _col: "#f00"});
			
			socket.emit('move', {_name: user._name, _x: user._x, _y: user._y, _char: "@", _col: "#ff0"});
        }
    });
    
    socket.on('move', function(data) {
        //Retrieve authenticated User
        var user = authenticatedUserlist[socket.userid];
        
        //Check if authenticated
        var validUser = (!!user);
        
        //If valid send move
        if (validUser) {
            var dir = data.dir;
            
            var diff = ROT.DIRS[8][dir];
            var newX = user._x + diff[0];
            var newY = user._y + diff[1];
            
            var newKey = newX + "," + newY;
            if (newKey in Main.map) {           
                user._x = newX;
                user._y = newY;
            }
            
			socket.broadcast.emit('move', {_name: user._name, _x: user._x, _y: user._y, _char: "@", _col: "#f00"});
			
			socket.emit('move', {_name: user._name, _x: user._x, _y: user._y, _char: "@", _col: "#ff0"});
        }
    });
});

http.listen(port, function(){
    console.log('listening on ' + port);
});
