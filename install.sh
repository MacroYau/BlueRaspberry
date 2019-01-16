#!/bin/bash

#
# Copyright (c) 2018 Macro Yau
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
#

REQUIRED_FILES=(
    app.js
    pi-wifi-wrapper.js
    connectivity-service.js
    wifi-config-service.js
)
DOWNLOAD_URL_PARENT="https://raw.githubusercontent.com/MacroYau/BlueRaspberry/master/"
INSTALLER_TEMP_PATH=~/blue-raspberry-installer/

INSTALL_PATH=/opt/blue-raspberry
SYSTEMD_UNIT_FILENAME=blue-raspberry.service
SYSTEMD_SERVICE_PATH=/etc/systemd/system/

confirm() {
    read -r -p "$1 [Y/n] " response < /dev/tty
    if [[ $response =~ ^(yes|y|Y|YES)$ ]]; then
        true
    else
        false
    fi
}

check_model() {
    # Check if the current device is a Raspberry Pi 3
    model=$(tr -d '\0' < /proc/device-tree/model)
    if [[ $model == "Raspberry Pi 3"* ]]; then
        true
    else
        false
    fi
}

do_install() {
    echo ""
    if check_nodejs; then
        echo "Node.js v8.x is detected, skipping installation"
    else
        install_nodejs
    fi
    install_blue_raspberry
    setup_bluetooth
    setup_service
    echo ""
    echo "Installation complete!"
}

check_nodejs() {
    node_path=$(which node)
    if [[ $node_path == "" ]]; then
        false
    fi
    node_version=$($node_path -v)
    if [[ $node_version == "v8"* ]]; then
        true
    else
        false
    fi
}

install_nodejs() {
    echo -n "Installing Node.js v8.x... "
    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash - &> /dev/null
    sudo apt-get -qq install -y nodejs
    echo "Done"
}

install_blue_raspberry() {
    echo -n "Fetching application scripts from server... "
    mkdir -p $INSTALLER_TEMP_PATH
    for i in ${REQUIRED_FILES[@]}; do
        curl -s ${DOWNLOAD_URL_PARENT}${i} -o $INSTALLER_TEMP_PATH/$i
    done
    echo "Done"

    echo -n "Creating Blue Raspberry directory at $INSTALL_PATH... "
    sudo mkdir -p $INSTALL_PATH
    for i in ${REQUIRED_FILES[@]}; do
        sudo cp ${INSTALLER_TEMP_PATH}${i} $INSTALL_PATH
    done
    echo "Done"

    sudo rm -rf $INSTALLER_TEMP_PATH
    cd $INSTALL_PATH

    echo -n "Installing dependencies for Bluetooth via apt-get... "
    sudo apt-get -qq install -y bluetooth bluez libbluetooth-dev libudev-dev libcap2-bin
    sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
    echo "Done"

    echo -n "Installing 'bleno' via npm... "
    sudo sudo npm install --silent bleno &> /dev/null
    echo "Done"

    echo -n "Installing 'wireless-tools' via npm... "
    sudo npm install --silent wireless-tools &> /dev/null
    echo "Done"

    echo -n "Installing 'child_process' via npm... "
    sudo npm install --silent child_process &> /dev/null
    echo "Done"

    echo -n "Installing 'async' via npm... "
    sudo npm install --silent async &> /dev/null
    echo "Done"
}

setup_bluetooth() {
    echo -n "Configuring Bluetooth interface... "
    sudo service bluetooth stop
    rfkill unblock bluetooth
    sudo hciconfig hci0 up
    echo "Done"
}

setup_service() {
    echo -n "Setting up Blue Raspberry as a system service... "
    cat > ~/$SYSTEMD_UNIT_FILENAME << EOF
[Unit]
Description=Blue Raspberry headless pairing service
After=network.target bluetooth.service
PartOf=bluetooth.service

[Service]
WorkingDirectory=$INSTALL_PATH
ExecStart=$(which node) app.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    sudo mv ~/$SYSTEMD_UNIT_FILENAME ${SYSTEMD_SERVICE_PATH}${SYSTEMD_UNIT_FILENAME}
    sudo systemctl daemon-reload
    sudo systemctl enable blue-raspberry &> /dev/null
    sudo systemctl start blue-raspberry
    echo "Done"
}

if [[ $1 = "-f" ]]; then
    do_install
else
    echo "Blue Raspberry is an experimental application. Use at your own risk."
    if check_model; then
        if confirm "Do you want to continue?"; then
            do_install
        fi
    else
        if confirm "The application has only been tested on Raspberry Pi 3 Model B, and may not support the current device. Proceed?"; then
            do_install
        fi
    fi
fi

exit 0
