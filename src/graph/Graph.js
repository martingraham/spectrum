//		a spectrum viewer
//
//	  Copyright  2015 Rappsilber Laboratory, Edinburgh University
//
// 		Licensed under the Apache License, Version 2.0 (the "License");
// 		you may not use this file except in compliance with the License.
// 		You may obtain a copy of the License at
//
// 		http://www.apache.org/licenses/LICENSE-2.0
//
//   	Unless required by applicable law or agreed to in writing, software
//   	distributed under the License is distributed on an "AS IS" BASIS,
//   	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   	See the License for the specific language governing permissions and
//   	limitations under the License.
//
//		authors: Colin Combe, Lars Kolbowski
//
//		graph/Graph.js
//
//		see http://bl.ocks.org/stepheneb/1182434
//		and https://gist.github.com/mbostock/3019563

Graph = function(targetSvg, model, options) {
	this.x = d3.scale.linear();
	this.y = d3.scale.linear();
	this.y_right = d3.scale.linear();
	this.model = model;
	this.options = options;
	this.margin = {
		"top":	options.title  ? 130 : 110,
		"right":  options.ylabelRight ? 60 : 45,
		"bottom": options.xlabel ? 50 : 20,
		"left":   options.ylabelLeft ? 65 : 30
	};

	this.g = targetSvg.append("g").attr("class", "spectrum");

	this.plot = this.g.append("rect")
		.style("fill", "white")
		.attr("pointer-events", "visible");

	this.measureBackground = this.g.append("rect")
		.attr("width", "0")
		.style("fill", "white")
		.style("cursor", "crosshair")
		.attr("pointer-events", "visible");

	this.innerSVG = this.g.append("g").attr("class", "innerSpectrum");

	this.xaxisSVG = this.g.append("g").attr("class", "x axis");

	//brush
	this.brush = d3.svg.brush().x(this.x);

	this.xaxisZoomRect = this.g.append("rect")
		.attr("height", "25")
		.attr("opacity", 0)
		.attr("pointer-events", "all")
		.style("cursor", "crosshair")
	;
	this.xaxisZoomRect.call(this.brush);

	this.yAxisLeftSVG = this.g.append("g")
		.attr("class", "y axis");
	this.yAxisRightSVG = this.g.append("g")
		.attr("class", "y axis");

	this.dragZoomHighlight = this.innerSVG.append("rect").attr("y", 0).attr("width", 0).attr("fill","#addd8e");

	this.plot.on("click", function(){
		this.model.clearStickyHighlights();
	}.bind(this));

	//Tooltip
	if (CLMSUI.compositeModelInst !== undefined)
		this.tooltip = CLMSUI.compositeModelInst.get("tooltipModel");
	else{
		// target = this.g.node().parentNode.parentNode; //this would get you #spectrumPanel
		this.tooltip = d3.select("body").append("span")
			.attr("class", "xispec_tooltip")
	}

	this.highlights = this.innerSVG.append("g").attr("class", "peakHighlights");
	this.peaksSVG = this.innerSVG.append("g").attr("class", "peaks");
	this.lossyAnnotations = this.innerSVG.append("g").attr("class", "lossyAnnotations");
	this.annotations = this.innerSVG.append("g").attr("class", "annotations");

	//MeasuringTool
	this.measuringTool = this.innerSVG.append("g").attr("class", "measuringTool");
	this.measuringToolVLineStart = this.measuringTool.append("line")
		.attr("stroke-width", 1)
		.attr("stroke", "Black");
	this.measuringToolVLineEnd = this.measuringTool.append("line")
		.attr("stroke-width", 1)
		.attr("stroke", "Black");
	this.measuringToolLine = this.measuringTool.append("line")
		.attr("y1", 50)
		.attr("y2", 50)
		.attr("stroke-width", 1)
		.attr("stroke", "Red");
	this.measureDistance = this.measuringTool.append("text")
		.attr("text-anchor", "middle")
		.attr("pointer-events", "none");

	this.measureTooltip = d3.select(this.options.measureTooltipSvgG).append("g")
		.attr("style", "text-anchor: middle;")
	;
	this.measureTooltipBackground = this.measureTooltip.append("rect")
		.attr("x", 0)
		.attr("y", 0)
		.attr("fill", "rgb(200,200,200)")
		.attr("fill-opacity", "0.5")
		.attr("stroke-opacity", "0.5")
		.attr("stroke-width", "1px")
		.attr("stroke", "rgb(100,100,100)")
	;

	this.measureTooltipText = new Array();
	this.measureTooltipText['from'] = this.measureTooltip.append("text");
	this.measureTooltipText['to'] = this.measureTooltip.append("text");
	this.measureTooltipText['match'] = this.measureTooltip.append("text");
	this.measureTooltipText['masses'] = this.measureTooltip.append("g")
		.attr("class", "xispec_measureMasses")
	;

	// add Chart Title
	if (options.title) {
		this.title = this.g.append("text")
		.attr("class", "axis")
		.text(options.title)
		.attr("dy","-0.8em")
		.style("text-anchor","middle");
	}
	// add the x-axis label
	if (options.xlabel) {
		this.xlabel = this.g.append("text")
			.attr("class", "aWWWAAAAAxis")
			.text(options.xlabel)
			.attr("dy","2.4em")
			.style("text-anchor","middle").style("pointer-events","none");
	}
	// add y-axis label
	if (options.ylabelLeft) {
		this.ylabelLeft = this.g.append("g").append("text")
			.attr("class", "axis")
			.text(options.ylabelLeft)
			.style("text-anchor","middle").style("pointer-events","none");
	}
	// add 2nd y-axis label
	if (options.ylabelRight) {
		this.ylabelRight = this.g.append("g").append("text")
			.attr("class", "axis")
			.text(options.ylabelRight)
			.style("text-anchor","middle").style("pointer-events","none");
	}

	this.zoom = d3.behavior.zoom().x(this.x).on("zoom", this.redraw());

};

