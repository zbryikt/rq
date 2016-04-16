$(document).ready(function() {

  var chart = plotdb.create(RQCalendar);
  chart.config = {
    margin: 10,
    padding: 10,
    timeUnit: "分鐘",
    speedUnit: "/公里",
    distanceUnit: "公里",
    thresholdIndex: 40,
    minRadius: 5,
    minIndex: 0.3,
    premium: false,
    typePalette: {colors: [
      {hex: "#009999", name: "訓練"},
      {hex: "#ffaa00", name: "比賽"},
      {hex: "#ff0000", name: "其它"}
    ]},
    rankPalette: {colors: [
      //{hex: "#777777", name: "-"},
      {hex: "#5BC0DE", name: "E"},
      {hex: "#5CB85C", name: "M"},
      {hex: "#337AB7", name: "T"},
      {hex: "#2CE8CE", name: "A"},
      {hex: "#F0AD4E", name: "I"},
      {hex: "#D9534F", name: "R"}
    ]}
  };

  plotdb.init(chart, document.getElementById("rqcal-root"));
  d3.select("#rqcal-loader").style({display: "block"});
  $.ajax("data.json").done(function(rqdata) {
    d3.select("#rqcal-loader").style({display: "none"});
    plotdb.update(chart, [
      {date: new Date(),fake: true},
      {date: new Date(new Date().getTime() - 86400000 * 13),fake: true}
    ]);
    plotdb.update(chart, rqdata);
    plotdb.render(chart);

    var loading = false;
    chart.on("lazyloading", function(lastDate) {
      /* sample data loader */
      if(loading) return;
      loading = true;
      d3.select("#rqcal-loader").style({display: "block"});
      setTimeout(function() {
        newData = genData(30,lastDate);
        plotdb.update(chart, newData); // use update to insert data
        d3.select("#rqcal-loader").style({display: "none"});
        loading = false;
      }, 1000);
    });

    /* set scrollToToday = true if we need to reset scrollbar to today position */
    if(false) chart.scrollToToday(false /* true for animation */);
  });
});


/* placeholder function to generate data without server */
/* only for debugging purpose */
var genData = function(size, start) {
  if(typeof(start) == "undefined") start = new Date();
  var ret = d3.range(size).map(function(d,i) {
    var ret = [];
    var count = (Math.random()>0.5?(Math.random()>0.8?3:2):1);
    count = parseInt(Math.random() * 3) + 1;
    for(var i=0;i<count;i++) {
      ret.push({
        date: new Date(start.getTime() - 86400000 * ( d + 1 )),
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
