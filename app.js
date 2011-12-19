/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')

var app = module.exports = express.createServer(),
	io = require('socket.io').listen(app)
	
io.set('log level', 1);

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
	io.set('log level', 1);
  	app.use(express.errorHandler()); 
});

// Routes

app.get('/', routes.index);

var canvi = [];

io.sockets.on('connection', function (socket) {
	//Socket connection
	socket.join('room');
	
	socket.emit('startCanvas', { image: canvi['room'] });
	
	socket.on('drawn', function (data) {
		data.id = socket.id;
		io.sockets.to('room').except(socket.id).emit('draw', data);
	});
	
	socket.on('updateCanvas', function (data) {
		canvi['room'] = data;
	});	
	
});

app.listen(1337);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
