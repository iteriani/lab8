
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var handlebars = require('express3-handlebars');


var request = require('request');

var sid = 'AC0656d1bf2627a49bc8bcc853629936ff';
var auth_token = 'f30c6a8697775dab747212043d550982';

var client = require('twilio')(sid, auth_token);

var client_number = '+19169434276';
var index = require('./routes/index');
var access_token;

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

var Schema = mongoose.Schema; 
/*
 * Schemas 
 */ 
var accSchema = new Schema({
    phoneNumber: String, account: String, amount: Number
}); 
var parentsSchema = new Schema({
    name: String
});  
var receiptSchema = new Schema({
    receiptURL : String, userID : String, amount : Number, verified : String, date : Date
}); 

/*
 *  Model definitions 
 */ 
var Message = mongoose.model("Recipt", receiptSchema);
var phoneNumbers = mongoose.model("User", accSchema); 
var parents = mongoose.model("Parents", parentsSchema); 


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
app.get('/', function(req, res) {
	if(req.query['error']) {
		res.send(req.query['error']); 
	}  else {
		access_token = req.query['access_token'];
		res.render('index');
	}
});

app.get("/message/:phone", function(req,res){
	console.log(req.params);
	Message.find({userID : "+" + req.params.phone}, function(err,data){
		data.forEach(function(elem){
			console.log(elem);
			if(elem.verified == 't'){
				elem.verified = true;
			}else{
				elem.verified = false;
			}
		})
		res.json(data)
	})
});

app.get('/pay', function(req, res) {
	
});

app.get('/url', function(req, res) {
	res.send(req.query['venmo_challenge']);
});

app.post("/message", function(req,res){
	var data = req.body;
	res.end();
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
		var item = {receiptURL : userList[phoneNumber].photo, userID : phoneNumber, amount : amount, date: new Date()};
		request.get("https://api.idolondemand.com/1/api/sync/ocrdocument/v1?url=" 
				+ userList[phoneNumber].photo + "&mode=document_photo&apikey=826d038b-afde-4f31-a447-a56ae91859f2",
			function(error,response, body){
				body = JSON.parse(body);
				var data = body.text_block[0].text.replace(/\s+/g, '');
				console.log(data);
				if(data.indexOf(userList[phoneNumber].message)>=0){
					item.verified = "t";
					console.log("VERIFIED");
				}else{
					item.verified = "f";
					console.log("NOT VERIFIED");
				}
				var message = new Message(item);
				console.log(message);
				message.save(function(err,data){
					if(err){
						console.log("ERORR");
					}else{
						console.log("item saved!");
						delete userList[phoneNumber];		
					}
				});	
		});

	};
});
/*

*/


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


