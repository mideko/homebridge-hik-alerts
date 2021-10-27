var Service, Characteristic
const packageJson = require('./package.json')
const node_xml_stream = require('node-xml-stream');
const http = require('http');
const jsdom = require("jsdom");

module.exports = function (homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-hik-alerts', 'Hikvision Alerts', hikAlerts)
}

function hikAlerts (log, config) {
    this.log = log;
    this.name = config.name;
    this.username = config.username;
    this.password = config.password;
    if (this.username && this.password) {
      this.auth = this.username+":"+this.password;
      }
    
    this.authIn = 'Basic ' + Buffer.from(this.auth).toString('base64');
    const streamOptions = {
        host: config.nvr_host,
        path: '/ISAPI/Event/notification/alertStream',
        port: config.camera_ffmpeg_port,
        method: 'GET',
        headers: {'Authorization':authIn}
    };
    
    this.channelID = 0;
    this.sensors=['keep empty','Cam%20Voortuin','Cam%20Tuinpad','Cam%20Hoek','Cam%20Oprit','Cam%20Test'];

    callback = function(response) {
        response.setEncoding('utf8');
        response.on('data',function(chunk) {
            //console.log(chunk);
            myID = 0;
            var xmlDoc = new jsdom.JSDOM(chunk);
            myAlert =xmlDoc.window.document.querySelector('EventNotificationAlert');
            mySensor = '';
            myEvent = '';
            if (myAlert) {
                myState =xmlDoc.window.document.querySelector('eventState').textContent;
                myStamp =xmlDoc.window.document.querySelector('dateTime').textContent;
                if (myState == 'active') {
                    myEvent =xmlDoc.window.document.querySelector('eventType').textContent;
                    
                    myID = parseInt(xmlDoc.window.document.querySelector('dynChannelID').textContent);
                    mySensor = this.sensors[myID];
                    camAlertOptions.path = '/motion?' + mySensor;
                    //var fire = http.request(camAlertOptions);
                    var fire = http.get('http://localhost:8800/motion?'+mySensor)
                    //console.log(camAlertOptions);
                    fire.on('response', (i) => {
                      //console.log(i);
                    });
                    fire.on('error', (e) => {
                      console.log('problem with setting trigger via http:', e);
                      fire.abort();
                    });
                    //fire.end();
                }
                console.log(myStamp,mySensor, myEvent, myState);
            }
        });
        response.on('end',function() {
            console.log('end');
        });
    }
    //get the alert stream from the NVR
    var req = http.request(streamOptions, callback);

    req.on('error', (e) => {
      console.log('problem with request', e);
      req.abort();
    });
    //req.pipe(parser);

    req.end();
}

