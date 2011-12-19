/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')

var app = module.exports = express.createServer(),
	io = require('socket.io').listen(app)

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', routes.index);

io.sockets.on('connection', function (socket) {
	//Socket connection
	socket.join('room'); 
	socket.on('drawn', function (data) {
		console.log('emit this');
		io.sockets.to('room').except(socket.id).emit('draw', data);
	});
});

app.listen(1337);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
