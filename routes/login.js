exports.view = function(req, res){
    res.send(req.session.user); 
  	res.render('login');
};