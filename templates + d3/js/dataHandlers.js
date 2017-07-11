var chart1 = d3.select("#month-chart").append("svg")
                .attr("width","720")
                .attr("height","240");

var chart2 = d3.select("#week-chart").append("svg")
                .attr("width","720")
                .attr("height","240"); 

var chart3 = d3.select("#stop-chart").append("svg")
                .attr("width","720")
                .attr("height","240"); 

var margin = {top: 20, right: 40, bottom: 30, left: 50};
var width = +chart1.attr("width") - margin.left - margin.right;
var height = +chart1.attr("height") - margin.top - margin.bottom;

var width2 = +chart2.attr("width") - margin.left - margin.right;
var height2 = +chart2.attr("height") - margin.top - margin.bottom;

var width3 = +chart3.attr("width") - margin.left - margin.right;
var height3 = +chart3.attr("height") - margin.top - margin.bottom;

var x = d3.scaleTime().range([0, width]);
var y = d3.scaleLinear().range([height, 0]);

var x2 = d3.scaleTime().range([0, width2]);
var y2 = d3.scaleLinear().range([height2, 0]);

var x3 = d3.scaleLinear().range([0, width3]);
var y3 = d3.scaleLinear().range([height3, 0]);

var parseTime = d3.timeParse("%Y-%m-%d");

var line = d3.line()
                .curve(d3.curveLinear)
                .x(function(d){ return x(d.date);})
                .y(function(d){ return y(d.ewt);});
var line2 = d3.line()
                .curve(d3.curveLinear)
                .x(function(d){ return x2(d.date);})
                .y(function(d){ return y2(d.ewt);});
var line3 = d3.line()
                .curve(d3.curveLinear)
                .x(function(d){ return x3(d.stop);})
                .y(function(d){ return y3(d.ewt);});

var data;
d3.json("data.json").get(function(error,alldata) {
    if (error) throw error;
    data = alldata;
    updateChart();
});

var route = '{{ route }}'
var dataURL = `/routes/${route}/data`;
  $.getJSON(dataURL, function(data) {
    // here is where JS gets acccess to all route data, so we can call functions from other JS files here.
        tc.initialize(data);
    });


function updateChart(){
  var day_ind  = d3.select('input[name=daybin]:checked').attr('value');
  var hour_ind = d3.select('input[name=hourbin]:checked').attr('value');
  var dir_ind = d3.select('input[name=direction]:checked').attr('value');

  var ooo = data.directions[dir_ind].daybins[day_ind].hourbins[hour_ind];

  var dateArray = [];
  var ewtArray = [];
  for(var i = 0; i < ooo.length; i++){
    var dates = ooo[i];
    dateArray.push(dates[0]);
    var stoplength = dates[1].length;
    ewtArray.push(dates[1][stoplength-1][1]);
  }

  var chartcontent = [];
  for (var i = 0; i < dateArray.length; i++) {
    chartcontent.push({date:parseTime(dateArray[i]),ewt:ewtArray[i]});
  }

  x.domain(d3.extent(chartcontent, function(d,i) { return d.date; }));
  y.domain([0,d3.max(ewtArray)]);

  function make_x_gridlines(x) {   
      return d3.axisBottom(x)
          .ticks(7)
  }

  // gridlines in y axis function
  function make_y_gridlines(y) {   
      return d3.axisLeft(y)
          .ticks(5)
  }

//-------------------chart1----------------------------------------------------------------------------  
  var g = chart1.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  // add the X gridlines
  g.append("g")     
      .attr("class", "grid")
      .attr("transform", "translate(0," + height + ")")
      .attr("stroke-width", "2")
      .call(make_x_gridlines(x)
          .tickSize(-height)
          .tickFormat("")
      )

  // add the Y gridlines
  g.append("g")     
      .attr("class", "grid")
      .attr("stroke-width", "2")
      .call(make_y_gridlines(y)
          .tickSize(-width)
          .tickFormat("")
      )

  g.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).ticks(7))
      .select(".domain");

  //yaxis
  g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em");

  g.append("text")
            .attr("text-anchor", "middle")  
            .attr("transform", "translate(" +(-20) +","+(height/2)+")rotate(-90)")  
            .text("Eccess Wait Time(min)");
  
  g.append("path")
      .attr("class", "line")
      .attr("d", line(chartcontent));


