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

const connectivityService = require("./connectivity-service");
const wifiConfigService = require("./wifi-config-service");

const BLUE_RASPBERRY_SERVICE_UUID = "D3BEC8C1-2B35-40E2-B92B-F9B429F4D3E5";

bleno.on("stateChange", state => {
	if (state === "poweredOn") {
		bleno.startAdvertising("Blue Raspberry", [BLUE_RASPBERRY_SERVICE_UUID]);
	} else {
		bleno.stopAdvertising();
	}
})

bleno.on("advertisingStart", err => {
	if (!err) {
		bleno.setServices([connectivityService, wifiConfigService]);
	}
})
