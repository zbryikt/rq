$(document).ready(function() {

  var chart = plotdb.create(RQCalendar);
  chart.config = {
    margin: 10,
    fontSize: 12,
    bubbleMode: true,
    timeUnit: "分鐘",
    speedUnit: "公里/小時",
    distanceUnit: "公里",
    thresholdIndex: 40,
    premium: true,
    rankPalette: {colors: [
      {hex: "#777777"},
      {hex: "#5BC0DE"},
      {hex: "#5CB85C"},
      {hex: "#337AB7"},
      {hex: "#2CE8CE"},
      {hex: "#F0AD4E"},
      {hex: "#D9534F"}
    ]}
  };
  chart.on("lazyloading", function(lastDate) {
    d3.select("#loader").style({display: "block"});
    /* v replace this with your own code v */
    newData = genData(10,lastDate);
    /* ^ replace this with your own code ^ */
    plotdb.update(chart, newData);
  });

  $.ajax("data.json").done(function(rqdata) {

    plotdb.init(chart);
    plotdb.update(chart, rqdata);
    plotdb.render(chart);

    /* set scrollToToday = true if we need to reset scrollbar to today position */
    if(typeof(scrollToToday) != "undefined") {
      setTimeout(function() {
      document.body.scrollTop = (
        document.body.scrollTop + chart.svg[0][0].getBoundingClientRect().top + 
        chart.xAxisHeight + chart.config.margin +
        chart.weekHeight * chart.parsed.filter(function(it) { return it.key > new Date().getTime(); }).length
      );
      }, 1000);
    }
  });
});


/* placeholder function to generate data without server */
var genData = function(size, start) {
  if(typeof(start) == "undefined") start = new Date();
  var ret = d3.range(size).map(function(d,i) {
    var ret = [];
    var count = (Math.random()>0.5?(Math.random()>0.8?3:2):1);
    for(var i=0;i<count;i++) {
      ret.push({
        date: new Date(start.getTime() - 86400000 * ( d - 20)),
        category: i,
        index: parseInt(Math.random() * 400 + 100) / 10,
        elapsed: parseInt(Math.random() * 30000 + 3000) / 10,
        distance: parseInt(Math.random() * 300 + 50) / 10,
        rate: parseInt(Math.random() * 30 + 30) / 10,
        name: "跑步訓練",
        url: "#",
        ratio: d3.range(6).map(function(it) { return {value: Math.random()}; })
      });
    }
    return ret;
  });
  ret = ret.reduce(function(a,b) { return a.concat(b); }, []);
  return ret;
}
