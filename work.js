$(document).ready(function() {

Chart = function() { return this; };
Chart.prototype = {
  config: {
    margin: 10,
    bubbleMode: false
  },
  preinit: function() {
    this.root = document.getElementById("container");
    this.data = d3.range(100).map(function(d,i) {
      var ret = [];
      var count = (Math.random()>0.5?(Math.random()>0.8?3:2):1);
      for(var i=0;i<count;i++) {
        ret.push({
          date: new Date(new Date().getTime() - 86400000 * d),
          category: i + 1,
          index: parseInt(Math.random() * 800 + 200) / 10,
          elapsed: parseInt(Math.random() * 30000 + 3000) / 10,
          distance: parseInt(Math.random() * 300 + 50) / 10,
          ratio: d3.range(6).map(function(it) { return {value: Math.random()}; })
        });
      }
      return ret;
    });
    this.data = this.data.reduce(function(a,b) { return a.concat(b); }, []);
  },
  init: function() {
    var that = this;
    this.popup = d3.select(this.root).select("#popup");
    this.svg = d3.select(this.root).select("svg");
    this.calendar = this.svg.append("g").attr({class: "calendar"})
    this.xAxisGroup = this.svg.append("g").attr({class: "axis horizontal"});
    this.popdonut = this.svg.append("g").attr({class: "popup-donut"});
    this.popdonut.selectAll("path.ratio").data([0,0,0,0,0,0]).enter().append("path").attr({class: "ratio"});
    this.parsed = d3.nest().key(function(it) {
      return parseInt((it.date.getTime() - it.date.getDay() * 86400 * 1000) / 86400000) * 86400000;
    }).entries(this.data);
    this.parsed.sort(function(a,b) { return b.key - a.key });
    this.parsed.forEach(function(week) {
      week.days = d3.nest().key(function(it) {
        return it.date.getDay();
      }).entries(week.values);
    });
  },
  pad: function(v, len) {
    if(typeof(len)=="undefined") len = 2;
    v = (v + "");
    len = len - v.length;
    return (new Array(len>0?len:0).join("0") + v);
  },
  period: function(date) {
    var that = this;
    var start = new Date(parseInt(date));
    var end = new Date(parseInt(date) + 86400 * 7 * 1000);
    if( (new Date().getTime() - start.getTime()) < 86400 * 7 * 1000 ) return "本週";
    return [start,end].map(function(d) {
      return (that.pad(d.getMonth() + 1)) + "/" + (that.pad(d.getDate()));
    }).join(" - ");
    return [start,end].map(function(d) {
      [d.getYear() + 1900, d.getMonth(), d.getDate()].join("/")
    }).join(" - ");
  },
  bind: function() {
    var that = this;
    this.xAxisGroup.selectAll("g.tick").data([0,1,2,3,4,5,6])
    .enter().append("g").attr({class: "tick"}).each(function(d,i) {
      var node = d3.select(this);
      node.append("text").text("週"+["日","一","二","三","四","五","六"][d]);
    });
    this.calendar.selectAll("g.week").data(this.parsed)
    .enter().append("g").attr({class: "week"}).each(function(d,i) {
      var node = d3.select(this);
      var labels = node.append("g").attr({class: "labels"});
      var elapsed = parseInt(d.values.reduce(function(a,b) { return a + b.elapsed; }, 0));
      var hours = parseInt(elapsed / 360)/10;
      var minutes = parseInt((elapsed % 3600) / 60);
      var seconds = (elapsed % 60);
      var distance = parseInt(d.values.reduce(function(a,b) { return a + b.distance; }, 0) * 10)/10 + "km";
      var index = parseInt(d.values.reduce(function(a,b) { return a + b.index; }, 0) * 10)/10;
      elapsed = (hours?hours + "小時": minutes + "分鐘");
      node.append("line");
      labels.append("text").attr({class: "period value"}).text(that.period(d.key));
      labels.append("text").attr({class: "elapsed label"}).text("總時間");
      labels.append("text").attr({class: "distance label"}).text("總長");
      labels.append("text").attr({class: "index label"}).text("壓力指數");
      labels.append("text").attr({class: "elapsed value"}).text(elapsed);
      labels.append("text").attr({class: "distance value"}).text(distance);
      labels.append("text").attr({class: "index value"}).text(index);
      node.selectAll("g.day").data(d.days).enter().append("g").attr({class: "day"})
      .each(function(d,i) {
        var node = d3.select(this);
        var pie = node.append("g").attr({class: "pie"});
        var sum = d.values.reduce(function(a,b) { return a + b.value; }, 0)
        d.radius = that.rscale(sum);
        d.values.forEach(function(it) { delete it.parent; });
        d.values.map(function(it,i) {
          it.a = it.x;
          it.da = it.dx;
          it.outradius = d.radius;
        });
        that.pack.size([d.radius * 2, d.radius * 2]).nodes({children: d.values});
        pie.selectAll("path.data").data(d.values).enter().append("path").attr({class: "data"})
        .on("click", function(data,i) {
          var box = that.popup[0][0].getBoundingClientRect();
          that.popup.style({
            position: "absolute",
            top: ( d3.event.clientY + document.body.scrollTop + data.r + 25) + "px",
            left: ( d3.event.clientX - box.width / 2) + "px",
          });
          popdonut = that.popdonut[0][0];
          popdonut.parentNode.removeChild(popdonut);
          this.parentNode.appendChild(popdonut);
          that.partition({children: data.ratio});
          that.popdonut.selectAll("path.ratio").data(data.ratio).attr({

            fill: function(d,i) {
              return d3.rgb(that.color(data.category)).darker(3).brighter(i).toString();
            },
            stroke: "#fff",
            "stroke-width": 1,
            opacity: 0.8,
            transform: function(d,i) {
              return [
                "translate(",
                data.x - data.outradius,
                data.y - data.outradius,
                ")"
              ].join(" ");
            }
          }).transition().duration(500).ease("exp-out").attrTween("d", function(d,i) {
            return function(t) {
              return that.arc
                .padRadius(0.01)
                .startAngle(d.x)
                .endAngle(d.x + d.dx)
                .innerRadius(data.r + 1 * t)
                .outerRadius(data.r + 7 * t)();
            };
          });
        })
      });
    });
  },
  resize: function() {
    var that = this;
    this.box = this.root.getBoundingClientRect();
    this.maxIndex = 200; // experience value
    this.weekHeight = 145; // suggested minimum: 135
    this.radius = 40; // 0 for auto
    this.dayWidth = 120; // 0 for auto
    this.weekPadding = 10;
    this.dayPadding = 10;
    this.labelsPadding = 20;
    this.labelsWidth = 140;
    this.xAxisHeight = 60;
    this.height = (this.weekHeight * ( this.parsed.length + 1) + this.xAxisHeight + 2 * this.config.margin);
    this.height = (this.height > this.box.height ? this.height : this.box.height);
    this.radius = (this.radius > (this.weekHeight - 2 * this.weekPadding ) / 2
        ? ( this.weekHeight - 2 * this.weekPadding ) / 2 
        : ( this.radius < 24 ? 24 : this.radius )
    );
    this.dayWidth = (this.dayWidth - 2 * this.dayPadding >= this.radius * 2? this.dayWidth : this.radius * 2);
    this.svg.attr({
      width: this.box.width,
      height: this.height,
      viewBox: [0,0,this.box.width,this.height].join(" ")
    });
    this.arc = d3.svg.arc().innerRadius(0).outerRadius(this.radius);
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
    this.rscale = d3.scale.linear().domain([0,this.maxIndex]).range([0,this.radius]);
    this.pack = d3.layout.pack().size([this.dayWidth, this.weekHeight]).padding(6);
  },
  render: function() {
    var that = this;
    this.xAxisGroup.attr({
      transform: [
        "translate(",
        (this.labelsWidth + this.labelsPadding + this.config.margin),
        (this.xAxisHeight + this.config.margin),
        ")"].join(" ")
    }).selectAll("g.tick").attr({
      transform: function(d,i) {
        return ["translate(",(that.dayWidth * (i + 0.5)),-10,")"].join(" ");
      }
    }).select("text").attr({
      "text-anchor": "middle"
    });
    this.svg.selectAll("g.calendar").attr({
      transform: ["translate(", this.config.margin, this.config.margin + this.xAxisHeight, ")"].join(" ")
    });
    this.svg.selectAll("g.week")
    .attr({
      transform: function(d,i) {
        return "translate(0," + (50 + i * ( that.weekHeight )) + ")";
      }
    })
    .each(function(d,i) {
      var node = d3.select(this);
      node.select("g.labels").attr({
        transform: "translate(0,-45)"
      });
      node.selectAll("text").attr({
        "dominant-baseline": "middle",
        "text-anchor": "end",
        "font-size": "0.8em"
      });
      node.select("line").attr({
        x1: that.labelsWidth + that.labelsPadding,
        y1: 0,
        x2: that.labelsWidth + that.labelsPadding + 7 * that.dayWidth,
        y2: 0,
        stroke: "#000",
        opacity: 0.4,
        "stroke-dasharray": "2 3",
        "stroke-width": 1
      });
      node.selectAll("text.label").attr({ "font-weight": 900, opacity: 0.5, "font-size": "0.7em" });
      node.select("text.distance.label").attr({ dy: 25, dx: that.labelsWidth});
      node.select("text.elapsed.label").attr({ dy: 25,  dx: 60});
      node.select("text.distance.value").attr({ dy: 40, dx: that.labelsWidth});
      node.select("text.elapsed.value").attr({ dy: 40,  dx: 60});
      node.select("text.period").attr({
        dx: that.labelsWidth
      });
      node.select("text.index.label").attr({
        dy: 65, dx: that.labelsWidth,
      });
      node.select("text.index.value").attr({
        dy: 85, dx: that.labelsWidth,
        "font-size": "1.6em"
      });
      node.selectAll("g.day")
      .attr({
        transform: function(d,i) { 
          return [
            "translate(",
            (that.labelsWidth + that.labelsPadding + (i + 0.5) * that.dayWidth),
            0,
            ")"
          ].join(" ");
        }
      })
      .each(function(data,i) {
        var node = d3.select(this);
        node.selectAll("path.data").transition().duration(500).attr({
          transform: function(d,i) {
            return (that.config.bubbleMode
              ? [
                  "translate(",
                  d.x - data.radius,
                  d.y - data.radius,
                  ")"
                ].join(" ")
              : "translate(0 0)"
            );
          },
          fill: function(d,i) { return that.color(d.category); },
          stroke: "#fff"
        }).attrTween("d", function(d,i) {
          return function(t) {
            return (that.config.bubbleMode
              ? that.arc
                  .startAngle(d.a * (1 - t))
                  .endAngle(d.a + d.da + (Math.PI * 2 - d.a - d.da) * (t))
                  .innerRadius(0)
                  .outerRadius(data.radius + (d.r - data.radius) * t)()
              : that.arc
                  .startAngle(d.a)
                  .endAngle(d.a + d.da)
                  .innerRadius(0)
                  .outerRadius(data.radius)()
            );
          }
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

setTimeout(function() {
  chart.config.bubbleMode = true;
  chart.render();
},1000);
}); //endoffile