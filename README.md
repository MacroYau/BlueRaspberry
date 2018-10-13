# Blue Raspberry

Blue Raspberry enables effortless access to a headless Raspberry Pi.

Setting up a Raspberry Pi might look simple: Connecting it to a HDMI monitor, keyboard, mouse, and USB power supply then it boots up. In reality, we may not have the luxury to have access to all those bulky peripherals due to space or budget constraints. Of course, the geeky way go headless would be hooking a LAN cable to the Pi, identify its IP address from your router, and SSH into it. But this trick works only in your home, and not *everyone* can pull it off. Blue Raspberry comes to your rescue:

![Blue Raspberry Demo](https://thumbs.gfycat.com/CelebratedNiftyCaribou-size_restricted.gif)

As its name implies, Blue Raspberry communicates to the phone over Bluetooth (hence Raspberry Pi 3 or Zero W and newer only) for checking the Pi's current Wi-Fi network configuration (connected SSID and IP address), or connecting it to a new network.

It can can be useful for the following scenarios:

- Conducting STEM classroom, workshop, hackathon, or whatever similar that you provide dozens of Pi's (participants bring their own laptops, but you do not have control over the venue's network)
- Using your own Pi in a hotel room *(which can really require [a LOT of effort](https://twitter.com/dynamicwebpaige/status/1029976476014145536)...)*


## Installation

Paste and execute the following command in the terminal of a Raspberry Pi. This installer script takes care of the installation of dependencies (see [below](#technical-overview)), and setup of a `systemd` service to enable running at startup.

```bash
curl -sS https://raw.githubusercontent.com/MacroYau/BlueRaspberry/master/install.sh | bash
```

*I am well aware that there is currently no out-of-the-box headless solution for getting Blue Raspberry installed on the Pi, given the need of downloading all those dependencies. If you need to mass deploy Pi's, a temporary workaround would be cloning the SD card image from after installing on an Internet-connected Pi. It is my top priority to figure out a way to integrate with any latest version of Raspbian image.*

Once you finish installing on the Pi, get a compatible mobile application on your phone:

- iOS: https://github.com/MacroYau/BlueRaspberry-iOS
- Android: Under development


## Technical Overview

Blue Raspberry uses the Bluetooth Low Energy (Bluetooth LE, or BLE) protocol stack, in particular the Generic Attributes (GATT) services, to facilitate data and configuration exchange between a Raspberry Pi and a mobile device.

The Raspberry Pi acts as a GATT server (also known as a BLE peripheral, works in the same way as a BLE wearable device). It runs a Node.js (requires v8.x) application that uses [`bleno`](https://github.com/noble/bleno) to turn itself into a BLE peripheral. The [`wireless-tools`](https://github.com/bakerface/wireless-tools) library, a `wpa_cli` wrapper, is utilized to manage the Pi's Wi-Fi interface upon receiving commands from the mobile device.

The mobile device, on the other hand, is a GATT client (BLE central) which is responsible for the front-end operations: Displaying current network configuration, and handling user input for joining a new Wi-Fi network.


## Development Roadmap

- [ ] Integration with Raspbian image
- [ ] Review and documentation of GATT characteristics
- [ ] Security enhancement (authentication with Pi, Wi-Fi passphrase hashing, etc.)
- [ ] "Dashboard" for viewing the Pi's system information
- [ ] Allow changing the `pi` user's password 


## License

MIT
