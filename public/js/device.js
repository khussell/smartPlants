$(document).ready(function() {
  Number.prototype.map = function(inMin, inMax, outMin, outMax) {
    return outMin + ((this - inMin) / (inMax - inMin)) * (outMax - outMin);
  };

  var histData;

  function getDataFromRange(range) {
    // Return new promise
    return new Promise(function(resolve, reject) {
      // Do async job
      url = "/api/hist?deviceId=";
      url += window.location.pathname.replace("/devices/", "");
      var interval;
      if (range) {
        url += "&range=";
        url += range;
        if (range === "day") {
          interval = "hour";
        } else if (range === "week") {
          interval = "day";
        } else if (range === "month") {
          interval = "day";
        } else if (range === "year") {
          interval = "month";
        }
        if (interval) {
          url += "&interval=";
          url += interval;
        }
      }
      $.get(url)
        .done(function(data) {
          data = _.filter(data, function(v) {
            return moment().diff(moment(v.tTime)) >= 0;
          });
          resolve(data);
        })
        .fail(function(error) {
          reject(error);
        });
    });
  }

  var options = {
    chart: {
      type: "line"
    },
    series: [
      {
        name: "Value",
        data: [0, 1]
      }
    ],
    plotOptions: {
      line: {
        curve: "smooth"
      }
    },
    xaxis: {
      categories: [0, 1],
      title: {
        text: "Time"
      }
    }
  };

  var chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();

  function formatString(range) {
    if (range === "day") {
      return "DD MMM h:mm a";
    } else if (range === "week") {
      return "DD MMM";
    } else if (range === "month") {
      return "DD MMM";
    } else {
      return "MMM YYYY";
    }
  }

  function updateChart(data, range) {
    chart.updateOptions({
      xaxis: {
        type: "datetime",
        labels: {
          rotate: -15,
          rotateAlways: true,
          formatter: function(val) {
            var datetime = moment(val);
            return datetime.format(formatString(range));
          }
        }
      },
      yaxis: {
        labels: {
          formatter: function(val) {
            return parseInt(val);
          }
        }
      }
    });
    chart.updateSeries([
      {
        data: data
      }
    ]);
  }

  function getPropertyData(data, propertyName) {
    return data.map(function(dataPoint) {
      return {
        x: moment(dataPoint.tTime, "YYYY-MM-DD hh").format("YYYY-MM-DD HH:MM"),
        y: dataPoint[propertyName]
      };
    });
  }

  $.fn.dataTable.ext.classes.sPageButton = "waves-effect waves-light btn";
  $("#dataTable").DataTable({
    searching: false,
    order: [[0, "desc"]],
    initComplete: function() {
      $("#dataTable").show();
    }
  });

  var $tabs = $(".tabs");
  $tabs.tabs();

  $("#rangeSelect")
    .formSelect()
    .change(function() {
      var range = $(this).val();
      if (range === "all") {
        range = undefined;
      }
      getDataFromRange(range)
        .then(function(data) {
          histData = data;
          var property = $("#propertySelect").val();
          var propertyData = getPropertyData(data, property);
          updateChart(propertyData, range);
        })
        .catch(function(error) {
          throw error;
        });
    });

  $("#propertySelect")
    .formSelect()
    .change(function() {
      var range = $("#rangeSelect").val();
      if (range === "all") {
        range = undefined;
      }
      var property = $(this).val();
      var propertyData = getPropertyData(histData, property);
      updateChart(propertyData, range);
    });

  var range = $("#rangeSelect").val();
  if (range === "all") {
    range = undefined;
  }
  getDataFromRange(range)
    .then(function(data) {
      histData = data;
      var property = $("#propertySelect").val();
      var propertyData = getPropertyData(data, property);
      updateChart(propertyData, range);
    })
    .catch(function(error) {
      throw error;
    });

  $(".gauge-arrow").cmGauge();

  var moistureGaugeVal = 0;
  $("#moisture .gauge-arrow").attr(
    "data-percentage",
    moistureGaugeVal.toString()
  );

  setInterval(function() {
    var deviceId = window.location.pathname.replace("/devices/", "");
    $.get("/api/livegauge/moisture/" + moistureGaugeVal + "/" + deviceId).then(
      function(data) {
        var record = data[0];
        var newAmount = parseInt(record.moisture).map(0, 30, 0, 100);
        moistureGaugeVal = parseInt(newAmount);
        $("#moisture .gauge-arrow")
          .trigger("updateGauge", moistureGaugeVal)
          .attr("data-percentage", moistureGaugeVal.toString());
      }
    );
  }, 5000);
});
