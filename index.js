/*
 * a very simple implementation of the Camera FFmpeg option to handle motion triggers by sensors
 * by using the Hikvision Nvr alert stream
 */
let Service, Characteristic;
const packageJson = require('./package.json');
const node_xml_stream = require('node-xml-stream');
const http = require('http');
const jsdom = require("jsdom");
//const {JSDOM} = jsdom;
let hikNvrLog, hikNvrCamID, hikNvrAlert, hikNvrEvent, hikNvrState, hikNvrStamp, hikNvrSensor, hikNvrXmlDoc,hikNvrXmlStart,hikNvrLastAlert,hikNvrThisAlert;
let hikNvrSensors = [];
let hikNvrCameraFFmpegPort;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-hik-alerts', 'Hikvision Alerts', hikAlerts);
}

class hikAlerts {
constructor(log, config, api) {
    
    
    this.log = log;
    hikNvrLog = log;
    //get config settings
    this.config = config;
    this.name = config.name;
    this.username = config.user_name;
    this.password = config.password;
    this.nvr =config.nvr_host;
    this.nvrport =config.nvr_port;
    this.isOn = true;
    hikNvrCameraFFmpegPort = config.camera_ffmpeg_porthttp;
    if (this.username && this.password) {
      this.auth = this.username+":"+this.password;
      }
    this.authIn = 'Basic ' + Buffer.from(this.auth).toString('base64');
    //option for alertStream from the NVR
    this.streamOptions = {
        host: this.nvr,
        path: '/ISAPI/Event/notification/alertStream',
        port: this.nvrport,
        method: 'GET',
        headers: {'Authorization':this.authIn}
    };
    
    //this.sensors=['keep empty','Cam%20Voortuin','Cam%20Tuinpad','Cam%20Hoek','Cam%20Oprit','Cam%20Test'];
    hikNvrSensors = config['sensors'];
    hikNvrLastAlert = '';
    this.log("HikAlerts Initalized for ",hikNvrSensors );
    this.service = new Service.Switch(this.config.name);

}

getServices() {
    const informationService = new Service.AccessoryInformation();

    // Set plugin information
    informationService
        .setCharacteristic(Characteristic.Manufacturer, 'mdk')
        .setCharacteristic(Characteristic.Model, 'Hik Camera Sensors')
        .setCharacteristic(Characteristic.SerialNumber, 'Version ' + module.exports.version)
    
    this.service.getCharacteristic(Characteristic.On)
      .on('get', this.getOnCharacteristicHandler.bind(this))
      .on('set', this.setOnCharacteristicHandler.bind(this))

    return [informationService, this.service];
}
    
setOnCharacteristicHandler (value, callback) {
    /* this is called when HomeKit wants to update the value of the characteristic as defined in our getServices() function */

    this.isOn = value;

      /* Log to the console the value whenever this function is called */
    //this.log(`calling setOnCharacteristicHandler`, value);
    if (this.isOn) {
        this.log('Hik Alerts is switched on');
    //open the alert stream from the NVR
        this.req = http.request(this.streamOptions, this.nvrcallback);
        this.req.on('error', (e) => {
            this.log('there is problem with the NVR stream request\n',e);
            this.req.abort();
            });
        this.req.end();
    }
    else {
        this.req.abort();
        this.log('Hik Alerts is switched off');
    }
      /*
       * The callback function should be called to return the value
       * The first argument in the function should be null unless and error occured
       */
    callback(null);
    }
    
getOnCharacteristicHandler (callback) {
    /*
    * this is called when HomeKit wants to retrieve the current state of the characteristic as defined in our getServices() function
    * it's called each time you open the Home app or when you open control center
    */

      /* Log to the console the value whenever this function is called */
    //this.log(`calling getOnCharacteristicHandler`, this.isOn)
    if (this.isOn) {
    //open the alert stream from the NVR
        this.req = http.request(this.streamOptions, this.nvrcallback);
        this.req.on('error', (e) => {
            this.log('there is problem with the NVR stream request',e);
            this.req.abort();
            });
        this.req.end();
    }
    else {
        this.log('Hik Alerts is switched off');
    }

      /*
       * The callback function should be called to return the value
       * The first argument in the function should be null unless and error occured
       * The second argument in the function should be the current value of the characteristic
       * This is just an example so we will return the value from `this.isOn` which is where we stored the value in the set handler
       */
    callback(null, this.isOn)
    }
    
nvrcallback (response) {
    response.setEncoding('utf8');
    response.on('data',function(chunk) {
        //hikNvrLog('handling nvr response');
        hikNvrXmlStart = chunk.search('<EventNotificationAlert');
        if (hikNvrXmlStart > 0 ) {
            chunk = chunk.slice(hikNvrXmlStart); //strip any non-xml prefix
            hikNvrLog(chunk);
            hikNvrCamID = 0;
            //turn chunk into xml doc that can be queried
            const hikNvrXmlDoc = new jsdom.JSDOM(chunk,{contentType:"application/xml"});
            hikNvrAlert = hikNvrXmlDoc.window.document.querySelector('EventNotificationAlert');
            hikNvrSensor = '';
            hikNvrEvent = '';
            //hikNvrLog(myAlert);
            if (hikNvrAlert) {
                hikNvrState =hikNvrXmlDoc.window.document.querySelector('eventState').textContent;
                hikNvrStamp =hikNvrXmlDoc.window.document.querySelector('dateTime').textContent;
                if (hikNvrState == 'active') {
                    hikNvrEvent = hikNvrXmlDoc.window.document.querySelector('eventType').textContent;
                    
                    hikNvrCamID = parseInt(hikNvrXmlDoc.window.document.querySelector('dynChannelID').textContent)-1;
                    hikNvrSensor = hikNvrSensors[hikNvrCamID];
                    hikNvrThisAlert = hikNvrStamp+hikNvrSensor+hikNvrEvent;
                    if (hikNvrThisAlert == hikNvrLastAlert ) {
                    //trigger related motion switch in camera ffmpeg module if not same as before
                        var fire = http.get('http://localhost:'+hikNvrCameraFFmpegPort+'/motion?'+hikNvrSensor);

                        fire.on('response', (i) => {
                          //this.log(i);
                        });
                        fire.on('error', (e) => {
                          //this.log('problem with setting trigger via http: ', e);
                          fire.abort();
                        });
                        //fire.end();
                        hikNvrLastAlert = hikNvrThisAlert;
                        hikNvrLog(hikNvrStamp,hikNvrSensor,hikNvrEvent,hikNvrState);
                    }
                }
               
            }
            hikNvrXmlDoc.window.close();
            
        }
    });
    response.on('end',function() {
        //this.log('nvr stream ended');
        });
}
    
} //class


