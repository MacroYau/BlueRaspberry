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

const wirelessTools = require("wireless-tools");
const shell = require("child_process");
const async = require("async");
const crypto = require("crypto");

function interfaceStatus(interface, callback) {
    wirelessTools.ifconfig.status(interface, callback);
}

function status(interface, callback) {
    wirelessTools.wpa.status(interface, callback);
}

function scan(interface, callback) {
    wirelessTools.wpa.scan(interface, (err, data) => {
        if (!isWirelessToolsResultValid(err, data)) {
            return callback(err, []);
        }
        wirelessTools.wpa.scan_results(interface, (err, data) => {
            if (err) {
                return callback(err, []);
            }
            callback(err, data);
        });
    });
}

function listSavedNetworks(interface, callback) {
    const command = `wpa_cli -i ${interface} list_networks`;
    shell.exec(command, (err, stdout) => {
        if (!isWirelessToolsResultValid(err, stdout)) {
            return callback(err, []);
        }

        var list = stdout.split("\n");
        list.shift(); // Remove header row
        list.pop(); // Remove footer row;

        var savedNetworks = [];
        for (var i in list) {
            const params = list[i].split("\t");
            if (params.length != 4) {
                continue;
            }
            const network = {
                network_id: params[0],
                ssid: params[1],
                bssid: params[2],
                flags: params[3]
            }
            savedNetworks.push(network);
        }

        callback(err, savedNetworks);
    });
}

function connect(interface, params, callback) {
    wirelessTools.wpa.add_network(interface, (err, data) => {
        if (!err && data.hasOwnProperty("result")) {
            const id = data.result;
            let formattedParams = hashNetworkDetailsPassword(params);
            formattedParams = formattedNetworkDetails(formattedParams);
            async.forEachOf(formattedParams, (value, key, callback) => {
                wirelessTools.wpa.set_network(interface, id, key, value, callback);
            }, err => {
                if (err) {
                    return callback(err);
                }
                connectToSavedNetwork(interface, id, callback);
            });
        }
    })
}

function connectToSavedNetwork(interface, id, callback) {
    wirelessTools.wpa.enable_network(interface, id, (err, data) => {
        if (!isWirelessToolsResultValid(err, data)) {
            return callback(err);
        }
        wirelessTools.wpa.save_config(interface, err => {
            if (!isWirelessToolsResultValid(err, data)) {
                return callback(err);
            }
            wirelessTools.wpa.select_network(interface, id, (err, data) => {
                if (!isWirelessToolsResultValid(err, data)) {
                    return callback(err);
                }
                callback();
            });
        });
    });
}

function removeSavedNetwork(interface, ssid, callback) {
    listSavedNetworks(interface, (err, savedNetworks) => {
        const match = savedNetworks.filter(network => network.ssid == ssid);
        if (match.length == 1) {
            const id = match[0].network_id;
            wirelessTools.wpa.remove_network(interface, id, err => {
                if (!err) {
                    wirelessTools.wpa.save_config(interface, err => {
                        return callback(err);
                    })
                }
            })
        }
    })
}

function enableInterface(interface, callback) {
    const command = `sudo ifconfig ${interface} up`;
    shell.exec(command, err => {
        callback(err);
    });
}

function disableInterface(interface, callback) {
    const command = `sudo ifconfig ${interface} down`;
    shell.exec(command, err => {
        callback(err);
    });
}

function hashNetworkDetailsPassword(params) {
    if (params.hasOwnProperty("psk")) {
        const hash = crypto.pbkdf2Sync(params["psk"], params["ssid"], 4096, 32, "sha1").toString("hex");
        params["psk"] = hash;
        params["hashed"] = true;
    } else if (params.hasOwnProperty("password")) {
        const hash = crypto.createHash("md4").update(params["password"], "utf16le").digest("hex");
        params["password"] = `hash:${hash}`;
        params["hashed"] = true;
    }

    return params;
}

function formattedNetworkDetails(params) {
    let keysNeedEscaping = [
        "ssid",
        "identity",
        "phase1",
        "phase2"
    ];

    if (!params["hashed"]) {
        keysNeedEscaping.push(["psk", "password"]);
    }

    for (var i in keysNeedEscaping) {
        const key = keysNeedEscaping[i];
        if (params.hasOwnProperty(key)) {
            params[key] = `'"${params[key]}"'`;
        }
    }

    return params;
}

function isWirelessToolsResultValid(err, data) {
    return !(err || (data.hasOwnProperty("result") && data["result"] != "OK"));
}

module.exports = {
    interfaceStatus: interfaceStatus,
    status: status,
    scan: scan,
    listSavedNetworks: listSavedNetworks,
    connect: connect,
    connectToSavedNetwork: connectToSavedNetwork,
    removeSavedNetwork: removeSavedNetwork,
    enableInterface: enableInterface,
    disableInterface: disableInterface
}
