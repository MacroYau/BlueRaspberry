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
const NOTIFY_TIMER_INTERVAL = 1000;

const CONNECTIVITY_SERVICE_UUID = "8F7E321D-DF0A-4096-BB5B-34C267671B06";

const IP_ADDRESS_UUID = "132D7244-46C0-481B-B947-42F329F6BE55";
const SSID_UUID = "EF92DD60-B49C-4874-B93F-018E80FCF818";

class IPAddressCharacteristic extends bleno.Characteristic {

	constructor() {
		super({
			uuid: IP_ADDRESS_UUID,
			properties: ["read", "notify"],
			descriptors: [
				new bleno.Descriptor({
					uuid: "2901",
					value: "IP Address"
				})
			]
		});

		this.ip = "";
		this.timer = null;
	}

	getIP(callback) {
		piWifi.status(WLAN_INTERFACE, (err, status) => {
			if (err) {
				return callback("");
			} else {
				const ip = (status.ip === undefined) ? "" : status.ip;
				return callback(ip);
			}
		});
	}

	onReadRequest(offset, callback) {
		this.getIP(ip => {
			const data = Buffer.from(ip);
			return callback(this.RESULT_SUCCESS, data);
		});
	}

	onSubscribe(maxValueSize, updateValueCallback) {
		this.timer = setInterval(() => {
			this.getIP(ip => {
				if (ip == this.ip) {
					return;
				} else {
					this.ip = ip;
					const data = Buffer.from(ip);
					updateValueCallback(data);
				}
			});
		}, NOTIFY_TIMER_INTERVAL);
	}

	onUnsubscribe() {
		clearInterval(this.timer);
		this.timer = null;
	}

}

class SSIDCharacteristic extends bleno.Characteristic {

	constructor() {
		super({
			uuid: SSID_UUID,
			properties: ["read", "notify"],
			descriptors: [
				new bleno.Descriptor({
					uuid: "2901",
					value: "Connected SSID"
				})
			]
		});

		this.ssid = "";
		this.timer = null;
	}

	getSSID(callback) {
		piWifi.status(WLAN_INTERFACE, (err, status) => {
			if (err) {
				return callback("");
			} else {
				const ssid = (status.ssid === undefined) ? "" : status.ssid;
				return callback(ssid);
			}
		});
	}

	onReadRequest(offset, callback) {
		this.getSSID(ssid => {
			const data = Buffer.from(ssid);
			return callback(this.RESULT_SUCCESS, data);
		});
	}

	onSubscribe(maxValueSize, updateValueCallback) {
		this.timer = setInterval(() => {
			this.getSSID(ssid => {
				if (ssid == this.ssid) {
					return;
				} else {
					this.ssid = ssid;
					const data = Buffer.from(ssid);
					updateValueCallback(data);
				}
			});
		}, NOTIFY_TIMER_INTERVAL);
	}

	onUnsubscribe() {
		clearInterval(this.timer);
		this.timer = null;
	}

}

const connectivityService = new bleno.PrimaryService({
	uuid: CONNECTIVITY_SERVICE_UUID,
	characteristics: [
		new IPAddressCharacteristic(),
		new SSIDCharacteristic()
	]
});

module.exports = connectivityService;
