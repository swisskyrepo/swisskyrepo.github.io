---
layout: post
title: WHID Injector - Tips and Tricks
image: /images/default.jpg
---

What is it ? The WHID Injector is USB Key which act as a remote keyboard. Basically it sets up a Wifi Access Point where you can connect and send whatever you want on the machine. It also has a Rubber Ducky payload converter, an exfiltrated data tab and many more.

What can I do ? Everything you could do with a keyboard plugged into a computer, for example : using [WHID Toolkit](https://github.com/swisskyrepo/WHID_Toolkit) you can spawn a reverse-shell :D    

Where to buy a WHID Injector ? I got mine from [Aliexpress](https://www.aliexpress.com/item/Cactus-Micro-compatible-board-plus-WIFI-chip-esp8266-for-atmega32u4/32318391529.html), it's also available on ebay around 15+ $ ;)

<!--more-->

## Basic Setup
First you need to connect the web server hosted on "http://192.168.1.1", only reachable over the `Exploit Wifi`. Use the following default credentials to connect to the AP.
{% highlight bash%}
SSID "Exploit"
Password "DotAgency"
{% endhighlight %}

When you want to update/upgrade some components you will have to login with these credentials.
The default administration
{% highlight bash%}
username "admin"
password "hacktheplanet"
{% endhighlight %}

## Build your own firmware (do not trust the fishy chinese firmware from internet :P)
### Setup Arduino IDE
One who buys an electronic usb stick online might want to change the firmware in order to get rid of a backdoor, or just to upgrade it.

1. Download and Install the Arduino IDE from http://www.arduino.cc
2. Go to File - Preferences. Locate the field "Additional Board Manager URLs:"
3. Add http://arduino.esp8266.com/stable/package_esp8266com_index.json or https://github.com/esp8266/Arduino/releases/download/2.3.0/package_esp8266com_index.json if an error occured.
4. Select Tools - Board - Boards Manager. Search for "esp8266".
5. Install "esp8266 by ESP8266 community version 2.3.0".

If it's not enough I saw someone installing the following ;)
{% highlight bash%}
Select Sketch - Include Library - Manage Libraries. Search for "Json".
Install "ArduinoJson by Benoit Blanchon version 5.11.0" and click "Close"  
Download https://github.com/exploitagency/esp8266FTPServer/archive/feature/bbx10_speedup.zip
Click Sketch - Include Library - Add .ZIP Library and select bbx10_speedup.zip from your Downloads folder.
{% endhighlight %}

### Customized keyboard mapping
If you are french you might want a french keyboard with AZERTY mapping, unfortunately this isn't the default behavior of the WHiD Injector. Now we will modify the file `Keyboard.cpp` to replace the english charset with a french one.

1. git clone https://github.com/exploitagency/ESPloitV2.git
2. Go back inside the arduino folder and open `arduino-1.8.4/libraries/Keyboard/src/Keyboard.cpp`
3. Replace the `_asciimap` with this one
{% highlight c%}
const uint8_t _asciimap[128] =
{
	0x00,             // NUL
	0x00,             // SOH
	0x00,             // STX
	0x00,             // ETX
	0x00,             // EOT
	0x00,             // ENQ
	0x00,             // ACK  
	0x00,             // BEL
	0x2a,			// BS	Backspace
	0x2b,			// TAB	Tab
	0x28,			// LF	Enter
	0x00,             // VT
	0x00,             // FF
	0x00,             // CR
	0x00,             // SO
	0x00,             // SI
	0x00,             // DEL
	0x00,             // DC1
	0x00,             // DC2
	0x00,             // DC3
	0x00,             // DC4
	0x00,             // NAK
	0x00,             // SYN
	0x00,             // ETB
	0x00,             // CAN
	0x00,             // EM
	0x00,             // SUB
	0x00,             // ESC
	0x00,             // FS
	0x00,             // GS
	0x00,             // RS
	0x00,             // US

	0x2c,		   //  ' '
	0x38,	   // !
	0x20,    // "
	0x20,    // # :TODO
	0x30,    // $
	0x34|SHIFT,    // %
	0x1E,    // &
	0x21,          // '
	0x22,    // (
	0x2d,    // )
        0x31,    // * : done
	0x2b|SHIFT,    // +
	0x10,          // ,
	0x23,          // -
	0x36|SHIFT,    // .
	0x37|SHIFT,    // /
	0x27|SHIFT,    // 0
	0x1e|SHIFT,    // 1
	0x1f|SHIFT,    // 2
	0x20|SHIFT,    // 3
	0x21|SHIFT,    // 4
	0x22|SHIFT,    // 5
	0x23|SHIFT,    // 6
	0x24|SHIFT,    // 7
	0x25|SHIFT,    // 8
	0x26|SHIFT,    // 9
	0x37,          // :
	0x36,          // ;
	0x64,      // < Done
	0x2e,          // =
	0x64|SHIFT,      // > Done
	0x10|SHIFT,      // ? 0x38 -> 0x10 OK
	0x1f,      // @ TODO
	0x14|SHIFT,      // A
	0x05|SHIFT,      // B
	0x06|SHIFT,      // C
	0x07|SHIFT,      // D
	0x08|SHIFT,      // E
	0x09|SHIFT,      // F
	0x0a|SHIFT,      // G
	0x0b|SHIFT,      // H
	0x0c|SHIFT,      // I
	0x0d|SHIFT,      // J
	0x0e|SHIFT,      // K
	0x0f|SHIFT,      // L
	0x33|SHIFT,      // M
	0x11|SHIFT,      // N
	0x12|SHIFT,      // O
	0x13|SHIFT,      // P
	0x04|SHIFT,      // Q
	0x15|SHIFT,      // R
	0x16|SHIFT,      // S
	0x17|SHIFT,      // T
	0x18|SHIFT,      // U
	0x19|SHIFT,      // V
	0x1d|SHIFT,      // W
	0x1b|SHIFT,      // X
	0x1c|SHIFT,      // Y
	0x1a|SHIFT,      // Z
	0x0c,          // [ TODO 2F
	0x31,          // bslash
	0x0d,          // ] TODO 30
	0x2F,    // ^
	0x25,    // _
	0x35,          // ` TODO
	0x14,          // a
	0x05,          // b
	0x06,          // c
	0x07,          // d
	0x08,          // e
	0x09,          // f
	0x0a,          // g
	0x0b,          // h
	0x0c,          // i
	0x0d,          // j
	0x0e,          // k
	0x0f,          // l
	0x33,          // m
	0x11,          // n
	0x12,          // o
	0x13,          // p
	0x04,          // q
	0x15,          // r
	0x16,          // s
	0x17,          // t
	0x18,          // u
	0x19,          // v
	0x1d,          // w
	0x1b,          // x
	0x1c,          // y
	0x1a,          // z
	0x2f|SHIFT,    //
	0x31|SHIFT,    // | TODO
	0x30|SHIFT,    // } TODO
	0x35|SHIFT,    // ~ TODO
	0				// DEL
};
{% endhighlight %}


### Update Arduino Component
Let's build the Arduino project, open the `Arduino_32u4_code` in the folder ESPloitV2.     
In the IDE choose these options:
 - Select Tools - Board : `LilyPad Arduino USB`.
 - Select Tools - Port : `/dev/ttyACM0`
 - Build and upload the sketch (you might need superprivilege)

### Update ESPloitV2
Creating a custom firmware is the only way to modify the UI, to do so you will need to open the `ESP_Code` sketch:
 - Open the ESP_Code sketch from the source folder.
 - Select Tools - Board - "Generic ESP8266 Module". (Previously installed)
 - Select Tools - Flash Size - "4M (3M SPIFFS)". (You need this, otherwise the IDE will throw an error about size)
 - Select Sketch - "Export Compiled Binary".

The firmware is now available in your `/tmp/arduino_build_XXXXXX/*.bin`. The `upgrade firmware` function in the panel at 192.168.1.1 will upload the `file.bin` and reboot the WHiD Injector.

### Holy sh*t, I bricked my device
Chill my friend, this device is hard to brick. If you have messed really hard you can push the reset button.

 - Open Arduino IDE and open ESP Programmer sketch
 - Insert WHID
 - Press Upload sketch and start the unbrick phase in the same time

> Start the unbrick phase with a magnet by placing it close that side of the PCB where the hall sensor is located (do it two times). Close-away-close-away


### Play time
Here is a simple payload which will spawn a terminal in a remote computer, you can either run it inside the livepayload tab of the AP, or you can use the [Whid Toolkit](https://github.com/swisskyrepo/WHID_Toolkit)
{% highlight bash%}
Simple command execution :
Rem:Command Execution (ALT+F2)
Press:130+195
CustomDelay:1000
Print:xterm
CustomDelay:1000
Press:176
{% endhighlight %}


Docs:
 - https://camo.githubusercontent.com/11652f5ea3a5600654e558177a5311893392ee73/687474703a2f2f692e696d6775722e636f6d2f7041636c55544d2e6a7067
 - http://www.zem.fr/utiliser-mouse-keyboard-azerty-arduino-pro-micro-teensy/
