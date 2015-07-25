"use strict";

var Cylon = require("cylon");
var http = require("http");


var A = [];
var sampleRate = 0.5;

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
      if(A.length >= 50){

        var sum = 0;
        for( var i = 0; i < A.length; i++ ){
          sum += parseInt( A[i], 10 ); //don't forget to add the base
        }
        var avg = sum/A.length;
        A=[];

        var options = {
          host: 'www.ice.connect2.me',
          path: '/ice.svc/pushfeed?apiKey=8ZuHucvKJmthFLyn&feedID=HcUbOZ8BT5pYfyurlUSvb0E5pknliDusEiwOpNmLHOc&feed=Amplitude,'+avg+'|Temp,0|Lat,0|Long,0'
        };
        http.request(options, function(){}).end();
       }
     }


    });


  }

}).start();

