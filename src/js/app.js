var version = '2.20';
var current_settings;

/*  ****************************************** Weather Section **************************************************** */

function getWeather(woeid) {  
  
  var temperature;
  var icon;
  
  
  var query = 'select item.condition from weather.forecast where woeid =  ' + woeid + ' and u="' + (current_settings.temperatureFormat === 0? 'f' : 'c') + '"';
  //console.log ("++++ I am inside of 'getWeather()' preparing query:" + query);
  var url = 'https://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent(query) + '&format=json&env=store://datatables.org/alltableswithkeys';
  //console.log ("++++ I am inside of 'getWeather()' preparing url:" + url);
  // Send request to Yahoo
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    //console.log  ("++++ I am inside of 'getWeather()' callback. responseText is " + this.responseText);
    var json = JSON.parse(this.responseText);
    temperature = parseInt(json.query.results.channel.item.condition.temp);
    //console.log  ("++++ I am inside of 'getWeather()' callback. Temperature is " + temperature);
    
    icon = parseInt(json.query.results.channel.item.condition.code);
    //console.log  ("++++ I am inside of 'getWeather()' callback. Icon code: " + icon);
   
    
    var dictionary = {
      'KEY_WEATHER_CODE': icon,
      'KEY_WEATHER_TEMP': temperature
    };
    
    // Send to Pebble
    //console.log  ("++++ I am inside of 'getWeather()' callback. About to send message to Pebble");
    Pebble.sendAppMessage(dictionary,
    function(e) {
      //console.log ("++++ I am inside of 'Pebble.sendAppMessage()' callback. Weather info sent to Pebble successfully!");
    },
    function(e) {
      //console.log ("++++ I am inside of 'Pebble.sendAppMessage()' callback. Error sending weather info to Pebble!");
    }
    );
  };
  
  xhr.onerror = function(e) {
    //console.log("I am inside of 'getWeather()' ERROR: " + e.error);
  };
  
  xhr.open('GET', url);
  xhr.send();
}



// on location success querying woeid and getting weather
function locationSuccess(pos) {
  // We neeed to get the Yahoo woeid first
  var woeid;

/* YG 2016-01-25  !!! This query no longer works due to Yahoo bug. Using the one below it !!!  */  
// var query = 'select * from geo.placefinder where text="' +
//     pos.coords.latitude + ',' + pos.coords.longitude + '" and gflags="R"';
   var query = 'select locality1 from geo.places where text="(' + 
       pos.coords.latitude + ',' + pos.coords.longitude + ')" limit 1';
  
  //console.log ("++++ I am inside of 'locationSuccess()' preparing query:" + query);
  var url = 'https://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent(query) + '&format=json';
  //console.log ("++++ I am inside of 'locationSuccess()' preparing URL: " + url);
  // Send request to Yahoo
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    var json = JSON.parse(this.responseText);
    
    /* YG 2016-01-25  !!! This result no longer works due to Yahoo bug. Using the one below it !!!  */  
    // woeid = json.query.results.Result.woeid;
    woeid = json.query.results.place.locality1.woeid;
    
    //console.log ("++++ I am inside of 'locationSuccess()', woeid received:" + woeid);
    getWeather(woeid);
  };
  xhr.open('GET', url);
  xhr.send();

}




function locationError(err) {
  //console.log ("++++ I am inside of 'locationError: Error requesting location!");
}


// Get Location lat+lon
function getLocation() {
  navigator.geolocation.getCurrentPosition(
    locationSuccess,
    locationError,
    {timeout: 15000, maximumAge: 60000}
  );
}


