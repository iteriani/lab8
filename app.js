
/**
 * Module dependencies.
 */

var express = require('express');
var app = express();
var path = require('path');
var handlebars = require('express3-handlebars');
var http = require('http');

var request = require('request');

var sid = 'AC0656d1bf2627a49bc8bcc853629936ff';
var auth_token = 'f30c6a8697775dab747212043d550982';

var client = require('twilio')(sid, auth_token);

var client_number = '+19169434276';
var index = require('./routes/index');
var access_token;

app.set('port', process.env.PORT || 8000);
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', handlebars());
app.set('view engine', 'handlebars');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('Intro HCI secret key'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var login = require('./routes/login'); 
// Example route
// var user = require('./routes/user');



var io = require('socket.io')(server);

var mongoose = require('mongoose');
mongoose.connect('mongodb://cantstopthe:bacon@kahana.mongohq.com:10081/BuddyWatch', function(err){
	if(err){console.log("NO CONNECT");}else{
		console.log("connected!");
	}
});

var userList = {};
/* id : {photo : null, amount : null}*/

var Schema = mongoose.Schema; 
/*
 * Schemas 
 */ 
var accSchema = new Schema({
    phoneNumber: Number, 
    account: String,     
    password: String,
}); 

var receiptSchema = new Schema({
    receiptURL : String, 
    userID : String, 
    amount : Number, 
    verified : Boolean, 
    date : Date, 
    archived : Boolean
}); 

/*
 *  Model definitions 
 */ 
var Message = mongoose.model("Recipt", receiptSchema, "recipts"); 
var phoneNumbers = mongoose.model("User", accSchema, "phoneNumbers"); 


// all environments

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Add routes here
app.get('/', function(req, res) {
	if(req.session.user){
		res.render("index");
	}else{
		res.render("login");
	}
});
app.get('/login', login.view); 
//get rceipt via phone number
app.get("/message/:phone", function(req,res){
	console.log(req.params);
	Message.find({userID : "+" + req.params.phone}, function(err,data){
		res.json(data)
	})
});

app.get('/pay', function(req, res) {
	
});

//get the user by phone number
app.get("/user/:phone", function(req,res){    
    phoneNumbers.find({phoneNumber : req.params.phone}, function(err, data){
        console.log(data); 
        res.json(data)
    }); 
}); 

//get the user by acc name
app.get("/account/:name", function(req,res){    
    phoneNumbers.find({account : req.params.name}, function(err, data){
        console.log(data); 
        res.json(data)
    }); 
}); 

app.get('/url', function(req, res) {
	res.send(req.query['venmo_challenge']);
}); 

//login stuff and validation
app.post("/login", function(req, res){    
    validateLogin(req, res);    
}); 

var validateLogin  = function(req, res){
    var fields = req.body;     
    var username = req.body.users; 
    console.log(username); 
    phoneNumbers.findOne({account : username}, function(err, user){   
        if(user.password == fields.password)
        {
        	req.session.user = user;
        }    
        res.end(); 
    });     
}

app.post("/message", function(req,res){
	var data = req.body;
	res.end();
	var phoneNumber = data.From;
	if(userList[phoneNumber] === undefined){
		userList[phoneNumber] = {};
	}  
	if(data.MediaUrl0){
		io.emit('update', { message: 'image', phoneNumber : phoneNumber, imageLink : data.MediaUrl0});
		userList[phoneNumber].photo = data.MediaUrl0;
		console.log("set up photo for " + phoneNumber);
	}else{
		io.emit('update', { message : 'message', phoneNumber : phoneNumber, amount: data.Body });
		userList[phoneNumber].message = data.Body;
		console.log("set up message for " + phoneNumber);
	}
	console.log(userList[phoneNumber]);
	if(userList[phoneNumber].message != null && userList[phoneNumber].photo != null){
		io.emit('update', { message : 'processing', phoneNumber: phoneNumber, imageLink : userList[phoneNumber].photo, amount: userList[phoneNumber].message });
		console.log("SAVING MESSAGE")
		var amount = parseFloat(userList[phoneNumber].message);
		var item = {receiptURL : userList[phoneNumber].photo, userID : phoneNumber, amount : amount, date: new Date(), archived : false};
		request.get("https://api.idolondemand.com/1/api/sync/ocrdocument/v1?url=" 
				+ userList[phoneNumber].photo + "&mode=document_photo&apikey=826d038b-afde-4f31-a447-a56ae91859f2",
			function(error,response, body){
				body = JSON.parse(body);
				var data = body.text_block[0].text.replace(/\s+/g, '');
				console.log(data);
				if(data.indexOf(userList[phoneNumber].message)>=0){
					item.verified = true;
					console.log("VERIFIED");
				}else{
					item.verified = false;
					console.log("NOT VERIFIED");
				}
				io.emit('item', item);
				var message = new Message(item);
				console.log(message);
				message.save(function(err,data){
					if(err){
						console.log("ERORR");
					}else{
						console.log("item saved!");
						io.emit('update', {message : 'done', phoneNumber : phoneNumber});
						delete userList[phoneNumber];		
					}
				});	
		});

	};
});

app.post('/toggleVerified', function(req, res) {
	Message.findOne({ _id : req.body['_id']}, function(err, data) {
		if(err) {
			console.log(err);
		} else {
			data.verified = req.body.verified;
			data.save();
		}
	});
	res.end();
})


app.post('/toggleArchived', function(req, res) {
	Message.findOne({ _id : req.body['_id']}, function(err, data) {
		if(err) {
			console.log(err);
		} else {
			data.archived = req.body.archived;
			data.save();
		}
	});
	res.end();
})
/*

*/


io.on('connection', function(socket) {
	console.log('connected');
})
