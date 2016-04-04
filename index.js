$(document).ready(function() {

Chart = function() { return this; };
Chart.prototype = {
  preinit: function() {
    this.root = document.getElementById("root");
    this.data = d3.range(100).map(function(d,i) {
      var ret = [];
      var count = (Math.random()>0.5?(Math.random()>0.8?3:2):1);
      for(var i=0;i<count;i++) {
        ret.push({
          date: new Date(new Date().getTime() - 86400000 * d),
          category: i + 1,
          index: parseInt(Math.random() * 800 + 200) / 10,
          elapsed: parseInt(Math.random() * 1000 + 200) / 10,
          distance: parseInt(Math.random() * 300 + 50) / 10,
          ratio: d3.range(6).map(function(it) { return Math.random(); })
        });
      }
      return ret;
    });
    this.data = this.data.reduce(function(a,b) { return a.concat(b); }, []);
    console.log(this.data);
  },
  init: function() {
    var that = this;
    this.svg = d3.select(this.root).select("svg");
    this.calendar = this.svg.append("g").attr({class: "calendar"})
    this.parsed = d3.nest().key(function(it) {
      return (it.date.getTime() - it.date.getDay() * 86400000);
    }).entries(this.data);
    this.parsed.sort(function(a,b) { return a.key - b.key });
    this.parsed.forEach(function(week) {
      week.days = d3.nest().key(function(it) {
        return it.date.getDay();
      }).entries(week.values);
    });
    console.log(this.parsed);
  },
  bind: function() {
    var that = this;
    this.calendar.selectAll("g.week").data(this.parsed)
    .enter().append("g").attr({class: "week"}).each(function(d,i) {
      var node = d3.select(this);
      node.selectAll("g.day").data(d.days).enter().append("g").attr({class: "day"})
      .each(function(d,i) {
        var node = d3.select(this);
        var pie = node.append("g").attr({class: "pie"});
        pie.selectAll("path.data").data(d.values).enter().append("path").attr({class: "data"});
      });
    });
  },
  resize: function() {
    var that = this;
    var box = this.root.getBoundingClientRect();
    this.svg.attr({
      width: box.width,
      height: box.height,
      viewBox: [0,0,box.width,box.height].join(" ")
    });
    this.arc = d3.svg.arc().innerRadius(0).outerRadius(50);
    this.partition = d3.layout.partition().size([Math.PI * 2, 1]);
    this.parsed.map(function(d,i) {
      d.days.map(function(d,i) {
        var root = {children: d.values.map(function(d,i) { 
          d.value = d.index;
          return d;
        })};
        that.partition(root);
      });
    });
    this.color = d3.scale.ordinal().range(["#009999","#ffaa00","#ff0000"]);
  },
  render: function() {
    var that = this;
    this.svg.selectAll("g.week")
    .attr({
      transform: function(d,i) { return "translate(0," + (50 + i * 100) + ")"; }
    })
    .each(function(d,i) {
      var node = d3.select(this);
      node.selectAll("g.day")
      .attr({
        transform: function(d,i) { return "translate("+ (50 + i * 100) + ",0)" }
      })
      .each(function(d,i) {
        var node = d3.select(this);
        var sum = d.values.reduce(function(a,b) { return a + b.value; }, 0)
        that.arc.outerRadius(sum / 6);
        node.selectAll("path.data").attr({
          d: function(d,i) {
            return that.arc.startAngle(d.x).endAngle(d.x + d.dx)();
          },
          fill: function(d,i) { return that.color(d.category); },
          stroke: "#fff"
        });
      });
    });
  }
};

var chart = new Chart();
chart.preinit();
chart.init();
chart.resize();
chart.bind();
chart.render();
}); //endoffile

