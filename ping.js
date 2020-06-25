'use strict';

const fs = require('fs'),
    dgram = require('dgram');

var INT64_0 = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

const MAGIC = [0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78],
    ID_UNCONNECTED_PONG = 0x1c,
    /**
     * 1b packetId ID_UNCONNECTED_PING
     * 8q sendTime
     * 16 magic
     * 8q clientId
     */
    PING_DATA = Buffer.from([0x01].concat(INT64_0).concat(MAGIC).concat(INT64_0));

INT64_0 = null;

var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
config.host = config.host || '127.0.0.1';
config.port = config.port || 19132;
config.period = config.period || 1000;

var client = dgram.createSocket('udp4'),
    timer;

function ping() {
    client.send(PING_DATA, config.port, config.host, (err) => {});
}

client.on('error', (err) => {
    console.error(`client error:\n${err}`);
});

client.on('message', (msg, rinfo) => {
    try {
        if ((msg.readInt8(0) & 0xff) == ID_UNCONNECTED_PONG) { // pid
            //msg.readBigInt64BE(1); // pingTime
            //msg.readBigInt64BE(9); // serverId
            //for (let i = 0, j = 17; i < 16; i++, j++) {
            //    (msg.readInt8(j) & 0xff) != MAGIC[i]; // magic
            //}
            let serverName = msg.toString('utf8', 35/*, msg.readInt16BE(33)*/).split(';'),
                formatted = '';
            switch (serverName.length) {
                case 0:
                    break;
                default:
                    if (serverName.length > 12) {
                        formatted += '  extras:\n';
                        for (let i = 12; i < serverName.length; i++) {
                            formatted += `    ${serverName[i]}\n`;
                        }
                    }
                case 12:
                    formatted = `  ipv6 port: ${serverName[11]}\n` + formatted;
                case 11:
                    formatted = `  ipv4 port: ${serverName[10]}\n` + formatted;
                case 10:
                    formatted = `  nintendo limited: ${serverName[9] == 0}\n` + formatted;
                case 9:
                    formatted = `  game type: ${serverName[8]}\n` + formatted;
                case 8:
                    formatted = `  sub motd: ${serverName[7]}\n` + formatted;
                case 7:
                    formatted = `  server id: ${serverName[6]}\n` + formatted;
                case 6:
                    formatted = `  max player count: ${serverName[5]}\n` + formatted;
                case 5:
                    formatted = `  player count: ${serverName[4]}\n` + formatted;
                case 4:
                    formatted = `  version: ${serverName[3]}\n` + formatted;
                case 3:
                    formatted = `  protocol: ${serverName[2]}\n` + formatted;
                case 2:
                    formatted = `  motd: ${serverName[1]}\n` + formatted;
                case 1:
                    formatted = `  game: ${serverName[0]}\n` + formatted;
            }
            console.log(`client received:\n${formatted}from ${rinfo.address}:${rinfo.port}`);
        }
    } catch (err) {
        console.error(`client received incorrect data:\n${msg}\n${err}`);
    }
});

client.on('listening', () => {
    const address = client.address();
    console.log(`client started on ${address.address}:${address.port}`);
    timer = setInterval(() => {
        try {
            ping();
        } catch (err) {
            console.error(err);
        }
    }, config.period);
});

client.bind(Math.floor(Math.random() * 40001 + 20000));
