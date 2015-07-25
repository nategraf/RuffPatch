"use strict";

var Cylon = require("cylon");
var http = require("https");


var A = [];
var Avgs = [];
var sampleRate = 0.5;

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

var replaceAll = function(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

var httpcallback = function(response) {
  var str = '';

  //another chunk of data has been recieved, so append it to `str`
  response.on('data', function (chunk) {
    str += chunk;
  });

  //the whole response has been recieved, so we just print it out here
  response.on('end', function () {
    console.log(str);
  });
};

Cylon.robot({
  connections: {
    edison: { adaptor: "intel-iot" }
  },

  devices: {
    sensorone: {
      driver: "analogSensor",
      pin: 0,
    },
    sensortwo: {
      driver: "analogSensor",
      pin: 1,
    }
  },

  work: function(my) {

    every((sampleRate).second(), function() {
      A[A.length] = Math.abs(my.sensorone.analogRead()-my.sensortwo.analogRead());
      console.log("A => "+ A);
      if(A.length >= 10){

        var sum = 0;
        for( var i = 0; i < A.length; i++ ){
          sum += parseInt( A[i], 10 ); //don't forget to add the base
        }
        var avg = Math.round(sum/A.length);
        A=[];
        Avgs[Avgs.length]=[Math.floor(Date.now()/1000),avg];
        console.log("AVG = "+ avg);
	  }
    });


    every((45).second(), function() {
	  var JSONdata = {"data": []};
	  for( var i = 0; i < Avgs.length; i++ ){
	    var avg = Avgs[i];
	    JSONdata.data[JSONdata.data.length] = {"UID": 1, "TimeStamp": avg[0], "Amplitude": avg[1], "Lat": 0, "Long": 0, "Temp": 0, "Noise": 0};
	  }
      var options = {
         host: 'ice.connect2.me',
         path: '/ice.svc/pushfeed?apiKey=8ZuHucvKJmthFLyn&feedID=HcUbOZ8BT5pYfyurlUSvb0E5pknliDusEiwOpNmLHOc=&feed=Data,\"'+replaceAll('\"','\'',JSON.stringify(JSONdata))+'\"'
      };
      http.request(options, httpcallback).end();
	  console.log(options.path);

    });
  }

}).start();

