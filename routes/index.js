exports.view = function(req, res){
	if(req.query['error']) {
		res.send(req.query['error']); 
	}  else {
		res.render('index');
	}
};

exports.viewGrid = function(req,res){
	res.render("index");
}