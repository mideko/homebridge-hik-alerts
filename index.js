let Service, Characteristic;
const packageJson = require('./package.json');
const node_xml_stream = require('node-xml-stream');
const http = require('http');
const jsdom = require("jsdom");
//const {JSDOM} = jsdom;
let hikNvrLog, hikNvrCamID, hikNvrAlert, hikNvrEvent, hikNvrState, hikNvrStamp, hikNvrSensor, hikNvrXmlDoc,hikNvrXmlStart;
let hikNvrSensors = [];
let hikNvrCameraFFmpegPort;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-hik-alerts', 'Hikvision Alerts', hikAlerts);
}

class hikAlerts {
    constructor(log, config, api) {
        
        this.req = null;
        this.log = log;
        hikNvrLog = log;
        //get config settings
        this.config = config;
        this.name = config.name;
        this.username = config.user_name;
        this.password = config.password;
        //addresss of the nvr:
        this.nvr =config.nvr_host;
        this.nvrport =config.nvr_port;
        //port where ffmpeg or compatible plugin is listening:
        hikNvrCameraFFmpegPort = config.camera_ffmpeg_porthttp;
        
        if (this.username && this.password) {
            this.auth = this.username+":"+this.password;
        }
        this.authIn = 'Basic ' + Buffer.from(this.auth).toString('base64');
        //options for alertStream from the NVR
        this.streamOptions = {
            host: this.nvr,
            path: '/ISAPI/Event/notification/alertStream',
            port: this.nvrport,
            method: 'GET',
            headers: {'Authorization':this.authIn}
            };
        
        //this.sensors=['keep empty','Cam%20Voortuin','Cam%20Tuinpad','Cam%20Hoek','Cam%20Oprit','Cam%20Test'];
        hikNvrSensors = config['sensors'];
        this.log("HikAlerts Initalized for ",hikNvrSensors );
        this.service = new Service.Switch(this.config.name);
        this.setup_alert_stream(); //switch on hik alerts by default
        
}
    
setup_alert_stream() {
    
    //open the alert stream from the NVR
    this.req = http.request(this.streamOptions, this.nvrcallback);
    this.log('Hik Alerts is switched on');
    this.isOn = true; //alerts is switched ON
    this.req.on('error', (e) => {
        this.log('there is problem with the NVR stream request:',e);
        this.isOn = false; //alerts is switched OFF
        this.req.abort();
        });
    this.req.end();
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
        this.setup_alert_stream();
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
        this.log('Hik Alerts is ON');
    }
    else {
        this.log('Hik Alerts is OFF');
    }

      /*
       * The callback function should be called to return the value
       * The first argument in the function should be null unless an error occured
       * The second argument in the function should be the current value of the characteristic
       * This is just an example so we will return the value from `this.isOn` which is where we stored the value in the set handler
       */
    callback(null, this.isOn)
    }
    
nvrcallback (response) {
    //callback from NVR when event has occured
    response.setEncoding('utf8');
    response.on('data',function(chunk) {
        //hikNvrLog('handling nvr response');
        hikNvrXmlStart = chunk.search('<EventNotificationAlert');
        if (hikNvrXmlStart > 0 ) {
            chunk = chunk.slice(hikNvrXmlStart); //strip any non-xml prefix
            //hikNvrLog(chunk);
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
                    //trigger related motion switch in camera ffmpeg module
                    var fire = http.get('http://localhost:'+hikNvrCameraFFmpegPort+'/motion?'+hikNvrSensor);

                    fire.on('response', (i) => {
                      //this.log(i);
                    });
                    fire.on('error', (e) => {
                      //this.log('problem with setting trigger via http: ', e);
                      fire.abort();
                    });
                    //fire.end();
                    hikNvrLog(hikNvrStamp,hikNvrSensor,hikNvrEvent,hikNvrState);
                }
               
            }
            hikNvrXmlDoc.window.close();
            
        }
    });
    response.on('end',function() {
        //this.log('nvr stream ended');
        //hikNvrLog();
        });
}
    
} //class