Graph.prototype.setData = function(){
	//create peaks array with Peaks
	this.peaks = new Array();
	if (this.model.get("JSONdata")) {
		for (var i = 0; i < this.model.get("JSONdata").peaks.length; i++){
				var peak = this.model.get("JSONdata").peaks[i];
			this.peaks.push(new Peak(i, this));
		}
		this.updatePeakColors();
	}

	this.margin.top = this.model.isLinear ? 80 : 120;
	// if (this.options.butterfly)
	// 	this.margin.bottom += (this.model.isLinear) ? 20 : 45;

	this.g.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

	if(this.model.get('lockZoom')){
		this.resize(this.model.get('mzRange')[0], this.model.get('mzRange')[1], this.model.ymin, this.model.ymax);
		this.disableZoom();
	}
	else{
		this.resize(this.model.xminPrimary, this.model.xmaxPrimary, this.model.ymin, this.model.ymaxPrimary);
		this.enableZoom();
	}
}

Graph.prototype.resize = function(xmin, xmax, ymin, ymax) {

	if(this.options.hidden){
		return;
	}

	//reset measureTool
	if(this.model.get('measureMode'))
		this.measureClear();
	//see https://gist.github.com/mbostock/3019563
	var cx = this.g.node().parentNode.parentNode.parentNode.clientWidth;
	var cy = this.g.node().parentNode.parentNode.parentNode.clientHeight;

	var width = cx - this.margin.left - this.margin.right;

	var height = (this.options.butterfly) ? cy - this.margin.top * 2 - 25 : cy - this.margin.top  - this.margin.bottom;

	if(this.options.butterfly){
		height = (height / 2);
		if(this.options.invert){
			var top = this.margin.top + height;
			this.g.attr("transform", "translate(" + this.margin.left + "," + top + ")");
		}
	}

	this.x.domain([xmin, xmax])
		.range([0, width]);

	// y-scale
	if (this.options.invert){
		this.y.domain([0, ymax]).nice()
			.range([0, height]).nice();
		this.y_right.domain([0, ymax]).nice()
			.range([0, height]).nice();
	}
	else{
		this.y.domain([0, ymax]).nice()
			.range([height, 0]).nice();
		this.y_right.domain([0, ymax]).nice()
			.range([height, 0]).nice();
	}

	var yTicks = height / 40;
	var xTicks = 0
	if(!this.options.butterfly || this.options.invert)
		var xTicks = width / 100;

	this.yTicks = yTicks;

	this.yAxisLeft = d3.svg.axis().scale(this.y).ticks(yTicks).orient("left").tickFormat(d3.format("s"));
	this.yAxisRight = d3.svg.axis().scale(this.y_right).ticks(yTicks).orient("right").tickFormat(d3.format("s"));

	this.yAxisLeftSVG.call(this.yAxisLeft);
	this.yAxisRightSVG
		.attr("transform", "translate(" + width + " ,0)")
		.call(this.yAxisRight)
	;
	this.xaxisZoomRect.attr("width", width);

	// var xAxisOrient = this.options.invert ? "top" : "bottom";
	// this.xAxis = d3.svg.axis().scale(this.x).ticks(xTicks).orient(xAxisOrient);
	this.xAxis = d3.svg.axis().scale(this.x).ticks(xTicks).orient("bottom");

	this.xaxisSVG
		.attr("transform", "translate(0," + height + ")")
		.call(this.xAxis)
	;

	this.g.selectAll('.axis line, .axis path')
		.style({'stroke': 'Black', 'fill': 'none', 'stroke-width': '1.2px'});

	this.g.selectAll('.tick')
		.attr("pointer-events", "none");

	this.plot.attr("width", width)
		.attr("height", height);

	var xaxisZoomRectYpos = (this.options.butterfly && !this.options.invert) ? height * 2 : height;

	this.xaxisZoomRect.attr("width",width).attr("y", xaxisZoomRectYpos).attr("height", this.margin.bottom);

	this.dragZoomHighlight.attr("height", height);

	this.zoom = d3.behavior.zoom().x(this.x).on("zoom", this.redraw());
	this.zoom.scaleExtent([0, this.model.xmaxPrimary]);
	this.plot.call(this.zoom);

	if (this.title) {
		this.title.attr("x", width/2);
	}
	this.xlabel.attr("x", width/2).attr("y", height);
	this.ylabelLeft.attr("transform","translate(" + -50 + " " + height/2+") rotate(-90)");
	this.ylabelRight.attr("transform","translate(" + (width+45) + " " + height/2+") rotate(-90)");

	this.redraw()();
}