//-------------------chart2----------------------------------------------------------------------------

  var g2 = chart2.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  var dateArray2 = [];
  var ewtArray2 = [];
  for(var i = 0; i < 7; i++){
    var dates = ooo[i];
    dateArray2.push(dates[0]);
    var stoplength = dates[1].length;
    ewtArray2.push(dates[1][stoplength-1][1]);
  }

  var chartcontent2 = [];
  for (var i = 0; i < dateArray2.length; i++) {
    chartcontent2.push({date:parseTime(dateArray2[i]),ewt:ewtArray2[i]});
  }

  x2.domain(d3.extent(chartcontent2, function(d,i) { return d.date; }));
  y2.domain([0,d3.max(ewtArray2)]);

  // add the X gridlines
  g2.append("g")     
      .attr("class", "grid")
      .attr("transform", "translate(0," + height2 + ")")
      .attr("stroke-width", "2")
      .call(make_x_gridlines(x2)
          .tickSize(-height2)
          .tickFormat("")
      )

  // add the Y gridlines
  g2.append("g")     
      .attr("class", "grid")
      .attr("stroke-width", "2")
      .call(make_y_gridlines(y2)
          .tickSize(-width2)
          .tickFormat("")
      )

  g2.append("g")
      .attr("transform", "translate(0," + height2 + ")")
      .call(d3.axisBottom(x2).ticks(7))
      .select(".domain");

  //yaxis
  g2.append("g")
      .call(d3.axisLeft(y2).ticks(5))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em");

  g2.append("text")
            .attr("text-anchor", "middle")  
            .attr("transform", "translate(" +(-20) +","+(height2/2)+")rotate(-90)")  
            .text("Eccess Wait Time(min)");
  
  g2.append("path")
      .datum(chartcontent2)
      .attr("class", "line")
      .attr("d", line2);

//-------------------chart3----------------------------------------------------------------------------

  var g3 = chart3.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  var stopArray3 = [];
  var ewtArray3 = [];

  for(var i = 0; i < ooo[0][1].length-1; i++){
    var stops = ooo[0][1][i];
    stopArray3.push(stops[0]);
    ewtArray3.push(stops[1]);
  }

  var chartcontent3 = [];
  for (var i = 0; i < stopArray3.length; i++) {
    chartcontent3.push({stop:stopArray3[i],ewt:ewtArray3[i]});
  }

  x3.domain([d3.min(stopArray3),d3.max(stopArray3)]);
  y3.domain([0,d3.max(ewtArray3)]);
  // add the X gridlines
  g3.append("g")     
      .attr("class", "grid")
      .attr("transform", "translate(0," + height3 + ")")
      .attr("stroke-width", "2")
      .call(make_x_gridlines(x3)
          .tickSize(-height3)
          .tickFormat("")
      )

  // add the Y gridlines
  g3.append("g")     
      .attr("class", "grid")
      .attr("stroke-width", "2")
      .call(make_y_gridlines(y3)
          .tickSize(-width3)
          .tickFormat("")
      )

  g3.append("g")
      .attr("transform", "translate(0," + height3 + ")")
      .call(d3.axisBottom(x3).ticks(7))
      .select(".domain");

  //yaxis
  g3.append("g")
      .call(d3.axisLeft(y3).ticks(5))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em");

  g3.append("text")
            .attr("text-anchor", "middle")  
            .attr("transform", "translate(" +(-20) +","+(height3/2)+")rotate(-90)")  
            .text("Eccess Wait Time(min)");
  
  g3.append("path")
      .datum(chartcontent3)
      .attr("class", "line")
      .attr("d", line3);

}

function updateData(){
d3.selectAll("g").remove();
updateChart();
} 
