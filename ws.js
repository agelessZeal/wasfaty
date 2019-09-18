let WebSocket, config, http, https, url;
config = require('./config/index');
http = require('http');
https = require('https');
url = require('url');
WebSocket = require('ws');
let fs = require('fs');

///Create WebSocket Server for Announcement Notification
let WS_msg = null, conn_msg = false;
let WS_driver = null, conn_driver = false;
global.wss_msg = new WebSocket.Server({noServer: true});
global.wss_driver = new WebSocket.Server({noServer: true});

let ws_server;
if (config.info.site_url.indexOf('https://') > -1) {
    let sslOptions = {
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.crt')
    };
    ws_server = https.createServer(sslOptions);
} else {
    ws_server = http.createServer();
}

ws_server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;
    if (pathname === '/wss_msg') {
        global.wss_msg.handleUpgrade(request, socket, head, (ws) => {
            global.wss_msg.emit('connection', ws);
        });
    } else if (pathname === '/wss_driver') {
        global.wss_driver.handleUpgrade(request, socket, head, (ws) => {
            global.wss_driver.emit('connection', ws);
        });
    } else {
        socket.destroy();
    }
});

ws_server.listen(config.ws_port);

//WebSocket Message Types from Client
const INIT = "INIT";
const PING = "PING";
//WebSocket Message Types to send Client
const INIT_REPLY = "INIT_REPLY";
const PONG = "PONG";

global.wss_msg.broadcast = function broadcast(data) {
    global.wss_msg.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

//********************************************************************************************
global.wss_msg.on('connection', function (ws) {
    WS_msg = ws;
    conn_msg = true;
    console.log('ws connection success notification websocket');
    ws.on('message', async function (message) {
        let msgObj, dataFrame;
        try {
            msgObj = JSON.parse(message);
            switch (msgObj.type) {
                case PING:
                    dataFrame = {type: PONG, data: global.wss_msg.clients.size};
                    ws.send(JSON.stringify(dataFrame));
                    break;
                case INIT:
                    dataFrame = {type: INIT_REPLY, data: global.wss_msg.clients.size};
                    ws.send(JSON.stringify(dataFrame));
                    break;

            }
        } catch (e) {
            console.log(e);
            console.log('============JSON Parsing Error Due to the Client\' Dummy Message');
        }
    });
    ws.on("close", function () {
        console.log('connection closed');
    });
    ws.on('error', function (err) {
        console.log('Comment Websocket Error!: ' + err);
    });
});
//***********************************Delivery Websocket*******************************************************
global.wss_driver.broadcast = function broadcast(data) {
    global.wss_driver.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};
global.wss_driver.on('connection', function (ws) {
    WS_driver = ws;
    conn_driver = true;
    console.log('ws connection success delivery websocket');
    ws.on('message', async function (message) {
        let msgObj, dataFrame;
        try {
            msgObj = JSON.parse(message);
            switch (msgObj.type) {
                case PING:
                    dataFrame = {type: PONG, data: global.wss_driver.clients.size};
                    ws.send(JSON.stringify(dataFrame));
                    break;
                case INIT:
                    dataFrame = {type: INIT_REPLY, data: global.wss_driver.clients.size};
                    ws.send(JSON.stringify(dataFrame));
                    break;

            }
        } catch (e) {
            console.log(e);
            console.log('============JSON Parsing Error Due to the Client\' Dummy Message');
        }
    });
    ws.on("close", function () {
        console.log('connection closed');
    });
    ws.on('error', function (err) {
        console.log('Comment Websocket Error!: ' + err);
    });
});
console.log(`Websocket server is running =>>>>>>>>>>>>>>>>> at ${config.ws_port} port`);
