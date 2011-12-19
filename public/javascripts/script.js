var socket = io.connect(window.location.origin);

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
		
		this.setColor('#000000');
		
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
	drawPoint: function(position){	
		var x1 = position.x - (Math.ceil(this.options.brushWidth / 2));
		var y1 = position.y - (Math.ceil(this.options.brushWidth / 2));
		
		this.ctx.fillRect(x1, y1, this.options.brushWidth, this.options.brushWidth);
		
		//console.log('pointDrawn');
		//socket.emit('drawn', { method: 'freeDraw', arguments: [position], color: this.color });
	},
	drawStart: function(position){
		//Once called add event lister for drawMoved and closeFreeDraw
		this.bound = new Object();
		this.bound.closeFreeDraw = this.closeFreeDraw.bind(this);
		this.bound.drawMoved		= this.drawMoved.bind(this); 
		
		this.canvasEl.addEvent('mousemove', this.bound.drawMoved);
		this.canvasEl.addEvent('mouseup', this.bound.closeFreeDraw);
		this.canvasEl.addEvent('mouseout', this.bound.closeFreeDraw);
		
		//console.log('path opened');
		this.drawStatPosition = position;
		
		this.ctx.lineWidth = this.options.brushWidth; 
		this.ctx.beginPath();  
		this.ctx.moveTo(position.x,position.y);
	},
	drawMoved: function(e){
		var event = new Event(e);
		var to = this.getPosition(e);
		
		if(event.type == 'mouseup' && Math.abs(to.x - this.drawStatPosition.x) < Math.ceil(this.options.brushWidth / 2) && Math.abs(to.y - this.drawStatPosition.y) < Math.ceil(this.options.brushWidth / 2)  ){
			this.drawPoint(to);
		}
	
		this.ctx.lineTo(to.x,to.y);
		this.ctx.stroke();
		
		//socket.emit('drawn', { method: 'freeDrawDragDraw', arguments: [to], color: this.color });
	},
	closeFreeDraw: function(e){
		//console.log('path closed');
		this.drawMoved(e);
		this.ctx.closePath();
		this.canvasEl.removeEvent('mousemove', this.bound.drawMoved);
		this.canvasEl.removeEvent('mouseup', this.bound.closeFreeDraw);
		this.canvasEl.removeEvent('mouseout', this.bound.closeFreeDraw);		
	}
});


window.addEvent('domready',function(){
	canvas = new Canvas($('canvas'),{'drawTool':'pencil'});
	
	//We only add the mousedown event to start draeing, the class will add the neccacary events to stop drawing
	canvas.canvasEl.addEvent('mousedown',function(e){
		var position = canvas.getPosition(e);
		canvas.drawStart(position);
	});
	
	//Setup color pickers
	$$('.canvas-color-picker').each(function(el){
		el.addEvent('click',function(e){
			new Event(e).stop();
			canvas.setColor(el.getStyle('background-color'));
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