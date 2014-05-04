/**
 * Created on 5/2/14.
 */

/*global window*/
/*global $*/
/*global document*/
/*global QRCode*/
/*global require*/
/*global Bitcoin*/
/*global setTimeout*/

(function () {
    'use strict';

    var bitcore, inMessage, inSignature, inAddress,
        alertSuccess, alertFalure, alertBadAddr,
        qrcode, pane, btcMesssage,
        sgHdr = [
            "-----BEGIN BITCOIN SIGNED MESSAGE-----",
            "-----BEGIN SIGNATURE-----",
            "-----END BITCOIN SIGNED MESSAGE-----"
        ],
        qtHdr = [
            "-----BEGIN BITCOIN SIGNED MESSAGE-----",
            "-----BEGIN BITCOIN SIGNATURE-----",
            "-----END BITCOIN SIGNATURE-----"
        ];

    btcMesssage = Bitcoin.Message;

    bitcore = require('bitcore');

    qrcode = new QRCode('vw-qrcode', {width: 400, height: 400});

    function init() {
        inMessage = document.getElementById('vw-input-msg');
        inSignature = document.getElementById('vw-input-sign');
        inAddress = document.getElementById('vw-input-addr');
        alertSuccess = document.getElementById('vw-alert-success');
        alertFalure = document.getElementById('vw-alert-failure');
        alertBadAddr = document.getElementById('vw-alert-badaddr');
        pane = document.getElementById('vw-pane');
    }

    function overlay(show) {
        var oDiv, lDiv, element;
        if (show) {
            oDiv = document.createElement('div');
            oDiv.setAttribute('id', 'vw-overlay');
            oDiv.style.display = 'block';
            pane.appendChild(oDiv);
            lDiv = document.createElement('div');
            lDiv.setAttribute('id', 'vw-loading');
            lDiv.style.display = 'block';
            pane.appendChild(lDiv);

        } else {
            element = document.getElementById('vw-loading');
            pane.removeChild(element);
            element = document.getElementById('vw-overlay');
            pane.removeChild(element);
        }
    }

    function trim(message) {
        message = message.replace(/^\s+|\s+$/g, '');
        message = message.replace(/^\n+|\n+$/g, '');
        return message;
    }

    function splitSignature(s) {
        var addr, sig, i, h1, a, m;
        addr = '';
        sig = s;
        if (s.indexOf('\n') >= 0) {
            a = s.split('\n');
            addr = a[0];

            // always the last
            sig = a[a.length - 1];

            // try named fields
            h1 = 'Address: ';
            for (i = 0; i < a.length; i = i + 1) {
                m = a[i];
                if (m.indexOf(h1) >= 0) {
                    addr = m.substring(h1.length, m.length);
                }
            }

            // address should not contain spaces
            if (addr.indexOf(' ') >= 0) {
                addr = '';
            }

            // some forums break signatures with spaces
            sig = sig.replace(" ", "");
        }
        return { "address": addr, "signature": sig };
    }

    function splitSignedMessage(s) {
        var i, hdr, p0, p1, p2,
            msg, sig, m;
        s = s.replace('\r', '');
        for (i = 0; i < 2; i = i + 1) {
            hdr = i === 0 ? sgHdr : qtHdr;
            p0 = s.indexOf(hdr[0]);
            if (p0 >= 0) {
                p1 = s.indexOf(hdr[1]);
                if (p1 > p0) {
                    p2 = s.indexOf(hdr[2]);
                    if (p2 > p1) {
                        msg = s.substring(p0 + hdr[0].length + 1, p1 - 1);
                        sig = s.substring(p1 + hdr[1].length + 1, p2 - 1);
                        m = splitSignature(sig);
                        msg = trim(msg); // doesn't work without this
                        return { "message": msg, "address": m.address, "signature": m.signature };
                    }
                }
            }
        }
        return false;
    }


    function makeQR(addr) {
        qrcode.clear();
        if (addr.length > 0) {
            qrcode.makeCode(addr);
        }
    }

    function showAlert(oAlert) {
        var clone;
        clone = $(oAlert).clone();
        clone.appendTo('#vw-alert');
        clone.fadeIn(150);
    }

    function verifyMessage(addr, sig, msg) {
        var succeeded, oMsg, oAddr;
        //must be replaced by bitcore.Message
        //when they implement 'verify'
        oMsg = btcMesssage;
        oAddr = new bitcore.Address(addr);
        if (oAddr.isValid()) {
            overlay(true);
            setTimeout(function () {
                try {
                    succeeded = oMsg.verify(addr, sig, msg);
                } catch (err) {
                    succeeded = false;
                }

                if (succeeded) {
                    showAlert(alertSuccess);
                } else {
                    showAlert(alertFalure);
                }

                makeQR(addr);
                overlay(false);
            }, 50);
        } else {
            showAlert(alertBadAddr);
        }
    }

    $('#vw-btn-verify-a-m-s')
        .on('click', function () {
            var sig, msg, addr;
            $('#vw-alert').empty();
            sig = new bitcore.Buffer(trim(inSignature.value), "base64");
            msg = trim(inMessage.value);
            addr = trim(inAddress.value);
            verifyMessage(addr, sig, msg);
        });

    $('#vw-btn-verify-pem')
        .on('click', function () {
            var m, p, q, addr, sig, msg;
            $('#vw-alert').empty();
            m = inMessage.value;
            p = splitSignedMessage(m);
            if (p) {
                msg = trim(p.message);
                addr = trim(p.address);
                sig = new bitcore.Buffer(trim(p.signature), "base64");
                verifyMessage(addr, sig, msg);
            } else {
                showAlert(alertFalure);
            }
        });

    window.addEventListener('load',
        function () {
            init();
        },
        false);

    $('#vw-input-addr').on('change',
        function () {
            var oAddr, addr;
            $('#vw-alert').empty();
            addr = trim(inAddress.value);
            oAddr = new bitcore.Address(addr);
            if (oAddr.isValid()) {
                makeQR(addr);
            } else {
                showAlert(alertBadAddr);
            }
        });

}());