(function(){

	var tc = {

		selection: {
			metric: null, //controlled by dropdown/toggle
            route: null, // ...
            direction: null, // ...
            dayBin: null, // ...
            hourBin: null, // ...
            date: null, // ...
            stop: null //controlled by map 
        },

        mapObject: L.map('map'),
        mapLayer: null,
        markerGroup: L.layerGroup(),
        lineGroup: L.layerGroup(),

        rawData: null,
        selectionData: null,

        stopLookup: {"0": {}, "1": {}},

		initializeDashboard: function(data, first) {
			console.log("initializing dashboard...");
			tc.rawData = data;

			// handle bad data error
			if (data["status"]=="error") {
				var current = $(location).attr('href');
				window.location.replace(current + "/404");
			}

			// set headline text
			$("#busLongName").text(data["long_name"]);
			// enable select2 on route selector
			$("#routeSelect").select2({
				dropdownAutoWidth : true,
				width: 'auto'
			});

			// set direction headsign selection options
			$("#dir0").text(data["directions"]["0"]["headsign"]);
			$("#dir1").text(data["directions"]["1"]["headsign"]);

			// dynamically insert date select options
			// TODO - KILL THIS AFTER LINECHART/DATEPICKER IS IN
			Object.keys(data["directions"]["0"]["daybins"]["0"]["hourbins"]["0"]["dates"]).reverse().forEach(function(day){
				var option_elem = `<option name="date" value="${day}">${day}</option>`
				$("#dateSelect").append(option_elem);
			});

			// setting up dashboard environment on first load
			if (first==true) {
				console.log('first map load...')
				tc.initializeMap();
				gr.initializeCharts();
				tc.registerSelectionHandlers();
				tc.registerRouteChangeHandler();
			};

			// create a utility object for use in graphing and calculations
			tc.buildStopLookup();

			tc.selection.stop = 0;
			tc.updateController("heavy");
		},


		initializeMap: function() {
			console.log("initializing map...");

			// reset the map any time a user clicks in empty map space
			tc.mapObject.on({click: resetMapStyle});

			// this is a basic "light" style raster map layer from mapbox
			// could experiment with other map styles
			// TODO - hide the accesstoken?
			L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
    			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    			maxZoom: 18,
    			accessToken: 'pk.eyJ1IjoiaWZ3cmlnaHQiLCJhIjoiY2o0ZnJrbXdmMWJqcTMzcHNzdnV4bXd3cyJ9.1G8ErVmk7jP7PDuFp8KHpQ'
			}).addTo(tc.mapObject);

			// custom styling on stop markers
			var defaultMarkerStyle = {
			    color: "#57068c",
			    opacity: 1,
			    fillColor: "#57068c",
			    fillOpacity: 1,
			    radius: 4,
			};
			var startMarkerStyle = {
			    color: "#09bc63",
			    opacity: 1,
				fillColor: "#09bc63",
				fillOpacity: 1,
				radius: 7
			};
			var endMarkerStyle = {
			    color: "#bc2908",
			    opacity: 1,
				fillColor: "#bc2908",
				fillOpacity: 1,
				radius: 7
			};
			var journeyMarkerStyle = {
			    color: "#847d7b",
			    opacity: 1,
				fillColor: "#847d7b",
				fillOpacity: 1,
				radius: 4
			};
			var defaultLineStyle = {
			    color: "#57068c",
			    weight: 1.5,
			    opacity: 1
			};
			var journeyLineStyle = {
			    color: "#847d7b",
			    weight: 2.5,
			    opacity: 1
			};

			function clickFeature(e) {
			    var justClicked = e.target;
			    console.log("clicking a stop...");

			    // if this is the first stop selection
			    if (tc.selection.stop == 0) {
			    	console.log('1st stop selection:', justClicked.feature.properties.stop_id);
				    tc.selection.stop = [justClicked];
				    justClicked.setStyle(startMarkerStyle);

				// if this is the endpoint of a journey selection
				} else if (tc.selection.stop.length == 1){
					// check that journey is going in the right direction
					if (justClicked.feature.properties.stop_sequence > tc.selection.stop[0].feature.properties.stop_sequence) {
						console.log('2nd stop selection:', justClicked.feature.properties.stop_id);
						tc.selection.stop.push(justClicked);
						justClicked.setStyle(endMarkerStyle);
						paintJourney();
						tc.updateController("light");
					} else {
						console.log("can't drive backwards!");
					};

				// have already selected a journey, so reset the map selection
				} else {
					console.log('1st stop selection:', justClicked.feature.properties.stop_id);
					resetMapStyle();
					tc.selection.stop = ['justClicked'];
					justClicked.setStyle(startMarkerStyle);
				};
			};

			function resetMapStyle() {
				console.log('resetting map style...');
				// revert marker and line styles to default values
				tc.markerGroup.eachLayer(function(layer){layer.setStyle(defaultMarkerStyle)});
				tc.lineGroup.eachLayer(function(layer){layer.setStyle(defaultLineStyle)});
				// reset stop selection to NONE (0)
				tc.selection.stop = 0;
				tc.updateController("light");

			};

			function paintJourney() {
				var startSeq = tc.selection.stop[0].feature.properties.stop_sequence;
				var endSeq = tc.selection.stop[1].feature.properties.stop_sequence;
				console.log(`painting the journey from ${startSeq} to ${endSeq}...`);
				// change marker style for journey markers
				tc.markerGroup.eachLayer(function(layer){
					if ((layer.feature.properties.stop_sequence > startSeq) && 
						(layer.feature.properties.stop_sequence < endSeq)) {
						layer.setStyle(journeyMarkerStyle);
					};
				});
				// change line style for journey linestrings
				tc.lineGroup.eachLayer(function(layer){
					if ((layer.feature.properties.stop_sequence >= startSeq) && 
						(layer.feature.properties.stop_sequence < endSeq)) {
						layer.setStyle(journeyLineStyle);
					};
				});
			};

			function onEachFeature(feature, layer) {
			    if (feature.geometry.type == 'Point') {
			    	// bind a popup to markers
			        layer.bindPopup("<dl><dt>stop_name</dt>"
						           + "<dd>" + feature.properties.stop_name + "</dd>"
			        			   + "<dl><dt>stop_id</dt>"
						           + "<dd>" + feature.properties.stop_id + "</dd>"
						           + "<dt>stop_seq</dt>"
						           + "<dd>" + feature.properties.stop_sequence + "</dd>");

			        // bind a click event to markers, and control popup behaviour on mouseover
			        layer.on({
		            	click: clickFeature,
		            	mouseover: function(e){this.openPopup()},
		            	mouseout: function(e){this.closePopup()}
		        	});
		        	// add marker to group of all markers
		        	tc.markerGroup.addLayer(layer);
		        	layer._leaflet_id = feature.properties.stop_id;
		        	console.log(`adding point to map; stop_id ${feature.properties.stop_id}, _leaflet_id ${layer._leaflet_id}`);
			    } else if (feature.geometry.type == 'LineString') {
		        	// add line segment to group of all line segments
		        	tc.lineGroup.addLayer(layer);
			    };
			    
			};

			// create a geojson map layer, passing a function to generate custom markers from geo points
			// don't add any geo data to the layer at this stage (data added in refresh function)
			tc.mapLayer = L.geoJSON(false, {
    			pointToLayer: function (feature, latlng) {
        			return L.circleMarker(latlng, defaultMarkerStyle);
    			},
    			onEachFeature: onEachFeature,
    			style: defaultLineStyle
    		}).addTo(tc.mapObject);
		},


		registerSelectionHandlers: function() {
			console.log("registering selection handlers...");

			$("#dateSelect, #metricSelect").change(function() {
				tc.updateController("light");
			});
			$("#daySelect, #hourSelect").change(function() {
				tc.updateController("medium");
			});
			$("#dirSelect").change(function() {
				tc.updateController("heavy");
			});
		},


		registerRouteChangeHandler: function() {
			console.log("registering route change handler...");
			$("#routeSelect").change(function() {
				tc.resetDashboard($("#routeSelect").val());
			});
		},


		resetDashboard:function(route) {
			console.log(`resetting dashboard for ${route}...`);
			$("#busLongName").text("Loading Bus...");

			// revert to default selections on new route (day=0, hour=0, dir=2)
			$("input[value=0]", "#hourSelect").prop('checked', true);
			$("input[value=0]", "#daySelect").prop('checked', true);
			$("input[value=ewt]", "#metricSelect").prop('checked', true);
			$("option[value=2]", "#dirSelect").prop('selected', true);

			//get new data
			var dataURL = `/routes/${route}/data`;
	    	$.getJSON(dataURL, function(data) {
           		tc.initializeDashboard(data, first=false);
        	});

        	// change the URL to reflect new route (for aesthetics only!)
        	window.history.pushState({'new_route': route}, '', `/routes/${route}`);
		},


		buildStopLookup: function() {
			console.log("building stopLookup...");
			["0","1"].forEach(function(dir){
				var stops = tc.rawData["directions"][dir]["geo"]["features"].forEach(function(feat) {
					if (feat["geometry"]["type"] == "Point") {
						tc.stopLookup[dir][feat["properties"]["stop_id"]] = {"name": feat["properties"]["stop_name"],
						 													 "sequence": feat["properties"]["stop_sequence"]};
					};
				});
			});
		},


		updateController: function(level) {

			// light --> stop/date/metric --> (metrics/graphs)
			// medium --> daybin/hourbin --> (rebuild data, metrics/graphs)
			// heavy --> direction/route --> (map, rebuild data, metrics/graphs)

			switch (level) {
				case "light":
					console.log("updateController: level LIGHT");
					//console.log("original selection:", tc.selection);
					// if this is a stop change, stop selection already changed at click event
					tc.selection.date = $("option[name=date]:selected", "#dateSelect").val();
					tc.selection.metric = $("input[name=metric]:checked", "#metricSelect").val();
					tc.updateMetricDisplay();
					break;
				case "medium":
					console.log("updateController: level MEDIUM");
					//console.log("original selection:", tc.selection);
					tc.selection.date = $("option[name=date]:selected", "#dateSelect").val();
					tc.selection.metric = $("input[name=metric]:checked", "#metricSelect").val();
					tc.selection.dayBin = $("option[name=daybin]:selected", "#daySelect").val();
					tc.selection.hourBin = $("option[name=hourbin]:selected", "#hourSelect").val();
					tc.buildDataObject();
					tc.updateMetricDisplay();
					break;
				case "heavy":
					console.log("updateController: level HEAVY");
					//console.log("original selection:", tc.selection);
					tc.selection.date = $("option[name=date]:selected", "#dateSelect").val();
					tc.selection.metric = $("input[name=metric]:checked", "#metricSelect").val();
					tc.selection.dayBin = $("option[name=daybin]:selected", "#daySelect").val();
					tc.selection.hourBin = $("option[name=hourbin]:selected", "#hourSelect").val();
					tc.selection.direction = $("option[name=direction]:selected", "#dirSelect").val();
					tc.selection.route = tc.rawData["route_id"];
					tc.buildDataObject();
					tc.redrawMap();
					//tc.updateMetricDisplay();
					break;	
			};
			//console.log("new selection:", tc.selection);
		},


		buildDataObject: function(){
			console.log("building data object...");
			// get all historical data for given (direction, daybin, hourbin) selection
			var allDates = tc.rawData["directions"][tc.selection.direction]
				   				  ["daybins"][tc.selection.dayBin]
				   				  ["hourbins"][tc.selection.hourBin]
				   				  ["dates"];
			var selectionData = {};
			// transform allDates into object-style structure
			Object.keys(allDates).forEach(function (date) {
				var oneDay = {"route": null, "stops": {}};

				// get a single day's stop-level data, in object format
				allDates[date]["stops"].forEach(function(stop) {
					var stopValues = {};
					for (var metricName in gr.stopMetricMap) {
						if (metricName != 'stop') {
							stopValues[metricName] = stop[gr.stopMetricMap[metricName]];
						};
					};
					oneDay["stops"][stop[gr.stopMetricMap['stop']]] = stopValues;
				});

				// get a single day's route-level data, in object format
				var routeData = allDates[date]["route"]["0"];
				var routeValues = {};
				for (var metricName in gr.routeMetricMap) {
					if (metricName != 'stop') {
						routeValues[metricName] = routeData[gr.routeMetricMap[metricName]];
					};
				};

				oneDay["route"] = routeValues;
				selectionData[date] = oneDay;
			});
			tc.selectionData = selectionData;
			console.log("selectionData", selectionData);
		},


		redrawMap: function() {
			console.log("redrawing map...");
			
			// default the map view to direction '0' when user selects 'all' directions
			var dir = tc.selection.direction;
			if (dir == "2") {
				dir = "0";
				console.log("direction ALL selected; defaulting to 0");
			}; 
			console.log('direction to draw:', dir);

			// get approximate center point of route, to center map view on
			var stops = tc.rawData["directions"][dir]["geo"]["features"].filter(function(feat) {
							return feat["geometry"]["type"] == "Point";
						});
			// sort-->reverse ensures that coordinates are in correct lat/lon order
			var mapCenterArray = stops[Math.round(stops.length / 2)]["geometry"]["coordinates"].sort().reverse();
			var mapCenter = L.latLng(mapCenterArray);
			console.log("mapCenter:", mapCenter);
			// setView with coordinates and zoom level
			tc.mapObject.setView(mapCenter, 13);

			// remove markers and reset layer groups
			tc.mapLayer.clearLayers();
			tc.markerGroup = L.layerGroup();
			tc.lineGroup = L.layerGroup();
			tc.mapLayer.addData(tc.rawData["directions"][dir]["geo"]);

			// console.log("adding data to map:", tc.rawData["directions"][dir]["geo"]);
			

			// set a default journey to display
			var oneFifth = Math.floor((stops.length) / 5);
			var startSeq = 2 * oneFifth;
			var endSeq = 3 * oneFifth;

			var startId = stops.filter(function(stop) {
				return stop.properties.stop_sequence == startSeq;
			})[0].properties.stop_id;
			console.log("startId", startId);

			var endId = stops.filter(function(stop) {
				return stop.properties.stop_sequence == endSeq;
			})[0].properties.stop_id;
			console.log("endId", endId);

			// emulate 'click' events on a sample journey through middle fifth of route
			tc.selection.stop = 0;
			var startMarker = tc.mapLayer.getLayer(startId)
			startMarker.fireEvent('click'); 
			var endMarker = tc.mapLayer.getLayer(endId)
			endMarker.fireEvent('click'); 

		},


		updateMetricDisplay: function() {
			console.log("updating metric display...");

			// update route-level summary
			$("#route_ewt").text(tc.selectionData[tc.selection.date]["route"]["ewt"]);
			$("#route_rbt").text(tc.selectionData[tc.selection.date]["route"]["rbt"]);
			$("#route_speed").text(tc.selectionData[tc.selection.date]["route"]["speed"]);

			// draw route-level charts
			// gr.updateCharts(tc.selectionData,
			// 				tc.selection.metric,
			// 				selectedStop,
			// 				tc.selection.date);

			// update journey metrics
			if (tc.selection.stop.constructor == Array && tc.selection.stop.length == 2) {
				var computed = tc.computeJourneyMetrics();
				console.log("computed journey:", computed);
			} else if (tc.selection.stop == 0) {
				// clear the journey metrics/maps
			};

			// draw journey-level charts
		},

		computeJourneyMetrics: function() {
			console.log("computing journey metrics...");

			var stopLookup = tc.stopLookup[tc.selection.direction];

			var startSeq = tc.selection.stop[0].feature.properties.stop_sequence;
			var endSeq = tc.selection.stop[1].feature.properties.stop_sequence;

			var computed = {};
			Object.keys(tc.selectionData).forEach(function(date) {

				var oneDay = {};
				Object.keys(tc.selectionData[date]["stops"]).forEach(function(stop_id) {

					var seq = stopLookup[stop_id]["sequence"];
					[["swt", "s_trip"], ["awt", "m_trip"], ["ewt_95", "trip_95"]].forEach(function(metricNames) {

						var waitTime = metricNames[0];
						var onboardTime = metricNames[1];

						if (seq == startSeq) {
							// originationg bus stop
							oneDay[waitTime] = tc.selectionData[date]["stops"][stop_id][waitTime];
						};
						if ((seq >= startSeq) && (seq < endSeq)) {
							// mid-journey bus stop
							if (oneDay[onboardTime]) {
								oneDay[onboardTime] += tc.selectionData[date]["stops"][stop_id][waitTime];
							} else {
								oneDay[onboardTime] = tc.selectionData[date]["stops"][stop_id][waitTime];
							}
						};
					});
				});
				computed[date] = oneDay;
			});
			return computed;
		}
	};

	// add our tc object to global window scope
	this.tc = tc;
	console.log('running tc.js');
})();
