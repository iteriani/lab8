
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');

var sid = 'AC0656d1bf2627a49bc8bcc853629936ff';
var auth_token = 'f30c6a8697775dab747212043d550982';

var client = require('twilio')(sid, auth_token);

var client_number = '+19169434276';
var index = require('./routes/index');

// Example route
// var user = require('./routes/user');

var app = express();
var mongoose = require('mongoose');
mongoose.connect('mongodb://cantstopthe:bacon@kahana.mongohq.com:10081/BuddyWatch', function(err){
	if(err){console.log("NO CONNECT");}else{
		console.log("connected!");
	}
});

var userList = {};
/* id : {photo : null, amount : null}*/

var Message = mongoose.model("Recipt", {receiptURL : String, userID : String, amount : Number});


// all environments
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

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Add routes here
app.get('/', index.view);
app.get('/grid', index.viewGrid);
app.get('/message', function(req, res) {
	client.messages.create({
		body: 'cant stop the bacon',
		to: '+19168031223',
		from: client_number
	}, function(err, message) {
		console.log(message);
	});

	res.end();
});

app.post("/message", function(req,res){
	var data = req.body;
	console.log(data);
	var phoneNumber = data.From;
	if(userList[phoneNumber] === undefined){
		userList[phoneNumber] = {};
	}
	if(data.MediaUrl0){
		userList[phoneNumber].photo = data.MediaUrl0;
		console.log("set up photo for " + phoneNumber);
	}else{
		userList[phoneNumber].message = data.Body;
		console.log("set up message for " + phoneNumber);
	}
	console.log(userList[phoneNumber]);
	if(userList[phoneNumber].message != null && userList[phoneNumber].photo != null){
		console.log("SAVING MESSAGE")
		var amount = parseFloat(userList[phoneNumber].message);
		var message = new Message({receiptURL : userList[phoneNumber].photo, userID : phoneNumber, amount : amount});
		message.save(function(err,data){
			console.log("WHAT?")
			if(err){
				console.log("ERORR");
			}
			console.log(err,data);
		});
		delete userList[phoneNumber];
	};

	res.end();
})

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});



