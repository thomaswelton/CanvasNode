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
		this.ctx.canvas.width = this.canvasEl.getWidth().toInt();
		this.ctx.canvas.height = this.canvasEl.getHeight().toInt();
		
		this.tool = 'fill';
	},
	getPosition: function(e){
		var event = new Event(e);
		var canvasPosition = this.canvasEl.getCoordinates();
		var eventPosition = {};
		
		if(typeof(event.targetTouches) != 'undefined'){
			eventPosition.x = event.targetTouches[0].pageX;
			eventPosition.y = event.targetTouches[0].pageY;
			
			console.log('x:'+eventPosition.x+' y:'+eventPosition.y);
		}else{
			eventPosition.x = event.page.x;
			eventPosition.y = event.page.y;
		}
		
		return ({ x : eventPosition.x - canvasPosition.left, y: eventPosition.y - canvasPosition.top });	
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
		//socket.emit('updateCanvas', window.canvas.canvasEl.toDataURL('image/png'));
	},
	emitEvent: function(data){
		if(!this.isMirror){
			//If this class instance is a mirror of another user then we do not want to draw events
			data.color = this.color;
			socket.emit('drawn', data);
		}
	},
	fillCanvas: function(start){
		
		var pixelStack = [[start.x, start.y]];
		var canvasWidth = this.ctx.canvas.width; 
		var canvasHeight = this.ctx.canvas.height;
		var colorLayer = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
		
		startPos = (start.y*canvasWidth + start.x) * 4;
		console.log(startPos);
		console.log(colorLayer.data[startPos]);
		
		var matchColor = [colorLayer.data[startPos],colorLayer.data[startPos+1],colorLayer.data[startPos+2]];
		console.log(matchColor);
		
		var matchStartColor = function(pixelPos){
		  var r = colorLayer.data[pixelPos];	
		  var g = colorLayer.data[pixelPos+1];	
		  var b = colorLayer.data[pixelPos+2];
		
		  return (r == matchColor[0] && g == matchColor[1] && b == matchColor[2]);
		};
		
		var colorPixel = function(pixelPos){
		  colorLayer.data[pixelPos] = 127;
		  colorLayer.data[pixelPos+1] = 127;
		  colorLayer.data[pixelPos+2] = 127;
		  colorLayer.data[pixelPos+3] = 255;
		};
		
		while(pixelStack.length){
			
		  var newPos, x, y, pixelPos, reachLeft, reachRight;
		  newPos = pixelStack.pop();
		  x = newPos[0];
		  y = newPos[1];
		  
		  pixelPos = (y*canvasWidth + x) * 4;
		  while(y-- >= 0 && matchStartColor(pixelPos))
		  {
			pixelPos -= canvasWidth * 4;
		  }
		  pixelPos += canvasWidth * 4;
		  ++y;
		  reachLeft = false;
		  reachRight = false;
		  while(y++ < canvasHeight-1 && matchStartColor(pixelPos))
		  {
			colorPixel(pixelPos);
		
			if(x > 0)
			{
			  if(matchStartColor(pixelPos - 4))
			  {
				if(!reachLeft){
				  pixelStack.push([x - 1, y]);
				  reachLeft = true;
				}
			  }
			  else if(reachLeft)
			  {
				reachLeft = false;
			  }
			}
			
			if(x < canvasWidth-1)
			{
			  if(matchStartColor(pixelPos + 4))
			  {
				if(!reachRight)
				{
				  pixelStack.push([x + 1, y]);
				  reachRight = true;
				}
			  }
			  else if(reachRight)
			  {
				reachRight = false;
			  }
			}
					
			pixelPos += canvasWidth * 4;
		  }
		}
		this.ctx.putImageData(colorLayer, 0, 0);
		
		this.emitEvent({ method: 'fillCanvas', arguments: [start]});
	},
	setPixelColor: function(pixels){
		var width = this.ctx.canvas.width;
		var height = this.ctx.canvas.height;
		var imgd =this.ctx.getImageData(0, 0, width, height);
		var pix = imgd.data;
		
		// Loop over each pixel.
		for (var i = 0; i < pixels.length; i++) {
			var startPoint = pixels[i].x + (pixels[i].y * width);
			
			pix[startPoint + ((startPoint - 1) * 3)] = 127; // the red channel
			pix[startPoint+1 + ((startPoint - 1) * 3)] = 255; // the green channel
			pix[startPoint+2 + ((startPoint - 1) * 3)] = 255; // the blue channel
			pix[startPoint+3 + ((startPoint - 1) * 3)] = 255; // the alpha channel
		}
		
		// Draw the ImageData object at the given (x,y) coordinates.
		this.ctx.putImageData(imgd, 0,0);
		
	},
	getPixelColor: function(position){
		var pixelData = this.ctx.getImageData(position.x,position.y,1,1);
		return pixelData.data;
		
	},
	pixelColorMatch: function(p1,color){
		p1Color = this.getPixelColor(p1);

		//console.log('color check x'+p1.x+' y'+p1.y);
		//console.log((p1Color[0] == color[0] && p1Color[1] == color[1] && p1Color[2] == color[2]));

		return (p1Color[0] == color[0] && p1Color[1] == color[1] && p1Color[2] == color[2]);
		
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
			
			$('canvas-container').addEventListener('touchmove', this.bound.mouseMoved,false);
			$('canvas-container').addEventListener('touchend', this.bound.mouseExit,false);
			$('canvas-container').addEventListener('touchcancel', this.bound.mouseExit,false);
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
		event.preventDefault();
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
		if(canvas.tool == 'fill'){
			canvas.fillCanvas(position);
		}else{
			canvas.drawStart(position);
		}
	});
	
	$('canvas-container').addEventListener('touchstart',function(e){
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
	
	$$('.canvasTool').addEvent('click',function(){
		canvas.tool = this.getAttribute('tool');
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
			newCanvasEl.cloneEvents($('canvas'));
			newCanvasEl.inject($('canvas-container'),'bottom');
			canvi[data.id] = new Canvas($('canvas-'+data.id),{'isMirror' : true});
			canvi[data.id].ctx.drawImage(window.canvas.canvasEl,0,0);
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