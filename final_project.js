//global variable defs

var map;
var markers = [];
var map_filter = false;
var width = 400;
var height = 700;
var fill = d3.scale.category20();

//returns pre-processed data from server (all restaurants in Las Vegas)
d3.json("https://intense-falls-16505.herokuapp.com/api/v1.0/data/some_data/", function(my_data) {

  //define needed dimensions
  var cf = crossfilter(my_data);
  var allDim = cf.dimension(function(d) {
    return d
  });
  var dim_reviews2 = cf.dimension(function(d) {
    if (d.review_count > 1000) return 10;
    else return d.review_count / 100;
  });
  var latDimension = cf.dimension(function(d) {
    return d.latitude;
  });
  var lngDimension = cf.dimension(function(d) {
    return d.longitude;
  });
  var dim_stars = cf.dimension(function(d) {
    return d.stars
  });
  var dim_stars2 = cf.dimension(function(d) {
    return d.stars
  });
  var dim_categories = cf.dimension(function(d) {
    return d.categories
  });
  var dim_reviews_actual = cf.dimension(function(d) {
    return d.review_count
  });
  var dim_reviews = cf.dimension(function(d) {
 
    if (d.review_count <= 100) {
      return "0-100";
    }
    if (d.review_count <= 500) {
      return "101-500";
    }
    if (d.review_count <= 1000) {
      return "501-1000";
    }
    if (d.review_count > 1000) {
      return ">1000";
    }
  });
  var dim_reviews_thousands = cf.dimension(function(d) {
    return Math.floor(d.review_count / 200)
  });
  var dim_reservations = cf.dimension(function(d) {
    if (d.attributes["Takes Reservations"] == true) {
      return "Yes";
    } else
      return "No";
  });
  
  var dim_alcohol = cf.dimension(function(d) {
    if ("Alcohol" in d.attributes && d.attributes["Alcohol"] != "none") {
      return "Yes";
    } else
      return "No";
  });

  var dim_price = cf.dimension(function(d) {
    if ("Price Range" in d.attributes) {
      //console.log("got here");
      if (d.attributes["Price Range"] == 1) return "$";
      if (d.attributes["Price Range"] == 2) return "$$";
      if (d.attributes["Price Range"] == 3) return "$$$";
      if (d.attributes["Price Range"] == 4) return "$$$$"
        //return d.attributes["Price Range"];
    } else {
      //console.log("woot");
      return "n/a";
    }
  });

  var dim_ambience = cf.dimension(function(d) {
    if ("Ambience" in d.attributes) {
      if ((d.attributes["Ambience"])["intimate"] == true) {
        return "Intimate";
      }
      if ((d.attributes["Ambience"])["casual"] == true) {
        return "Casual";
      }
      if ((d.attributes["Ambience"])["romantic"] == true) {
        return "Romantic";
      }
      if ((d.attributes["Ambience"])["hipster"] == true) {
        return "Hipster";
      }
      if ((d.attributes["Ambience"])["classy"] == true) {
        return "Classy";
      }
      if ((d.attributes["Ambience"])["divey"] == true) {
        return "Divey";
      }
      if ((d.attributes["Ambience"])["upscale"] == true) {
        return "Upscale";
      }
      if ((d.attributes["Ambience"])["touristy"] == true) {
        return "Touristy";
      }
      if ((d.attributes["Ambience"])["trendy"] == true) {
        return "Trendy";
      }
      return "Other";
    }
    return "Other";
  });

  //define needed groups based on dimensions created above

  var group_stars = dim_stars.group();
  var group_reviews = dim_reviews.group();
  var group_reviews2 = dim_reviews2.group();
  var group_reservations = dim_reservations.group();
  var group_reviews_thousands = dim_reviews_thousands.group();
  var group_alcohol = dim_alcohol.group();
  var group_ambience = dim_ambience.group();
  var group_categories = dim_categories.group();
  var group_price = dim_price.group();

  //mapping function to compute average of a "bucket" in a group
  function average_map(m) {
    var sum = 0;
    m.forEach(function(k, v) {
      sum += k * v;
    });
    return m.size() ? sum / m.size() : 0;
  }

  //customized map reduce to compute average number of reviews
  //per star rating
  var group_avg_reviews_per_rating = dim_stars2.group().reduce(
    function(p, v) { // add
      var reviews = v.review_count;
      p.map.set(reviews, p.map.has(reviews) ? p.map.get(reviews) + 1 : 1);
      p.avg = average_map(p.map);
      return p;
    },
    function(p, v) { // remove
      var reviews = v.review_count;
      p.map.set(reviews, p.map.has(reviews) ? p.map.get(reviews) - 1 : 0);
      p.avg = average_map(p.map);
      return p;
    },
    function() { // init
      return {
        map: d3.map(),
        avg: 0
      };
    }
  );

  //chart definitions start here
  var avgChart = dc.barChart("#avgchart", "group1");

  avgChart.width(300)
    .margins({
      top: 10,
      right: 10,
      bottom: 20,
      left: 30
    })
    .x(d3.scale.linear().domain([0.5, 5.5]))
    .xUnits(dc.units.fp.precision(.5))
    .dimension(dim_stars2)
    .group(group_avg_reviews_per_rating)
    .valueAccessor(function(kv) {
      return kv.value.avg;
    })
    .centerBar(true)
    .elasticY(true)


  //all pie charts are at the top in the visualization
  var pie = dc.pieChart("#piechart", "group1")
    .width(180)
    .height(160)
    .radius(80)
    .innerRadius(30)
    .dimension(dim_reservations)
    .group(group_reservations)
    .renderLabel(true)
    .label(function(d) {
      return (d.data.key);
    });

  var pie_stars = dc.pieChart("#piechartstars", "group1")
    .width(180)
    .height(160)
    .radius(80)
    .innerRadius(30)
    .dimension(dim_stars)
    .group(group_stars)
    .renderLabel(true)
    .label(function(d) {
      return (d.data.key);
    });

  var pie_alcohol = dc.pieChart("#piechartalcohol", "group1")
    .width(180)
    .height(160)
    .radius(80)
    .innerRadius(30)
    .dimension(dim_alcohol)
    .group(group_alcohol)
    .renderLabel(true)
    .label(function(d) {
      return (d.data.key);
    });


  var pie_ambience = dc.pieChart("#piechartambience", "group1")
    .width(180)
    .height(160)
    .radius(80)
    .innerRadius(30)
    .dimension(dim_ambience)
    .group(group_ambience)
    .renderLabel(true)
    .label(function(d) {
      return (d.data.key);
    });

  // BAR GRAPHS
  var bar = dc.barChart("#barchart", "group1")
    //.width(300)
    //.height(280)
    .width(300)
    .margins({
      top: 10,
      right: 10,
      bottom: 20,
      left: 50
    })
    .dimension(dim_reviews)
    .group(group_reviews)
    .gap(20)
    .x(d3.scale.ordinal().domain(["0-100", "101-500", "501-1000", ">1000"]))
    .xUnits(dc.units.ordinal)
    .elasticY(true)
    .centerBar(true);

  var barprice = dc.barChart("#barchartprice", "group1")
    .width(300)
    .margins({
      top: 10,
      right: 10,
      bottom: 20,
      left: 50
    })
    .dimension(dim_price)
    .group(group_price)
    .gap(20)

  //)
  .x(d3.scale.ordinal().domain(["n/a", "$", "$$", "$$$", "$$$$"]))
    .xUnits(dc.units.ordinal)
    .elasticY(true)
    .centerBar(true);

  var datatable = dc.dataTable("#data-table", "group1")
    .dimension(allDim)
    .group(function(d) {
      return ' ';
    })
    .size(100)
    .columns([
      function(d) {
        return d.name;
      },
      function(d) {
        if (d.attributes["Price Range"] == 1) return "$";
        if (d.attributes["Price Range"] == 2) return "$$";
        if (d.attributes["Price Range"] == 3) return "$$$";
        if (d.attributes["Price Range"] == 4) return "$$$$"
      },
      function(d) {
        return d.categories;
      },
      function(d) {
        return '<a href=\"http://maps.google.com/maps?z=12&t=m&q=loc:' + d.latitude + '+' + d.longitude + "\" target=\"_blank\">" + d.full_address + "</a>"
      },
      function(d) {
        return d.stars;
      },
      function(d) {
        return d.review_count;
      },
    ])
    .sortBy(function(d) {
      return d.review_count;
    })
    .order(d3.descending);

  //dc.renderAll("group1");
  d3.select("#reservations_title").append("h4").text("Reservations:");
  d3.select("#rating_title").append("h4").text("Rating:");
  d3.select("#alcohol_title").append("h4").text("Alcohol:");
  d3.select("#ambience_title").append("h4").text("Ambience:");

  //WORD CLOUD INIT STUFF

  testCall(group_categories);

  //MAPS STUFF
  initMap(my_data);
  google.maps.event.addListener(map, 'idle', function() {
    var bounds = this.getBounds();
    var northEast = bounds.getNorthEast();
    var southWest = bounds.getSouthWest();

    // NOTE: need to be careful with the dateline here
    lngDimension.filterRange([southWest.lng(), northEast.lng()]);
    latDimension.filterRange([southWest.lat(), northEast.lat()]);

    
    map_filter = true;
    testCall(group_categories);
    //showButton();
    dc.renderAll("group1");

  });

  idDimension = cf.dimension(function(p, i) {
    return i;
  });
  idGrouping = idDimension.group(function(id) {
    return id;
  });

  updateMarkers();

  d3.select("#resetButton")
    .append("button")
    .attr("type", "button")
    .attr("class", "btn-btn")
    .append("div")
    .attr("class", "label")
    .text(function(d) {
      return "Reset All";
    })
    .on("click", function() {
      //initMap(my_data);
      pie_stars.filter(null);
      pie_alcohol.filter(null);
      pie.filter(null);
      pie_ambience.filter(null);
      bar.filter(null);
      barprice.filter(null);
      avgChart.filter(null);
      //map_filter = false;
      //initMap(my_data);
      lngDimension.filter(null);
      latDimension.filter(null);
      map_filter = false;
      var center = new google.maps.LatLng(36.15, -115.2);
      // using global variable:
      map.panTo(center);
      map.setZoom(10);
      updateMarkers();
      //testCall(group_categories);
      dc.renderAll("group1");
    });

  //connect the filters to the map (update map markers)

  pie_stars.on('filtered', function() {
    updateMarkers(); //need to do this every time for all the filters
    testCall(group_categories);
  });

  pie_alcohol.on('filtered', function() { 
    updateMarkers();
    testCall(group_categories);
  });
  pie.on('filtered', function() { 
    updateMarkers();
    testCall(group_categories);
  });
  pie_ambience.on('filtered', function() { 
    updateMarkers();
    testCall(group_categories);
  });
  bar.on('filtered', function() { 
    updateMarkers();
    testCall(group_categories);
  });
  barprice.on('filtered', function() { 
    updateMarkers();
    testCall(group_categories);
  });
  avgChart.on('filtered', function() { 
    updateMarkers();
    testCall(group_categories);
  });


});