Graph.prototype.disableZoom = function(){

	this.plot.attr("pointer-events", "none");
	this.xaxisZoomRect.style("cursor", "default");
	this.brush.on("brushstart", null)
		.on("brush", null)
		.on("brushend", null);
	this.plot.call(this.zoom)
		.on("zoom", null);
}

Graph.prototype.enableZoom = function(){
	this.plot.attr("pointer-events", "visible");
	this.plot.call(this.zoom);
	this.xaxisZoomRect.style("cursor", "crosshair");
	this.brush.on("brushstart", brushstart)
		.on("brush", brushmove)
		.on("brushend", brushend);
	var self = this;
	function brushstart() {
		self.dragZoomHighlight
			.attr("width",0)
			.attr("display","inline")
		;
	}

	function brushmove() {
	  var s = self.brush.extent();
	  //var width = self.x(s[1] - s[0]) - self.x(0);
	  var width = self.x(s[1]) - self.x(s[0]);
	  self.dragZoomHighlight.attr("x",self.x(s[0])).attr("width", width);
	}

	function brushend() {
	  self.dragZoomHighlight.attr("display","none");
	  var s = self.brush.extent();
	  self.x.domain(s);
	  self.brush.x(self.x);
	  self.model.xmin = s[0];
	  self.model.xmax = s[1]; //--
	  self.resize(self.model.xmin, self.model.xmax, self.model.ymin, self.model.ymax);
	}
}

