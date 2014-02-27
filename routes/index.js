var projects = require('../projects.json');

/*
 * GET home page.
 */

exports.view = function(req, res){
	projects.normal = true;
	console.log(projects);
  	res.render('index', projects);
};

exports.viewGrid = function(req,res){
	projects.normal=false;
	res.render("index", projects);
}