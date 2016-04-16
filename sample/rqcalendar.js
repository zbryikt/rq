var module = {};


function RQCalendar() { return this; };
RQCalendar.prototype = {
  init: function() {
    var that = this;
    this.root = d3.select(this.root);
    this.svg = this.root.select("svg");
    this.weeklabel = this.root.select("#rqcal-weeklabel");
    this.dateindex = this.root.select("#rqcal-dateindex");
    this.legends = this.root.select("#rqcal-legends");
    this.legendsType = this.root.select("#rqcal-legends-type");
    this.legendsIntensity = this.root.select("#rqcal-legends-intensity");
    this.popuppanel = this.root.select("#rqcal-popup")
    .on("click", function() {
      d3.event.cancelBubble = true;
      d3.event.preventDefault();
      return false;
    });
    this.popuppanel.select("select").on("change", function() {
      var value = that.popuppanel.select("select")[0][0].value;
      if(that.lastdata) that.lastdata.category = value;
      that.handle("categorychange", [that.lastdata, value]);
      that.render();
    });
    this.popdonut = this.svg.append("g").attr({class: "popup-donut"});
    this.popdonut.selectAll("path.ratio").data([0,0,0,0,0,0]).enter().append("path").attr({class: "ratio"});
    this.infoTemplate = this.root.select("#rqcal-info-template")[0][0].innerHTML;
    this.infoGroup = this.root.select("#rqcal-infos");
    this.today = this.root.select("#rqcal-today");
    window.addEventListener("click", function(it) { that.popup(); });
    window.addEventListener("scroll", function(it) { that.scroll(); });
    this.partition = d3.layout.partition().size([Math.PI * 2, 1]);
    this.arc = d3.svg.arc().innerRadius(0);
  },
  weekInit: function(week) {
    var ret = {
      days: [], values: [], key: week.key,
      elapsed: 0, distance: 0, index: 0,
      period: this.aux.period(week.key)
    };
    for(var i = 0; i < 7; i++) {
      ret.days.push({
        wkey: parseInt(ret.key),
        key: i,
        values: []
      });
    }
    return ret;
  },
  weekMerge: function(week, raw) {
    var that = this;
    week.values = week.values.concat(raw.values);
    days = d3.nest().key(function(it) {
      return that.aux.getDay(it.date);
    }).map(raw.values);
    for(var i = 0; i < 7; i++) {
      week.days[i].values = week.days[i].values.concat(days[i]?days[i]:[]);
      if(days[i]) days[i].forEach(function(it) {
        it.day = i;
        it.wkey = parseInt(week.key);
      });
    }
    week.elapsed = parseInt(week.values.reduce(function(a,b) { return a + b.elapsed; }, 0));
    week.distance = parseInt(week.values.reduce(function(a,b) { return a + b.distance; }, 0) * 10)/10;
    week.index = parseInt(week.values.reduce(function(a,b) { return a + b.index; }, 0) * 10)/10;
    week.period = that.aux.period(week.key);
  },

  weekmap: {},

  update: function(data, reset) {
    var that = this;
    data.forEach(function(it) {
      it.date = that.aux.date(it.date);
      if(!it.category) it.category = 0;
      if(!it.index) it.index = 0;
      if(!it.elapsed) it.elapsed = 0;
      if(!it.distance) it.distance = 0;
      if(!it.rate) it.rate = 0;
    });
    parsed = d3.nest().key(function(it) {
      day = that.aux.getDay(it.date);
      //key = parseInt((it.date.getTime() - day * 86400 * 1000) / 86400000) - 16839;
      return parseInt((it.date.getTime() + 8 * 3600000 - day * 86400 * 1000) / 86400000) * 86400000;
    }).entries(data);

    parsed = parsed.map(function(it) {
      var ret = null;
      if(!that.weekmap[it.key]) {
        ret = that.weekmap[it.key] = that.weekInit(it);
      }
      that.weekMerge(that.weekmap[it.key], it);
      return ret;
    }).filter(function(it) { return it; });
    this.parsed = (this.parsed || []).concat(parsed);
    this.parsed.sort(function(a,b) { return b.key - a.key});
    omit = [];
    for(var i=0, start = this.parsed[0].key;i<this.parsed.length;i++) {
      var time = start - ((i + omit.length) * 86400 * 7 * 1000);
      if(this.parsed[i].key != time) {
        omit.push(that.weekInit({key: time}));
        i--;
      }
    }
    this.parsed = this.parsed.concat(omit).sort(function(a,b) { return b.key - a.key; });
    parsed = parsed.concat(omit);
    /*
    parsed.forEach(function(week,weekidx) {
      days = d3.nest().key(function(it) {
        return that.aux.getDay(it.date);
      }).map(week.values);
      week.days = [];
      for(var i = 0; i < 7; i++) {
        week.days.push({
          wkey: parseInt(week.key),
          key: i,
          values: (days[i]?days[i]:[])
        });
        week.days[i].values.forEach(function(d) { 
          d.day = i;
          d.wkey = parseInt(week.key);
        });
      }
      week.elapsed = parseInt(week.values.reduce(function(a,b) { return a + b.elapsed; }, 0));
      week.distance = parseInt(week.values.reduce(function(a,b) { return a + b.distance; }, 0) * 10)/10;
      week.index = parseInt(week.values.reduce(function(a,b) { return a + b.index; }, 0) * 10)/10;
      week.period = that.aux.period(week.key);
    });
    */
    days = parsed.reduce(function(a,b) { return a.concat(b.days); }, []);
    this.days = (this.days || []).concat(days);
    var lastday = d3.max(this.parsed[0].days.map(function(it) { return parseInt(it.key); }));
    this.basetime = d3.max(this.parsed[0].days.map(function(it) { return parseInt(it.wkey); }));
    for(var item,i = lastday + 1; i < 7; i++) {
      item = {key: i+"", values: [{shadow: true}], shadow: true};
      this.parsed[0].days.push(item);
    }
    this.dates = [];
    var end = new Date(parseInt(this.parsed[0].key));
    var start = new Date(parseInt(this.parsed[this.parsed.length - 1].key));
    end = [end.getYear(), end.getMonth()];
    start = [start.getYear(), start.getMonth()];
    var delta = end[0] - start[0] + 1;
    this.dates = d3.range(delta).map(function(y) {
      return {
        key: start[0] + y + 1900,
        values: d3.range(12).filter(function(m) {
          return !((y == 0 && m < start[1]) || (y == delta - 1 && m > end[1]));
        }).map(function(m) { return m + 1; }).sort(d3.descending)
      };
    }).sort(function(a,b) { return b.key - a.key; });
  },
  bind: function() {
    var that = this;
    this.infoGroup.selectAll("div.rqcal-info").data(this.parsed)
    .enter().append("div").attr({class: "rqcal-info"}).each(function(d,i) {
      this.innerHTML = that.infoTemplate;
    });
    this.svg.selectAll("g.winfo-group").data(this.parsed)
    .enter().append("g").attr({class: "winfo-group"}).each(function(d,i) {
      var node = d3.select(this);
      node.append("rect").attr({width: 20,height:20,x:0,y:0,fill: "rgba(0,0,0,0.01)"}); 

    });
    this.svg.selectAll("line.weekline").data(this.parsed)
    .enter().append("line").attr({class: "weekline"});
    this.svg.selectAll("g.data-group").data(this.days)
    .enter().append("g").attr({class: "data-group"});
    this.svg.selectAll("g.data-group").each(function(d,i) {
      var node = d3.select(this);
      node.selectAll("rect").data([0])
      .enter().append("rect").attr({width: 20,height:20,x:0,y:0,fill: "rgba(0,0,0,0.01)"})
      .on("click", function(d,i) { console.log(d); });
      node.selectAll("circle.data").data(d.values)
      .enter().append("circle").attr({class: "data"})
      .on("click", function(d,i) {
        that.popup(this,d,i);
        d3.event.preventDefault();
        d3.event.cancelBubble = true;
        return false;
      });
      node.selectAll("text").data([0])
      .enter().append("text").text(that.aux.cday(d.key));
    });
    this.dateindex.selectAll("div.index-year-group").data(this.dates)
    .enter().append("div").attr({class: "index-year-group"});
    this.dateindex.selectAll("div.index-year-group").each(function(year,i) {
      var node = d3.select(this);
      node.selectAll("div.index-year").data([year.key])
      .enter().append("div").attr({class: "index-year"}).text(function(it) { return it; })
      .on("click", function(d,i) { that.indexToggle(year.key); });
      node.selectAll("div.index-month").data(year.values)
      .enter().append("div").attr({class: "index-month"})
      .text(function(d,i) { return d; })
      .on("click", function(d) {
        var date = new Date(year.key, d).getTime();
        var count = that.parsed.filter(function(it) { return parseInt(it.key) > date; }).length;
        var offset = ( that.base.top + that.config.margin + that.xAxisHeight + that.weekHeight * count );
        var lastoffset = document.body.scrollTop;
        d3.select(document.body).transition().duration(1000).tween("scrolltop", function() {
          return function(t) {
            this.scrollTop = (1 - t) * lastoffset + t * offset;
          }
        });
      });
    });
    that.indexToggle(that.toggleYear || this.dates[0].key);
    this.legendsType.selectAll("div.legend-entry").data(this.config.typePalette.colors)
    .enter().append("div").attr({class: "legend-entry"}).each(function(d,i) {
      var node = d3.select(this);
      node.append("div").attr({class: "legend-mark"});
      node.append("div").attr({class: "legend-name"}).text(function(d,i) { return d.name; });
    });

    this.legendsIntensity.selectAll("div.legend-entry").data(this.config.rankPalette.colors)
    .enter().append("div").attr({class: "legend-entry"}).each(function(d,i) {
      var node = d3.select(this);
      node.append("div").attr({class: "legend-mark"});
      node.append("div").attr({class: "legend-name"}).text(function(d,i) { return d.name; });
    });
  },
  resize: function() {
    var that = this;
    var box = this.root[0][0].getBoundingClientRect();
    this.config.fontSize = 12;
    this.base = {
      top: this.svg[0][0].getBoundingClientRect().top + document.body.scrollTop,
      left: this.svg[0][0].getBoundingClientRect().left + document.body.scrollLeft
    };
    this.vpHeight = window.innerHeight;
    this.width = box.width;
    this.height = box.height;
    this.xAxisHeight = 20;
    this.infoWidth = 13 * that.config.fontSize;
    this.legendWidth = 4 * that.config.fontSize;
    this.mobile = this.width < 600;
    if(this.mobile) this.infoWidth = 8 * that.config.fontSize;
    this.visWidth = (this.width - this.config.margin * 2 - this.infoWidth - this.legendWidth);
    this.dayWidth = (this.mobile ? this.visWidth : this.visWidth / 7);
    this.dayHeight = (this.mobile
        ? (this.vpHeight - 2 * (this.config.margin + this.config.padding) - this.xAxisHeight) / 7
        : this.dayWidth
    );
    if(!this.mobile && this.dayHeight < 100) this.dayHeight = 100;
    this.weekHeight = (this.mobile
        ? this.vpHeight - this.xAxisHeight - 2 * (this.config.margin + this.config.padding)
        : this.dayHeight
    );
    this.infoHeight = this.weekHeight;
    this.height = this.weekHeight * this.parsed.length + this.config.margin * 2 + this.xAxisHeight;
    this.radius = (this.dayWidth > this.dayHeight ? this.dayHeight : this.dayWidth ) / 2;
    this.svg.attr({width: this.width, height: this.height, viewBox: [0,0,this.width,this.height].join(" ")});
    this.rscale = d3.scale.linear().domain([0,this.config.minIndex,40,9999])
      .range([0,this.config.minRadius,this.radius * 0.5,this.radius * 0.5]);
  },
  render: function() {
    var that = this;
    var p = that.config.padding;
    var m = that.config.margin;
    var f = that.config.fontSize;
    this.weeklabel.style({
      "padding-left": ( that.infoWidth ) + "px",
      "margin-left": m + "px",
      display: (this.mobile ? "none" : "block" ),
      height: (that.xAxisHeight + m) + "px",
      "line-height": (that.xAxisHeight + m) + "px"
    });
    this.weeklabel.selectAll("span").style({
      width: that.dayWidth + "px"
    });
    this.infoGroup.selectAll("div.rqcal-info").style({
      top: function(d,i) {
        return (m + that.woffset(d.key) * that.weekHeight + that.xAxisHeight + that.base.top) + "px";
      },
      left: (m + that.base.left) + "px",
      width: that.infoWidth + "px"
    }).each(function(d,i) {
      var node = d3.select(this);
      node.selectAll(".value")
        .data([ d.period, parseInt(d.elapsed/60) + "時" + (d.elapsed%60) + "分", parseInt(d.distance), (that.config.premium ? d.index : "-") ])
        .text(function(it) { return it; });
      node.selectAll(".unit")
        .data([ that.config.distanceUnit])
        .text(function(it) { return it; });

    });
    this.svg.selectAll("g.winfo-group").attr({
      transform: function(d,i) {
        return that.aux.translate(
          m,
          m + that.woffset(d.key) * that.weekHeight + that.xAxisHeight
        );
      }
    }).each(function(d,i) {
      var node = d3.select(this);
      node.select("rect").attr({
        width: that.infoWidth - 2,
        height: that.infoHeight - 2,
      });
    });
    this.svg.selectAll("line.weekline").attr({
      x1: m + that.infoWidth,
      x2: that.width - that.legendWidth - m,
      y1: function(d,i) {
        return (that.woffset(d.key) + (that.mobile?0:0.5)) * that.weekHeight + m + that.xAxisHeight;
      },
      y2: function(d,i) {
        return (that.woffset(d.key) + (that.mobile?0:0.5)) * that.weekHeight + m + that.xAxisHeight;
      }
    });
    var offset = that.svg[0][0].getBoundingClientRect().top + document.body.scrollTop;
    this.root.select("#rqcal-dateindex").style({
      right: (window.innerWidth + m - (
        that.svg[0][0].getBoundingClientRect().left +
        that.svg[0][0].getBoundingClientRect().width
      )) + "px"
    });
    this.legends.style({
      right: (window.innerWidth + m - (
          that.svg[0][0].getBoundingClientRect().left +
          that.svg[0][0].getBoundingClientRect().width
        )) + "px"
    });

    this.legendsType.selectAll(".legend-mark").style({
      width: f + "px",
      height: f + "px",
      background: function(d,i) { return d.hex; }
    });
    this.legendsIntensity.selectAll(".legend-mark").style({
      width: f + "px",
      height: f + "px",
      background: function(d,i) { return d.hex; }
    });

    this.svg.selectAll("g.data-group").attr({
      opacity: function(d,i) {
        if((new Date().getTime()) < (d.wkey + d.key * 86400000)) return 0.5;
        return 1;
      },
      transform: function(d,i) {
        if(that.mobile) return that.aux.translate(
          m + that.infoWidth,
          m + that.woffset(d.wkey) * that.weekHeight + that.xAxisHeight + that.dayHeight * (6 - d.key)
        );
        return that.aux.translate(
          m + that.infoWidth + that.dayWidth * d.key,
          m + that.woffset(d.wkey) * that.weekHeight + that.xAxisHeight
        );
      }
    }).each(function(d,i) {
      if(Math.abs((new Date().getTime() - (d.wkey + d.key * 86400000)) / 86400000) < 1) 
        that.today.style({display: "block"});
      var node = d3.select(this);
      node.select("rect").attr({
        width: that.dayWidth - 2,
        height: that.dayHeight - 2,
      });
      var len = d.values.length;
      node.select("text").attr({
        x: that.dayWidth,
        dx: -that.config.fontSize,
        y: that.dayHeight / 2,
        "text-anchor": "end",
        "dominant-baseline": "middle"
      }).style({
        display: (that.mobile?"block":"none")
      });
      node.selectAll("circle.data").attr({
        cx: function(v,i) {
          return (
            ( that.dayWidth - (that.mobile ? that.config.fontSize * 2 : 0) ) / 2
            + (len>1?(that.radius / 2) * Math.cos(Math.PI * 2 * i / len):0)
          );
        },
        cy: function(v,i) {
          return that.dayHeight / 2 + (len>1?(that.radius / 2) * Math.sin(Math.PI * 2 * i / len):0);
        },
        r: function(v,i) { return (v.fake?0:that.rscale(that.config.premium ? v.index : 10)); },
        fill: function(v,i) {
          return that.config.typePalette.colors[v.category].hex;
        },
        stroke: function(v,i) {
          return (that.config.thresholdIndex < v.index ? "#ff0" : "none");
        },
        "stroke-width": 2
      });
    });
    var today = new Date();
    todayWeek = (today.getTime() - that.aux.getDay(today) * 86400000);
    todayKey = that.aux.getDay(today);
    this.todayTop = ((that.mobile
      ? m + that.woffset(todayWeek) * that.weekHeight + that.xAxisHeight + that.dayHeight * ( 6 - todayKey)
      : m + that.woffset(todayWeek) * that.weekHeight + that.xAxisHeight
    ) + (that.base.top));
    this.today.style({
      width: that.dayWidth + "px",
      height: that.dayHeight + "px",
      top: this.todayTop + "px",
      left: function() {
        return ((that.mobile
          ?  m + that.infoWidth
          : m + that.infoWidth + that.dayWidth * todayKey
        ) + (that.base.left)) + "px";
      }
    });
  },
  scrollToToday: function(anim) {
    var that = this;
    if(!anim) {
      document.body.scrollTop = (that.todayTop - that.dayHeight * 1.5);
      return;
    }
    d3.select(document.body).transition().duration(1000).tween("scrolltop", function() {
      var lasttop = document.body.scrollTop;
      return function(t) {
        this.scrollTop = (1 - t) * lasttop + t * (that.todayTop - that.dayHeight * 1.5);
      }
    });
  },
  scroll: function() {
    var that = this;
    var box = that.svg[0][0].getBoundingClientRect();
    var docbottom = document.body.scrollTop + window.innerHeight;
    var svgbottom = that.base.top + box.height;
    if(that.base.top + that.height <= document.body.scrollTop + window.innerHeight) {
      var date = new Date(
        d3.min(this.parsed[this.parsed.length - 1].days.map(function(it) {
          if(!it.values.length) return 0;
          return parseInt(it.wkey) + it.key * 86400000;
        }).filter(function(it) { return it; }))
      );
      that.handle("lazyloading", date);
    }
    that.weeklabel.classed("fixed", (box.top < 50));
    that.dateindex.classed("fixed", (box.top < 50));
    that.legends.classed("nonfixed", (docbottom >= svgbottom));
  },
  woffset: function(t) {
    return parseInt( (this.basetime - t) / (86400 * 1000 * 7) );
  },
  popup: function(n,d,i) {
    var that = this;
    var m = that.config.margin;
    var cx, cy, r = 0;
    if(n) {
      cx = parseInt(d3.select(n).attr("cx"));
      cy = parseInt(d3.select(n).attr("cy"));
      r = parseInt(d3.select(n).attr("r"));
      this.popuppanel.style({
        display: "block",
        left: function() {
          return ((that.mobile     
            ? m + that.infoWidth + cx
            : m + that.infoWidth + that.dayWidth * d.day + cx
          ) + that.base.left - this.getBoundingClientRect().width / 2) + "px";
        },
        top: function() {
          return ((that.mobile
            ? m + that.woffset(d.wkey) * that.weekHeight + that.xAxisHeight + that.dayHeight * ( d.day + 1)
            : m + that.woffset(d.wkey) * that.weekHeight + that.xAxisHeight + cy + r + 20
          ) + that.base.top )+ "px";
        }
      });
      this.root.select("#rqcal-legends-intensity").style({display: "block"});
      this.root.select("#rqcal-legends-type").style({display: "none"});
      if(!that.config.premium) this.popuppanel.select("#rqcal-popup-entry-index").style({display: "none"})
      this.popuppanel.select("a.name").attr("href", d.url);
      this.popuppanel.selectAll(".value").data([
        that.aux.prettyDate(d.date),
        d.name,
        d.distance,
        that.aux.prettyElapse(d.elapsed),
        d.rate,
        (that.config.premium ? d.index : 0)
      ]).text(function(it) { return it; });
      this.popuppanel.selectAll(".rqcal-popup-entry .unit").data([
        that.config.distanceUnit, 
        that.config.speedUnit
      ]).text(function(it) { return it; });
      this.popuppanel.select("select")[0][0].value = d.category;
      popdonut = that.popdonut[0][0];
      popdonut.parentNode.removeChild(popdonut);
      n.parentNode.appendChild(popdonut);
    }
    if(d) {
      that.partition({children: d.ratio});
      that.popdonut.selectAll("path.ratio").data(d.ratio).attr({
        stroke: "#fff",
        "stroke-width": 1,
        opacity: 0.9,
        fill: function(d,i) {
          return that.config.rankPalette.colors[i].hex;
        },
        transform: function(d,i) {
          return [ "translate(",cx + 0.5, cy + 0.5, ")" ].join(" ");
        }
      });
    }
    if(this.lastdata == d || !d) {
      this.popuppanel.style({display: "none"});
      this.root.select("#rqcal-legends-intensity").style({display: "none"});
      this.root.select("#rqcal-legends-type").style({display: "block"});
      this.popdonut.transition().duration(500).attr({opacity: 0});
      r = this.lastr;
      this.lastdata = null;
      this.lastr = 0;
    } else {
      this.popdonut.attr({opacity: 1});
      this.lastdata = d;
      this.lastr = r;
    }
    that.popdonut.selectAll("path.ratio")
    .transition().duration(500).ease("exp-out").attrTween("d", function(d,i) {
      if(d == 0) return "";
      return function(t) {
        return that.arc
          .padRadius(0.01)
          .startAngle(d.x)
          .endAngle(d.x + d.dx)
          .innerRadius(r + 2 + 1 * (that.lastr?t:1 - t))
          .outerRadius(r + 2 + 8 * (that.lastr?t:1 - t))();
      };
    });
  },
  indexToggle: function(year) {
    var that = this;
    if(typeof(year) != "undefined") that.toggleYear = year;
    that.dateindex.selectAll("div.index-year-group").each(function(d,i) {
      var open = (d.key == that.toggleYear);
      d3.select(this).selectAll("div.index-month").transition().duration(200).style({
        height: (open? "24" : 0) + "px",
        overflow: "hidden",
        padding: (open ? "" : 0),
        margin: (open ? "" : 0)
      });
    });
  }
};