//initialize the map viz
function initMap(my_data) {
  google.maps.visualRefresh = true;

  var myLatlng = new google.maps.LatLng(36.15, -115.2);
  var mapOptions = {
    zoom: 10, //trial and error
    center: myLatlng,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    streetViewControl: false,
    panControl: false
  };
  map = new google.maps.Map(document.getElementById('map-div'), mapOptions);

  // create array of markers from points and add them to the map
  for (var i = 0; i < my_data.length; i++) {
    var point = my_data[i];
    //console.log(point.latitude);
    markers[i] = new google.maps.Marker({
      position: new google.maps.LatLng(point.latitude, point.longitude),
      map: map,
      //title: 'marker ' + i
      title: my_data[i].name
    });
  }
}

//update visible markers on bounds changed

function updateMarkers() {
  var pointIds = idGrouping.all();
  for (var i = 0; i < pointIds.length; i++) {
    var pointId = pointIds[i];
    markers[pointId.key].setVisible(pointId.value > 0);
  }
}

//call when there are filter updates (used to update the 
//word cloud)

function testCall(group_categories) {
  var counts = [];
  var test = [];
  group_categories
    .top(Infinity)
    .forEach(function(d, i) {
      if (d.value != 0) {
        for (var i = 0; i < Object.keys(d.key).length; i++) {
          for (var j = 0; j < d.value; j++) {
            //console.log(d.key[i]);
            test.push(d.key[i]);
          }
        }

      }
      //console.log(JSON.stringify(d));
    });
  jQuery.each(test, function(key, value) {
    if (!counts.hasOwnProperty(value)) {
      counts[value] = 1;
    } else {
      counts[value]++;
    }
  });

  // console.log(counts);
  var finalResults = [];
  for (var w in counts) {
    //console.log(counts[w]);
    if (w != "Restaurants") {
      var car = {
        text: w,
        size: counts[w]
      };
      finalResults.push(car);
    }
  }

  $("#wordcloud").empty();

  var sizeScale = d3.scale.linear()
    .domain([0, d3.max(finalResults, function(d) {
      return d.size
    })])
    //to make sure fonts stay within bounds of the word cloud display
    .range([10, 60]);

  d3.layout.cloud()
    .size([width, height])
    .words(finalResults)
    .rotate(function() {
      return ~~(Math.random() * 2) * 90;
    })
    .font("Impact")
    .fontSize(function(d) {
      return sizeScale(d.size);
    })
    .on("end", drawSkillCloud)
    .start();
}

//draw the word cloud

function drawSkillCloud(words) {


  d3.select("#wordcloud")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + ~~(width / 2) + "," + ~~(height / 2) + ")")
    .selectAll("text")
    .data(words)
    .enter().append("text")
    .style("font-size", function(d) {
      return d.size + "px";
    })
    .style("-webkit-touch-callout", "none")
    .style("-webkit-user-select", "none")
    .style("-khtml-user-select", "none")
    .style("-moz-user-select", "none")
    .style("-ms-user-select", "none")
    .style("user-select", "none")
    .style("cursor", "default")
    .style("font-family", "Impact")
    .style("fill", function(d, i) {
      return fill(i);
    })
    .attr("text-anchor", "middle")
    .attr("transform", function(d) {
      return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
    })
    .text(function(d) {
      return d.text;
    });
}