Graph.prototype.measure = function(on){
	if (on === true){
		var self = this;
		self.measureBackground
	  		.attr("width", self.plot[0][0].getAttribute("width"))
	  		.attr("height", self.plot[0][0].getAttribute("height"));

		self.peaksSVG.style("pointer-events", "none");		//disable peak highlighting

		self.disableZoom();

		function measureStart() {
			self.measureShow();

			var coords = d3.mouse(this);
			var mouseX = self.x.invert(coords[0]);
			var distance = 100;
			var highlighttrigger = 10;
			var peakCount = self.peaks.length;
			for (var p = 0; p < peakCount; p++) {
				var peak = self.peaks[p];
				if (_.intersection(self.model.highlights, peak.fragments).length != 0 && Math.abs(peak.x - mouseX)  < highlighttrigger){
					self.measureStartPeak = peak;
					break;
				}

				if (Math.abs(peak.x - mouseX)  < distance){
					distance = Math.abs(peak.x - mouseX);
					self.measureStartPeak = peak;
				}
			}
			self.measuringToolVLineStart
				.attr("x1", self.x(self.measureStartPeak.x))
				.attr("x2", self.x(self.measureStartPeak.x))
				.attr("y1", self.y(self.model.ymaxPrimary))
				.attr("y2", self.y(self.measureStartPeak.y))
			;
			self.measuringToolLine
				.attr("x1", self.x(self.measureStartPeak.x))
				.attr("x2", coords[0])
				.attr("y1", coords[1])
				.attr("y2", coords[1])
			;
			self.measuringToolVLineEnd
				.attr("x1", coords[0])
				.attr("x2", coords[0])
				.attr("y1", self.y(0))
				.attr("y2", self.y(self.model.ymaxPrimary))
			;
		}

		function measureMove() {
			var coords = d3.mouse(this);
			var mouseX = self.x.invert(coords[0]);
			//find start and endPeak
			var distance = 2;
			var highlighttrigger = 15;	//triggerdistance to prioritize highlighted peaks as endpoint
			var triggerdistance = 10;	//triggerdistance to use peak as endpoint
			var peakCount = self.peaks.length;
			for (var p = 0; p < peakCount; p++) {
				var peak = self.peaks[p];
				if (peak != self.measureStartPeak){
					if (_.intersection(self.model.highlights, peak.fragments).length != 0 && Math.abs(peak.x - mouseX)  < highlighttrigger){
						var endPeak = peak;
						break;
					}
					if (mouseX - triggerdistance < peak.x < mouseX + triggerdistance && Math.abs(peak.x - mouseX)  < distance){
						var endPeak = peak
						distance = Math.abs(peak.x - mouseX);
					}
				}
			}

			//draw vertical end Line
			if(endPeak){
				//set end of the measuringTool to endPeak
				self.measuringToolVLineEnd
					.attr("x1", self.x(endPeak.x))
					.attr("x2", self.x(endPeak.x))
					.attr("y1", self.y(endPeak.y))
					.attr("y2", self.y(self.model.ymaxPrimary))
				;
			}
			else{
				self.measuringToolVLineEnd
					.attr("x1", coords[0])
					.attr("x2", coords[0])
					.attr("y1", self.y(0))
					.attr("y2", self.y(self.model.ymaxPrimary))
				;
			}

			//draw horizontal line
			var measureStartX = parseFloat(self.measuringToolVLineStart.attr("x1"));
			var measureEndX = parseFloat(self.measuringToolVLineEnd.attr("x1"));

			if(self.options.invert){
				if (coords[1] > self.y(self.model.ymaxPrimary))
					var y = self.y(self.model.ymaxPrimary);
				else if (coords[1] < self.y(0))
					var y  = self.y(0);
				else
					var y = coords[1];
			}
			else{
				if (coords[1] < self.y(self.model.ymaxPrimary))
					var y = self.y(self.model.ymaxPrimary);
				else if (coords[1] > self.y(0))
					var y  = self.y(0);
				else
					var y = coords[1];
			}

			self.measuringToolLine
				.attr("x2", measureEndX)
				.attr("y1", y)
				.attr("y2", y)
			;

			//draw peak info
			var deltaX = Math.abs(measureStartX - measureEndX);
			var distance = Math.abs(self.x.invert(measureStartX) - self.x.invert(measureEndX));
			if (measureStartX  < measureEndX)
				var labelX = measureStartX  + deltaX/2;
			else
				var labelX = measureEndX + deltaX/2;

			self.measureDistance.text(distance.toFixed(self.model.showDecimals)+" Th");

			var matrix = this.getScreenCTM()
				.translate(+this.getAttribute("cx"),
						 +this.getAttribute("cy"));

				if (measureStartX < measureEndX)
					var positionX = coords[0] - Math.abs(measureStartX - measureEndX)/2;
				else
					var positionX = coords[0] + Math.abs(measureStartX - measureEndX)/2;

			// Because chrome is deprecating offset on svg elements
			// function getSVGOffset (svg) {
			// 	var pnode = svg;
			// 	var pBCR;
			// 	while (pnode && !pBCR) {
			// 		var posType = (pnode == document) ? "static" : d3.select(pnode).style("position");
			// 		if (posType !== "" && posType !== "static" && posType !== "inherit") {
			// 			pBCR = pnode.getBoundingClientRect();
			// 		}
			// 		pnode = pnode.parentNode;
			// 	}
			// 	var svgBCR = svg.getBoundingClientRect();
			// 	pBCR = pBCR || {top: 0, left: 0};
			// 	return {top: svgBCR.top - pBCR.top, left: svgBCR.left - pBCR.left};
			// }
			//
			// var svgNode = self.g.node().parentNode;
			// var rectBounds = this.getBoundingClientRect();
			// var svgBounds = svgNode.getBoundingClientRect();
			// var rectOffX = -8; //rectBounds.left - svgBounds.left;
			// var rectOffY = rectBounds.top - svgBounds.top;
			// var svgOffset = getSVGOffset (svgNode);
			// rectOffX += svgOffset.left; // add on offsets to svg's relative parent
			// rectOffY += svgOffset.top;
			// rectOffX += positionX;
			// rectOffY += y + 10; // the offset of the drag in the rect

			self.measureDistance.attr("x", positionX).attr("y", coords[1]-10);

			var measureTooltipAbsOffsetY = self.options.invert ? 6 + self.margin.top * 2 : self.margin.top;

			//fromText
			var fromTextColor = self.measureStartPeak.colour;
			if(self.measureStartPeak.fragments.length > 0)
					var fromText = "From: " + self.measureStartPeak.fragments[0].name +" (" + self.measureStartPeak.x.toFixed(self.model.showDecimals) + " m/z)";
			else if (self.measureStartPeak.isotopes.length > 0)
					var fromText = "From: " + self.measureStartPeak.isotopes[0].name + "+" + self.measureStartPeak.isotopenumbers[0]+ "(" + self.measureStartPeak.x.toFixed(self.model.showDecimals) + " m/z)";
			else{
				var fromText = "From: Peak (" + self.measureStartPeak.x.toFixed(self.model.showDecimals) + " m/z)";
				fromTextColor = "black";
			}
			//toText
			if(endPeak){
				var toTextColor = endPeak.colour;
				if(endPeak.fragments.length > 0)
						var toText = "To: " + endPeak.fragments[0].name +"(" + endPeak.x.toFixed(self.model.showDecimals) + " m/z)";
				else if(endPeak.isotopes.length > 0)
						var toText = "To: " + endPeak.isotopes[0].name + "+" + endPeak.isotopenumbers[0]+ "(" + endPeak.x.toFixed(self.model.showDecimals) + " m/z)";
				else{
					var toText= "To: Peak (" + endPeak.x.toFixed(self.model.showDecimals) + " m/z)";
					toTextColor = "black";
				}
			}
			else{
				toText = "";
			}
			var massArr = [];
			for(i=1; i<7; i++){
				var massObj = new Object();
				massObj.mass = distance * i;
				massObj.matchAA = xiSPEC.matchMassToAA(distance * i);
				massArr.push(massObj);
			};

			var yText = coords[1] + 25 + measureTooltipAbsOffsetY;
			self.measureTooltipText['from']
				.attr("y", yText)
				.attr("fill", fromTextColor)
				.text(fromText)
			;

			yText += 18;
			self.measureTooltipText['to']
				.attr("y", yText)
				.attr("fill", toTextColor)
				.text(toText)
			;

			yText += 6;
			self.measureTooltipText['masses'].selectAll("*").remove();
			self.measureTooltipText['masses'].selectAll('text')
				.data(massArr)
				.enter().append('text')
				.text(function (d, i) {
					var z = i + 1;
					var matchText = "";
					if (d.matchAA.length > 0)
						matchText = "("+d.matchAA+")";
					return "z="+z+": " + d.mass.toFixed(self.model.showDecimals) + " Da " + matchText;
				})
				.attr("y", function (d) { return yText += 15; } )
				.attr("class", function(d){ if(d.matchAA.length > 0) return 'matchedAA' })
			;

			var maxTextWidth = Math.max.apply(Math,self.measureTooltip.selectAll('text')[0].map(function(t){return d3.select(t).node().getComputedTextLength();}));
			var backgroundWidth = maxTextWidth + 20;
			var backgroundWidthX = positionX - backgroundWidth / 2;

			self.measureTooltipBackground
				.attr("x", backgroundWidthX + self.margin.left)
				.attr("y", coords[1] + 10 + measureTooltipAbsOffsetY)
				.attr("width", backgroundWidth)
				.attr("height", 140)
			;

			self.measureTooltip.selectAll('text')
				.attr("x", positionX + self.margin.left)

			;
			self.measureTooltipText['masses'].selectAll('text')
				.attr("fill", "#333")
			;
			self.measureTooltipText['masses'].selectAll('.matchedAA')
				.attr("fill", "black")
			;
		}

		this.measureBrush = d3.svg.brush()
			.x(this.x)
			.on("brushstart", measureStart)
			.on("brush", measureMove)

		this.measureBackground.call(this.measureBrush);

	}
	else{
		this.measureClear();
		this.peaksSVG.style("pointer-events", "visible");
		this.measureBackground.attr("height", 0);
		this.enableZoom();
	}
}

