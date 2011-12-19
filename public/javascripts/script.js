var socket = io.connect('http://localhost:1337/');

var Canvas = new Class({
	Implements: [Options, Events],
	options: {
		
	},
	initialize: function(el,options){
		this.options.brushWidth = 6;
		this.setOptions(options);
		
		this.canvasEl 	= el;
		this.ctx		= this.canvasEl.getContext('2d');
		this.ctx.canvas.width = this.canvasEl.getWidth();
		this.ctx.canvas.height = this.canvasEl.getHeight();
		
		this.setColor('#ffffff');
		
	},
	getPosition: function(e){
		var canvasPosition = this.canvasEl.getCoordinates();
		return ({ x : e.page.x - canvasPosition.left, y: e.page.y - canvasPosition.top });	
	},
	getImage: function(){
		var imageData = this.canvasEl.toDataURL('image/png');
		window.open (imageData,"Drawing","menubar=0,resizable=0,location=0,scrollbars=0,replace=true,width="+this.ctx.canvas.width+",height="+this.ctx.canvas.height);
	},
	setColor: function(color){
		this.color 				= color;
		this.ctx.fillStyle 		= color;
		this.ctx.strokeStyle	= color;
	},
	clear: function(){
		this.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
	},
	freeDraw: function(position){	
		var x1 = position.x - (Math.ceil(this.options.brushWidth / 2));
		var y1 = position.y - (Math.ceil(this.options.brushWidth / 2));
		
		this.ctx.fillRect(x1, y1, this.options.brushWidth, this.options.brushWidth);
		
		this.ctx.lineWidth = this.options.brushWidth; 
		this.ctx.beginPath();  
		this.ctx.moveTo(position.x,position.y);
		
		this.boundDrag = this.freeDrawDrag.bind(this);
		this.canvasEl.addEvent('mousemove', this.boundDrag);
	},
	freeDrawDrag: function(e){
		var position = this.getPosition(e);
		this.freeDrawDragDraw(position);
		socket.emit('drawn', { method: 'freeDrawDragDraw', arguments: [position], color: this.color });
	},
	freeDrawDragDraw: function(position){
		this.ctx.lineTo(position.x,position.y); 
		this.ctx.stroke();
	},
	closeFreeDraw: function(){
		this.ctx.closePath();
		this.canvasEl.removeEvent('mousemove', this.boundDrag);		
	}
});


var canvas;
window.addEvent('domready',function(){
	canvas = new Canvas($('canvas'),{'drawTool':'pencil'});
	
	canvas.canvasEl.addEvent('mousedown',function(e){
		var position = canvas.getPosition(e);
		canvas.freeDraw(position);
		socket.emit('drawn', { method: 'freeDraw', arguments: [position], color: this.color });
	});
	
	document.body.addEvent('mouseup',function(e){
		//remove the bound free draw function
		canvas.closeFreeDraw();
		canvas.canvasEl.removeEvent('mousemove', canvas.freeDrawDrag);	
		
		socket.emit('drawn', { method: 'closeFreeDraw', arguments: [null], color: this.color });
	});
	canvas.canvasEl.addEvent('mouseout',function(e){
		//remove the bound free draw function
		canvas.closeFreeDraw();
		socket.emit('drawn', { method: 'closeFreeDraw', arguments: [null], color: this.color });
	});
	
	//Setup color pickers
	$$('.canvas-color-picker').each(function(el){
		el.addEvent('click',function(e){
			new Event(e).stop();
			canvas.setColor(el.getStyle('background-color'));	
			
			socket.emit('drawn', { method: 'setColor', arguments: [canvas.color] });
		});
	});
	
	//Evenet handler for get image
	$('getCanvasImage').addEvent('click',function(){
		canvas.getImage();
	});
	
	$('clearCanvas').addEvent('click',function(){
		canvas.clear();	
	});
	
	
	
	//Socket goodness
	socket.on('draw', function (data) {
		if(typeof(canvas[data.method]) == 'function'){
			if(typeof(data.color) != 'undefined'){
				canvas.setColor(data.color);
			}
			canvas[data.method](data.arguments[0]);
		}
	});
	
	
});