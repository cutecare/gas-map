function gasMissed() {
    sendSensorValue('', 0);
}

function gasFound( gasType ) {
    sendSensorValue(gasType, 60);
}

function sendSensorValue( gasType, value ) {
    navigator.geolocation.getCurrentPosition(function(position) {
      $.get( "https://api.ipify.org",
          function(ip){
              $.ajax({
                  url: "https://devprom.ru:9201/metrics/doc",
                  type: "POST",
                  async: false,
                  dataType: "json",
                  contentType: "application/json; charset=utf-8",
                  data: JSON.stringify({
                      'source': hashCode(ip),
                      'gas': gasType,
                      'value': value,
                      'location': {"lat":position.coords.latitude,"lon":position.coords.longitude},
                      '@timestamp': (new Date()).getTime()
                  })
              });
          }
      );
   });
}

function hashCode(s){
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
}