Graph.prototype.measureClear = function(){
	this.measuringTool.attr("display","none");
	this.measureDistance.attr("display","none");
	this.measureTooltip.attr("display","none");
}

Graph.prototype.measureShow = function(){
	this.measuringTool.attr("display","inline");
	this.measureDistance.attr("display","inline");
	this.measureTooltip.attr("display","inline");
}

Graph.prototype.redraw = function(){
	var self = this;
	//self.measure();
	return function (){

		//get highest intensity from peaks in x range
		//adjust y scale to new highest intensity

		//self.measureClear();
		if (self.peaks) {
			var ymax = 0
			var xDomain = self.x.domain();
			for (var i = 0; i < self.peaks.length; i++){
			  if (self.peaks[i].y > ymax && (self.peaks[i].x > xDomain[0] && self.peaks[i].x < xDomain[1]))
			  	ymax = self.peaks[i].y;
			}
			//console.log(ymax);
			self.y.domain([0, ymax/0.95]);
			self.y_right.domain([0, (ymax/(self.model.ymaxPrimary*0.95))*100]);
			self.yAxisLeftSVG.call(self.yAxisLeft);
			self.yAxisRightSVG.call(self.yAxisRight);
			for (var i = 0; i < self.peaks.length; i++){
				self.peaks[i].update();
			}
		}
		self.xaxisSVG.call( self.xAxis);
		if (self.model.measureMode)
			self.disableZoom();
		//d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
		//self.plot.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
		//self.innerSVG.call( d3.behavior.zoom().x(self.x).on("zoom", self.redraw()));
		self.model.setZoom(self.x.domain());
	};
}

