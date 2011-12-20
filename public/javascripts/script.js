var socket = io.connect(window.location.origin);

var Canvas = new Class({
	Implements: [Options, Events],
	options: {
		
	},
	initialize: function(el,options){
		this.options.brushWidth = 6;
		this.setOptions(options);
		this.isMirror 	= (this.options.isMirror == true);
		this.canvasEl 	= el;
		this.ctx		= this.canvasEl.getContext('2d');
		this.setColor('#000000');
		this.ctx.canvas.width = this.canvasEl.getWidth();
		this.ctx.canvas.height = this.canvasEl.getHeight();
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
		window.canvas.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
		socket.emit('updateCanvas', window.canvas.canvasEl.toDataURL('image/png'));
		this.emitEvent({ method: 'clear', arguments: [null]});
	},
	mergeCanvas: function(){
		window.canvas.ctx.drawImage(this.canvasEl,0,0);
		$(this.canvasEl).dispose();
		socket.emit('updateCanvas', window.canvas.canvasEl.toDataURL('image/png'));
	},
	emitEvent: function(data){
		if(!this.isMirror){
			//If this class instance is a mirror of another user then we do not want to draw events
			data.color = this.color;
			socket.emit('drawn', data);
		}
	},
	drawPoint: function(position){	
		var x1 = position.x - (Math.ceil(this.options.brushWidth / 2));
		var y1 = position.y - (Math.ceil(this.options.brushWidth / 2));
		
		this.ctx.fillRect(x1, y1, this.options.brushWidth, this.options.brushWidth);
		
		//console.log('pointDrawn');
		this.emitEvent({ method: 'drawPoint', arguments: [position]});
	},
	drawStart: function(position){
		//Once called add event lister for mouseMoved and mouseExit
		this.bound = new Object();
		this.bound.mouseExit = this.mouseExit.bind(this);
		this.bound.mouseMoved		= this.mouseMoved.bind(this); 
		
		if(!this.isMirror){
			$('canvas-container').addEvent('mousemove', this.bound.mouseMoved);
			$('canvas-container').addEvent('mouseup', this.bound.mouseExit);
			$('canvas-container').addEvent('mouseout', this.bound.mouseExit);
			
			$('canvas-container').addEventListener('touchmove', this.bound.mouseMoved);
			$('canvas-container').addEventListener('touchend', this.bound.mouseExit);
			$('canvas-container').addEventListener('touchcancel', this.bound.mouseExit);
		}
		
		//console.log('path opened');
		this.drawStatPosition = position;
		
		this.ctx.lineWidth = this.options.brushWidth; 
		this.ctx.beginPath();  
		this.ctx.moveTo(position.x,position.y);
		
		this.emitEvent({ method: 'drawStart', arguments: [position]});
	},
	drawMouseMove: function(position){
		//this.setColor(this.color);
		this.ctx.lineTo(position.x,position.y);
		this.ctx.stroke();
	},
	drawEnd: function(){
		this.ctx.closePath();
	},
	mouseMoved: function(e){
		var event = new Event(e);
		var position = this.getPosition(e);
		
		if(event.type == 'mouseup' && Math.abs(position.x - this.drawStatPosition.x) < Math.ceil(this.options.brushWidth / 2) && Math.abs(position.y - this.drawStatPosition.y) < Math.ceil(this.options.brushWidth / 2)  ){
			this.drawPoint(position);
			this.emitEvent({ method: 'drawPoint', arguments: [position]});
			
		}else{
			this.drawMouseMove(position);
			this.emitEvent({ method: 'drawMouseMove', arguments: [position]});
		}
	},
	mouseExit: function(e){
		//console.log('path closed');
		this.mouseMoved(e);
		this.drawEnd();
		this.emitEvent({ method: 'drawEnd', arguments: [null]});
		this.emitEvent({ method: 'mergeCanvas', arguments: [null]});
		
		if(!this.isMirror){
			$('canvas-container').removeEvent('mousemove', this.bound.mouseMoved);
			$('canvas-container').removeEvent('mouseup', this.bound.mouseExit);
			$('canvas-container').removeEvent('mouseout', this.bound.mouseExit);
		}
	}
});


window.addEvent('domready',function(){
	window.canvas = new Canvas($('canvas'),{'isMirror':false});
	
	//We only add the mousedown event to start draeing, the class will add the neccacary events to stop drawing
	$('canvas-container').addEvent('mousedown',function(e){
		var position = canvas.getPosition(e);
		canvas.drawStart(position);
	});
	
	$('canvas-container').addEventListener('touchstart',function(e){
		alert('touch start');
		var position = canvas.getPosition(e);
		canvas.drawStart(position);
	},false);
	
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
	
	//Much like the pulral of luxus is lexi I have decided the plural on canvas is canvi. 
	canvi = [];
	
	//Socket goodness
	socket.on('startCanvas',function(data){
		if(typeof(data.image) != 'undefined'){
			var image = new Image();
			image.onload = function(){ 
				window.canvas.ctx.drawImage(image,0,0);
			}
			image.src = data.image;
		}
	});
	
	socket.on('draw', function (data) {
		//console.log(data);
		if($('canvas-'+data.id) == null){
			//console.log('create new ncavas');
			var newCanvasEl = new Element('canvas',{id: 'canvas-'+data.id, class:'canvas'});
			newCanvasEl.injectInside($('canvas-container'));
			canvi[data.id] = new Canvas($('canvas-'+data.id),{'isMirror' : true});
		}
		
		if(typeof(canvi[data.id][data.method]) == 'function'){
			if(typeof(data.color) != 'undefined'){
				canvi[data.id].setColor(data.color);
			}
			canvi[data.id][data.method](data.arguments[0]);
		}
	});
	
	document.body.addEventListener('touchmove',function(event){
	  event.preventDefault();
	},false);
});