RQCalendar.prototype.aux = {
  date: function(d) {
    var ret = new Date(d);
    if(!isNaN(ret.getTime())) return ret;
    if(!ret) return new Date(d);
    ret = /(\d+)\.(\d+)\.(\d+) (\d+):(\d+):(\d+)/.exec(d);
    if(ret) { return new Date(ret[1], ret[2] - 1, ret[3], ret[4], ret[5], ret[6]); }
  },
  getDay: function(d) {
    return (d.getDay() + 6 ) % 7;
  },
  translate: function(x,y) { 
    return ["translate(", x, y, ")"].join(" ");
  },
  pad: function(v, len) {
    if(typeof(len)=="undefined") len = 2;
    v = (v + "");
    len = len - v.length + 1;
    return (new Array(len>0?len:0).join("0") + v);
  },
  period: function(date) {
    var that = this;
    var start = new Date(parseInt(date));
    var end = new Date(parseInt(date) + 86400 * 6 * 1000);
    var delta = new Date().getTime() - start.getTime();
    if( delta > 0 && delta < 86400 * 7 * 1000 ) return "本週";
    return [start,end].map(function(d) {
      return (that.pad(d.getMonth() + 1)) + "/" + (that.pad(d.getDate()));
    }).join(" - ");
  },
  cday: function(value) {
    return "週" + ["一", "二", "三", "四", "五", "六", "日"][value];
  },
  prettyDate: function(d) {
    var that = this;
    return [d.getYear() + 1900, d.getMonth() + 1, d.getDate()]
      .map(function(it) { return that.pad(it); }).join("/") + " " + 
      [d.getHours(), d.getMinutes()]
        .map(function(it) { return that.pad(it); }).join(":");
  },
  prettyElapse: function(d) {
    return [
      this.pad( parseInt(d / 3600), 2 ),
      this.pad( parseInt((d % 3600) / 60 ), 2 ),
      this.pad( parseInt(d % 60) )
    ].join(":");
  },
};

var plotdb = {
  create: function() {
    var ret = new RQCalendar();
    ret.handle = function(name, value) {
      if(!this.on.handler[name]) return;
      for(var i = 0; i < this.on.handler[name].length; i++) {
        this.on.handler[name][i](value);
      }
    }
    ret.on = function(name, callback) {
      if(!this.on.handler[name]) this.on.handler[name] = [];
      this.on.handler[name].push(callback);
    };
    ret.on.handler = {};

    window.addEventListener("resize", function(it) {
      ret.resize();
      ret.bind();
      ret.render();
    });

    return ret;
  },
  init: function(chart, node) {
    chart.root = node;
    chart.data = [];
    chart.init();
  },
  update: function(chart, data) {
    chart.update(data);
    chart.resize();
    chart.bind();
    chart.render();
  },
  render: function(chart) {
    chart.resize();
    chart.bind();
    chart.render();
  }
};