// Listen for when the watchface is opened
Pebble.addEventListener('ready', 
  function(e) {
      
    //reading current stored settings
    try {
       current_settings = JSON.parse(localStorage.getItem('current_settings'));
    } catch(ex) {
       current_settings = null; 
    }  
    
     if (current_settings === null) {
         current_settings = {
             temperatureFormat: 0,
             hoursMinutesSeparator: 0,
             dateFormat: 0,
             invertColors: 0,
             bluetoothAlert: 0, // new 2.18
             locationService: 0,
             woeid: 0,
             language: 255
         };
     }
    
    //console.log ("++++ I am inside of 'Pebble.addEventListener('ready'): PebbleKit JS ready!");
    var dictionary = {
        "KEY_JSREADY": 1
    };

    // Send to Pebble, so we can load units variable and send it back
    //console.log ("++++ I am inside of 'Pebble.addEventListener('ready') about to send Ready message to phone");
    Pebble.sendAppMessage(dictionary,
      function(e) {
        //console.log ("++++ I am inside of 'Pebble.sendAppMessage() callback: Ready notice sent to phone successfully!");
      },
      function(e) {
        //console.log ("++++ I am inside of 'Pebble.sendAppMessage() callback: Error ready notice to Pebble!");
      }
    ); 
  }
);

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    //console.log ("++++ I am inside of 'Pebble.addEventListener('appmessage'): AppMessage received");
    
    if (current_settings.locationService == 1) { // for manual location - request weather right away
        //console.log ("++++ I am inside of 'Pebble.addEventListener('appmessage'): Requesting weather by WOEID");
        getWeather(current_settings.woeid);
    } else {
       //console.log ("++++ I am inside of 'Pebble.addEventListener('appmessage'): Requesting automatic location");
       getLocation();  // for automatic location - get location
    }
    
  }                     
);

/*    ******************************************************************** Config Section ****************************************** */ 

Pebble.addEventListener("showConfiguration",
  function(e) {
   
    //Load the remote config page
   
    //Pebble.openURL("http://codecorner.galanter.net/pebble/clean_smart_config.htm?version=" + version);
    Pebble.openURL("http://ygalanter.github.io/configs/clean_smart/clean_smart_config.htm?version=" + version); //YG 2016-03-15; moved config to github hosting
    
  }
);

Pebble.addEventListener("webviewclosed",
  function(e) {
    
    if (e.response !== '') {
      
      //console.log ("++++ I am inside of 'Pebble.addEventListener(webviewclosed). Resonse from WebView: " + decodeURIComponent(e.response));
      
      //Get JSON dictionary
      var settings = JSON.parse(decodeURIComponent(e.response));
   
      var app_message_json = {};

      // preparing app message
      app_message_json.KEY_HOURS_MINUTES_SEPARATOR = settings.hoursMinutesSeparator;
      app_message_json.KEY_DATE_FORMAT = settings.dateFormat;
      app_message_json.KEY_INVERT_COLORS = settings.invertColors;
      app_message_json.KEY_BLUETOOTH_ALERT = settings.bluetoothAlert; // new 2.18
      app_message_json.KEY_LOCATION_SERVICE = settings.locationService;
      app_message_json.KEY_WEATHER_INTERVAL = settings.weatherInterval;
      app_message_json.KEY_LANGUAGE = settings.language;
     
      // only storing and passing to pebble temperature format if it changed, because it will cause Pebble to reissue weather AJAX
      if (current_settings.temperatureFormat != settings.temperatureFormat) {
        app_message_json.KEY_TEMPERATURE_FORMAT = settings.temperatureFormat;
      }
      
      // storing new settings
      localStorage.setItem('current_settings', JSON.stringify(settings));
      current_settings = settings;
      
      //console.log ("++++ I am inside of 'Pebble.addEventListener(webviewclosed). About to send settings to the phone");
      Pebble.sendAppMessage(app_message_json,
        function(e) {
          //console.log ("++++ I am inside of 'Pebble.addEventListener(webviewclosed) callback' Data sent to phone successfully!");
        },
        function(e) {
          //console.log ("++++ I am inside of 'Pebble.addEventListener(webviewclosed) callback' Data sent to phone failed!");
        }
      );
    }
  }
);