Graph.prototype.clear = function(){
	this.model.set('measureMode', false);
	this.peaks = [];
	this.highlights.selectAll("*").remove();
	this.peaksSVG.selectAll("*").remove();
	this.lossyAnnotations.selectAll("*").remove();
	this.annotations.selectAll("*").remove();

}


Graph.prototype.clearHighlights = function(peptide, pepI){
	var peakCount = this.peaks.length;
	for (var p = 0; p < peakCount; p++) {
		if (this.peaks[p].fragments.length > 0 && !_.contains(this.model.sticky, this.peaks[p].fragments[0])) {
			this.peaks[p].highlight(false);
		}
	}
}

Graph.prototype.updatePeakColors = function(){
	var peakCount = this.peaks.length;

	if (this.model.highlights.length == 0 || this.model.showAllFragmentsHighlight){
		for (var p = 0; p < peakCount; p++) {
			this.peaks[p].line.attr("stroke", this.peaks[p].colour);
		}
	}
	else{
		var self = this;
		var highlightClusterIds = [].concat.apply([], this.model.highlights.map(function(h){ return h.clusterIds;}));
		this.peaks.forEach(function(p){
			if (_.intersection(self.model.highlights, p.fragments).length > 0 || _.intersection(highlightClusterIds, p.clusterIds).length > 0)
				p.line.attr("stroke", p.colour);
			else
				p.line.attr("stroke", self.model.get('peakColor'));

		});

	}
}

