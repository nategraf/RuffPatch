"use strict";

var http = require("https");
var Cylon = require("cylon");
var Parse = require('parse').Parse;
Parse.initialize("vI5nlvreFCPBRzwFA5aAL2UYO425uQhth6jctkM5", "ZUFFd77ByrMu86OSgxsGpkrGKktAe784I4PmzGJ9");

var ListItem = Parse.Object.extend("trucks")



var avg;
var count = 0;
var Vib = [];
var VibAVGs = [];
var Temps = [];
var Noise = [];
var sampleRate = 0.01;
var sendEvery = 10;
var peaked = 0;

var apiKey = "8ZuHucvKJmthFLyn";
var feedID = "OWDNR1Xbkd38xiLv6q3wxVq4yQPDg0YrRGz0Rd4m2mk=";

var gpsData = [
"35.23.51.41, 97.31.21.26, 0",
"35.09.33.04, 97.28.43.57, 20",
"34.25.06.80, 97.10.54.46, 50",
"33.12.10.13, 97.12.10.14, 80",
"32.53.50.33, 97.18.48.70, 30",
"32.32.04.84, 97.18.04.24, 20",
"32.02.51.35, 97.04.14.42, 40",
"31.40.00.24, 97.06.01.93, 30",
"31.06.52.62, 97.20.58.63, 40",
"30.38.48.96, 96.32.24.08, 10",
"30.40.58.64, 96.28.49.07, 30",
"30.13.20.61, 96.44.25.05, 30",
"29.47.22.28, 98.01.22.36, 40",
"29.26.40.14, 98.26.57.92, 30"
]

var gpsToFloat = function (gpsStr) {
    var gpsArr = gpsStr.split(".");
    var intArr = [];
    for (var i = 0; i < gpsArr.length; i++) {
        intArr[i] = parseInt(gpsArr[i], 10);
    }
    var gpsFloat = 0.0;
    for (var i = 0; i < intArr.length; i++) {
        gpsFloat += intArr[i]*Math.pow(60,-i);
    }
    return gpsFloat;
};

var gpsDataToArr = function (gpsDataArr) {
    for(var i=0; i<gpsDataArr.length; i++){
        var setArr = gpsDataArr[i].split(", ");
        setArr[0] = gpsToFloat(setArr[0]);
        setArr[1] = gpsToFloat(setArr[1]);
        setArr[2] = parseInt(setArr[2], 10);
        gpsDataArr[i] = setArr;
    }
    return gpsDataArr;
};

var gpsExpand = function(gpsDataArr, stepSize){
    var exGpsArr = [];
    for(var i=1; i<gpsDataArr.length; i++){
        var latDiff = gpsDataArr[i][0]-gpsDataArr[i-1][0];
        var longDiff = gpsDataArr[i][1]-gpsDataArr[i-1][1];
        var time = gpsData[i][2]*60;
        for(var j=0; j<time; j+=stepSize){
            exGpsArr[exGpsArr.length]=[
                gpsDataArr[i][0]+latDiff/time*j,
                gpsDataArr[i][1]+longDiff/time*j
            ];
        }
    }
    return exGpsArr;
};

gpsDataToArr(gpsData);
var expandedGpsData = gpsExpand(gpsData, sendEvery); // This is where the gps data is expanded

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
  
  VibAVGs = [];
};

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}

Cylon.robot({
  connections: {
    edison: { adaptor: "intel-iot" }
  },

  devices: {
    vibsense0: {
      driver: "analogSensor",
      pin: 0,
    },
    vibsense1: {
      driver: "analogSensor",
      pin: 1,
    },
	tempsense: {
      driver: "analogSensor",
      pin: 2,
    },
	noisesense: {
      driver: "analogSensor",
      pin: 3,
    }
	led: { 
	  driver: 'led', 
	  pin: 13,
	}
  },

  work: function(my) {

    every((sampleRate).second(), function() {
      Vib[Vib.length] = Math.abs(my.vibsense0.analogRead()-my.vibsense1.analogRead());
	  Temps[Temps.length] = my.tempsense.analogRead();
	  Noise[Noise.length] = my.noisesense.analogRead();
	  if(Vib[Vib.length-1] >= peaked){
	    peaked = Vib[Vib.length-1];
	  }
      //console.log("Vib => "+ Vib);
      if(Vib.length >= sendEvery/sampleRate){

        var sumV = 0;
		var sumT = 0;
		var sumN = 0;
        for( var i = 0; i < Vib.length; i++ ){
          sumV += parseInt( Vib[i], 10 ); //don't forget to add the base
		  sumT += parseInt( Temps[i], 10 );
		  sumN += parseInt( Noise[i], 10 );
        }
        avg = Math.round(sumV/Vib.length);
		VibAVGs[VibAVGs.length] = [Date.now(),avg];
        console.log("Vib AVG = "+ avg);
		console.log("Vib PEAK = " +peaked);
		console.log("Temps AVG = " + sumT/Temps.length);
		console.log("Noise AVG = " + sumN/Noise.length);
		 
		// Parse
		/*var listItem = new ListItem();
		listItem.set("amplitude", avg);
		var lati = expandedGpsData[count][0];
		var longi = expandedGpsData[count][1];
		listItem.set("lat", lati.toString());
		listItem.set("long", longi.toString());
		listItem.set("peaked", peaked>500);
		listItem.save(null,{
			success:function(item){}, error: function(err){console.log(err)}
		});*/
		
		//Connect2Me
		if(count%(65/sendEvery) == 0){
			var JSONdata = {"data": []};
			for( var i = 0; i < VibAVGs.length; i++ ){
				var avg = VibAVGs[i];
				JSONdata.data[JSONdata.data.length] = {"UID": 1, "TimeStamp": avg[0], "Amplitude": avg[1], "Lat": expandedGpsData[count][0], "Long": expandedGpsData[count][1], "Threshold": (peaked>300), "Temp": sumT/Temps.length, "Noise": sumN/Noise.length};
			}
			var options = {
				host: 'ice.connect2.me',
				path: '/ice.svc/pushfeed?apiKey='+apiKey+'&feedID='+feedID+'&feed=data,\"'+replaceAll(',','%2',replaceAll('\"','\'',JSON.stringify(JSONdata)))+'\"'
			};
			http.request(options, httpcallback).end();
			
			my.led.toggle();
			setTimeout(function(){my.led.toggle();}, 1000);
		}
		
		count++;
		peaked = 0;
		Vib=[];
	  }
    });
  }

}).start();
