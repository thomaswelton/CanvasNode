/*
 * GET home page.
 */

exports.index = function(req, res){
	res.render('index', { 	title: 'Canvas Play',
							colors: ['#ffffff','#FF0000','#00FFFF','#0000FF','#0000A0','#FF0080','#800080','#FFFF00','#00FF00','#FF00FF']
			})
};