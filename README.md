<p align="center">
  <a href="https://github.com/homebridge/homebridge"><img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" height="140"></a>
</p>

<span align="center">

# homebridge-hik-alerts

[![npm](https://img.shields.io/npm/v/homebridge-hik-alerts.svg)](https://www.npmjs.com/package/homebridge-hik-alerts) [![npm](https://img.shields.io/npm/dt/homebridge-hik-alerts.svg)](https://www.npmjs.com/package/homebridge-hik-alerts)

</span>

## Description

This [homebridge](https://github.com/homebridge/homebridge) plugin exposes the [Hikvision(R)](https://www.hikvision.com) NVR alerts to Apple's [HomeKit](http://www.apple.com/ios/home/). Using simple HTTP requests, the plugin triggers the camera sensor switches in camera ffmpeg.
### Platform
Tested on IOS 15.

## Installation

1. Install [homebridge](https://github.com/homebridge/homebridge#installation)
2. Install this plugin: `npm install -g homebridge-hik-alerts`
3. Update your `config.json` file (see below)

## Dependencies

This plugin feeds the alerts into the [Camera FFMpeg plugin](https://github.com/Sunoo/homebridge-camera-ffmpeg#readme).
You must have set the <b>Http Port</b> in the <b>Global Automation</b> section to enable this.

For each camera in Camera FFMpeg plug, also switch on the <em>Enable Motion Sensor</em> and <em>Enable Dummy Switches</em>.
This also works with the CameraUI plugin.

In the NVR, make sure:
- the <b>WEB Authentication</b> (under Security | Authentication) is set to <em>digest/basic</em> to allow this plug-in to connect,
- the events <b>Linkage method</b> includes <em>Notify Surveillance Centre</em> to push the events to the NVR's AlertStream 

## Configuration

```json
"accessories": [
    {
        "name": "Hikvision alerts",
        "accessory": "Hikvision Alerts",
        "nvr_host": "0.0.0.0",
        "camera_ffmpeg_porthttp": "8800",
        "user_name": "you user name",
        "password": "your password",
        "sensors": [
            "Cam 1",
            "Cam 2",
            "Cam 3",
            "Cam 4"
        ]
    }
]
```

### Core
| Key | Description | Default |
| --- | --- | --- |
| `accessory` | Must be `Hik Alerts` | N/A |
| `name` | Name to appear in the Home app | N/A |
| `nvr_host` | Root URL of your Hikvision NVR | N/A |
| `user_name` | your user name to log into the NVR  | N/A |
| `password` | your password to log into the NVR  | N/A |
| `camera_ffmpeg_porthttp` | port you defined in the camera ffmpeg config  | N/A |
| `sensors` | must correspond with the cameras list in camera ffmpeg plugin*  | N/A |

Important: for the sensors, make sure that 
 - the <b>names</b> of the sensors (=cameras) are identical to those in Camera FFmpeg (towards Camera FFmpeg, cameras are matched by the name) and 
 - the <b>order</b> corresponds with the order in which the cameras are defined in the NVR (towards the NVR, cameras are matched by their sequence nr.).
 
 ### Configuration in Homekit
 After setting this up in Homebridge, you need to configure the following in <b>Homekit</b>:
 - create an <em>automation</em> for each sensor/camera pair ('when motion is detetected, turn on the Camera Motion Trigger'),
 - switch on <em>Activity Notifications</em> for each camera (to get a notification when motion is detected).
 This works best if each camera/sensor pair is in a separate room.



