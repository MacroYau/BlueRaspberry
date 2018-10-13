/**
 * Copyright (c) 2018 Macro Yau
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const bleno = require("bleno");
const piWifi = require("./pi-wifi-wrapper");

const WLAN_INTERFACE = "wlan0";

const WIFI_CONFIG_SERVICE_UUID = "B2ADB965-76F6-4AFE-9450-2117326A6AFB";

const AVAILABLE_NETWORKS_UUID = "94F76327-6BC8-4B86-A3C5-F96F90574267";
const KNOWN_NETWORKS_UUID = "EF0CC4AE-40B0-493F-A5C3-E4BC83F0D8DD";
const CONNECT_NETWORK_UUID = "E5508928-1536-4EF4-9BBD-B9A65C183D03";
const FORGET_NETWORK_UUID = "A5DF4BFF-5FEE-43F8-8566-07D9A98EB734";
const WIFI_SWITCH_UUID = "640BEF8F-0048-4A65-98BD-287731CF282C";

class AvailableNetworksCharacteristic extends bleno.Characteristic {

	constructor() {
		super({
			uuid: AVAILABLE_NETWORKS_UUID,
			properties: ["read"],
			descriptors: [
				new bleno.Descriptor({
					uuid: "2901",
					value: "Available Networks"
				})
			]
		});

		this.data = null;
		this.lastScanned = null;
	}

	onReadRequest(offset, callback) {
		if (offset === 0) {
			if (Date.now() < this.lastScanned + 5000) {
				return callback(this.RESULT_SUCCESS, this.data);
			}

			this.data = null;
		}

		if (offset > 0) {
			if (offset > this.data.length) {
				return callback(this.RESULT_INVALID_OFFSET, null);
			} else {
				const slice = this.data.slice(offset);
				return callback(this.RESULT_SUCCESS, slice);
			}
		}
		
		piWifi.scan(WLAN_INTERFACE, (err, networks) => {
			if (err || !Array.isArray(networks)) {
				const data = Buffer.from("{}");
				return callback(this.RESULT_SUCCESS, data);
			} else {
				var available = [];
				var filtered = networks.filter(network => {
					return network.signalLevel > -85 && (network.ssid == "eduroam" || !network.flags.includes("EAP"));
				});
				for (var i = 0; i < filtered.length; i++) {
					var ssid = filtered[i].ssid;

					var exists = available.filter(info => { return info.ssid == ssid });
					if (exists.length > 0) continue;

					var info = {
						ssid: ssid,
						flags: filtered[i].flags
					};

					available.push(info);
					if (Buffer.from(JSON.stringify(available)).length >= 512) {
						// Maximum payload size (with slicing) for iOS is bounded by 512 bytes
						available.pop();
						break;
					}
				}
				this.data = Buffer.from(JSON.stringify(available));
				this.lastScanned = Date.now();
				return callback(this.RESULT_SUCCESS, this.data);
			}
		});
	}

}

class KnownNetworksCharacteristic extends bleno.Characteristic {

	constructor() {
		super({
			uuid: KNOWN_NETWORKS_UUID,
			properties: ["read"],
			descriptors: [
				new bleno.Descriptor({
					uuid: "2901",
					value: "Known Networks"
				})
			]
		});

		this.data = null;
	}

	onReadRequest(offset, callback) {
		if (offset === 0) {
			this.data = null;
		}

		if (offset > 0) {
			if (offset > this.data.length) {
				return callback(this.RESULT_INVALID_OFFSET, null);
			} else {
				const slice = this.data.slice(offset);
				return callback(this.RESULT_SUCCESS, slice);
			}
		}

		piWifi.listSavedNetworks(WLAN_INTERFACE, (err, networks) => {
			if (err) {
				const data = Buffer.from("{}");
				return callback(this.RESULT_SUCCESS, data);
			} else {
				var known = networks.map(entry => {
					return {
						ssid: entry.ssid,
						selected: entry.flags.includes("[CURRENT]") ? true : false
					};
				});
				this.data = Buffer.from(JSON.stringify(known));
				return callback(this.RESULT_SUCCESS, this.data);
			}
		});
	}

}

class ConnectNetworkCharacteristic extends bleno.Characteristic {

	constructor() {
		super({
			uuid: CONNECT_NETWORK_UUID,
			properties: ["write"],
			descriptors: [
				new bleno.Descriptor({
					uuid: "2901",
					value: "Connect to Network"
				})
			]
		});
	}

	onWriteRequest(data, offset, withoutResponse, callback) {
		const json = data.toString("UTF-8");
		var params = JSON.parse(json);
		const ssid = params.ssid;

		piWifi.listSavedNetworks(WLAN_INTERFACE, (err, networks) => {
			if (err) {
				return callback(this.RESULT_UNLIKELY_ERROR);
			} else {
				var networkID = -1;

				// Iterate known networks list to check if the SSID is remembered
				for (var i = 0; i < networks.length; i++) {
					if (networks[i].ssid === ssid) {
						networkID = networks[i].network_id;
						break;
					}
				}

				if (networkID == -1) {
					piWifi.connect(WLAN_INTERFACE, params, err => {
						if (!err) {
							return callback(this.RESULT_SUCCESS);
						} else {
							return callback(this.RESULT_UNLIKELY_ERROR);
						}
					});
				} else {
					piWifi.connectToSavedNetwork(WLAN_INTERFACE, networkID, err => {
						if (!err) {
							return callback(this.RESULT_SUCCESS);
						} else {
							return callback(this.RESULT_UNLIKELY_ERROR);
						}
					});
				}
			}
		});
	}

}

class ForgetNetworkCharacteristic extends bleno.Characteristic {

	constructor() {
		super({
			uuid: FORGET_NETWORK_UUID,
			properties: ["write"],
			descriptors: [
				new bleno.Descriptor({
					uuid: "2901",
					value: "Forget Network"
				})
			]
		});
	}

	onWriteRequest(data, offset, withoutResponse, callback) {
		const ssid = data.toString("UTF-8");
		piWifi.removeSavedNetwork(WLAN_INTERFACE, ssid, err => {
			if (err) {
				return callback(this.RESULT_UNLIKELY_ERROR);
			} else {
				return callback(this.RESULT_SUCCESS);
			}
		});
	}

}

class WiFiSwitchCharacteristic extends bleno.Characteristic {

	constructor() {
		super({
			uuid: WIFI_SWITCH_UUID,
			properties: ["write"],
			descriptors: [
				new bleno.Descriptor({
					uuid: "2901",
					value: "Turn On or Off Wi-Fi"
				})
			]
		});
	}

	onWriteRequest(data, offset, withoutResponse, callback) {
		if (data.length !== 1) {
			return callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
		} else {
			var command = data.readUInt8(0);
			if (command == 0) {
				piWifi.disableInterface(WLAN_INTERFACE, err => {
					if (err) {
						return callback(this.RESULT_UNLIKELY_ERROR);
					} else {
						return callback(this.RESULT_SUCCESS);
					}
				});
			} else {
				piWifi.enableInterface(WLAN_INTERFACE, err => {
					if (err) {
						return callback(this.RESULT_UNLIKELY_ERROR);
					} else {
						return callback(this.RESULT_SUCCESS);
					}
				});
			}
		}
	}

}

const wifiConfigService = new bleno.PrimaryService({
	uuid: WIFI_CONFIG_SERVICE_UUID,
	characteristics: [
		new AvailableNetworksCharacteristic(),
		new KnownNetworksCharacteristic(),
		new ConnectNetworkCharacteristic(),
		new ForgetNetworkCharacteristic(),
		new WiFiSwitchCharacteristic()
	]
});

module.exports = wifiConfigService;
