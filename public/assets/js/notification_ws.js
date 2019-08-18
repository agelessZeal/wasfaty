// Create Import WeSocket Client......................
var ws_msg,
    comment_ws_conn = false,
    recv_info;

//WebSocket Message Types from Client
/**
 * Message Body
 *From Msg {type: MsgType: data: '', recId:recId}
 * To Msg {type: MsgType, data: recordInfo, recId: recID}
 */
const INIT = "INIT";
const PING = "PING";
//WebSocket Message Types to send Client
const INIT_REPLY = "INIT_REPLY";
const NEW_ANN = "NEW_ANN"; // New Announcement.
const PONG = "PONG";

function connectToNotifyWS() {
    if (location.href.indexOf('https://') > -1) {
        ws_msg = new WebSocket(`wss://${siteDomain}:${wsPort}/wss_msg`);
    } else {
        ws_msg = new WebSocket(`ws://${siteDomain}:${wsPort}/wss_msg`);
    }
    // event emmited when connected
    ws_msg.onopen = function () {
        //When client connect to ws server, we need to send user's email information together!
        ws_msg.send(JSON.stringify({type: INIT, data: ""}));
    };

    ws_msg.onmessage = function (ev) {
        recv_info = JSON.parse(ev.data);
        switch (recv_info.type) {
            case PONG:
                // console.log(recv_info.data);
                break;
            case INIT_REPLY :
                comment_ws_conn = true;
                console.log('ws connection success');
                break;
            case NEW_ANN:
                showNotify(recv_info.data.title, recv_info.data.description, recv_info.data.userType);
                break;
        }
    };

    ws_msg.onclose = function (ev) {
        console.log("WS Connection closed...");
    };

    ws_msg.onerror = function (err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        ws_msg.close();
    };
}

function showNotify(title, text, userType) {
    if (userRole.indexOf(userType)>-1) {
        PNotify.success({
            title: title,
            text: text,
            stack: {
                dir1: 'up',
                dir2: 'right', // Position from the top left corner.
                firstpos1: 10, firstpos2: 10 // 30px from the top, 30px from the left.
            },
        });
    }
}

/****
 * Import Websocket Test Message
 */
setInterval(function () {
    if (ws_msg.readyState === ws_msg.CLOSED) {
        // console.log('Alert Connection has been closed....');
    } else {
        ws_msg.send(JSON.stringify({type: PING, data: ""}));
    }
}, 20000);

connectToNotifyWS();
//***************************************************************************************