Graph.prototype.updatePeakLabels = function(){
	var peakCount = this.peaks.length;

	if (this.model.highlights.length == 0){
		for (var p = 0; p < peakCount; p++) {
			if (this.peaks[p].fragments.length > 0) {
				this.peaks[p].removeLabels();
				this.peaks[p].showLabels();
			}
		}
	}
	else{
		for (var p = 0; p < peakCount; p++) {
			// if it's not a fragment from the highlight selection
			if (_.intersection(this.model.highlights, this.peaks[p].fragments).length == 0){
				// show it if allFragmentHighlights is true (dependent on lossyShown)
				if (this.model.showAllFragmentsHighlight){
					this.peaks[p].removeLabels();
					this.peaks[p].showLabels();
				}
				else{
					this.peaks[p].removeLabels();
				}
			}
			// if it is from the highlight selection force show all Labels overriding lossyShown
			else{
				this.peaks[p].removeLabels();
				this.peaks[p].showLabels(true);
			}
		}
	}
}

Graph.prototype.updateColors = function(){
	var peakCount = this.peaks.length;
		for (var p = 0; p < peakCount; p++) {
			this.peaks[p].updateColor();
		}
}

Graph.prototype.updateHighlightColors = function(){
	var peakCount = this.peaks.length;
		for (var p = 0; p < peakCount; p++) {
			if(this.peaks[p].highlightLine !== undefined){
				this.peaks[p].highlightLine.attr("stroke", this.model.get('highlightColor'));
				this.peaks[p].labelHighlights.attr("stroke", this.model.get('highlightColor'));
			}
		}
}

Graph.prototype.show = function(){
	this.g.attr("visibility", "visible");
	this.enableZoom();
}

Graph.prototype.hide = function(){
	this.g.attr("visibility", "hidden");
	this.disableZoom();
	//this.xaxisZoomRect.attr("pointer-events", "none");
	//this.g.style("pointer-events", "none");
}
/*

Graph.prototype.resetScales = function(text) {
	  this.y = d3.scale.linear()
	  .domain([this.options.ymax, this.options.ymin])
	  .nice()
	  .range([0, this.size.height])
	  .nice();

	this.zoom.scale(1, 1);
	this.zoom.translate([0, 0]);
	this.redraw()();
};
*/
