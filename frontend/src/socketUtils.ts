import { io } from "socket.io-client";


// "undefined" means the URL will be computed from the `window.location` object
// Create url like this: /ourcanvas/socketio

const URL = window.location.protocol + "//" + window.location.host;
console.log("URL: ", URL);

interface socketUtilsProps {
    nickname: string,
    fullDumpCallback?: (data: FullDump) => void,
}

class socketUtils {
    fullDumpCallback: (data: FullDump) => void
    partialDumpCallbacks: any
    nickname: string
    socket: any

    constructor(props: socketUtilsProps) {
        this.nickname = props.nickname
        this.fullDumpCallback = props.fullDumpCallback || (() => { })
        try {
            this.socket = io(URL, {
                path: "/ourcanvas/socket.io",
                forceNew: true,
                retries: 10,
                ackTimeout: 1000
            });
        } catch (e) {
            console.log("Error: ", e);
        }
        window.onunload = () => {
            this.socket.close();
        }
    }

    handlePartialDump(data: PartialDump) {
        for (const callback of this.partialDumpCallbacks) {
            callback(data);
        }
    }

    afterFirstConnect() {
        this.socket.on('entity_update', (data: PartialDump) => {
            this.handlePartialDump(data);
        });
        this.socket.on('disconnect', () => {
            // After a disconnect, we want to reload the page
            // after reconnecting
            this.socket.on('connect', () => {
                window.location.reload();
            });
        });
    }

    waitUntilConnected() {
        return new Promise((resolve) => {
            this.socket.on('connect', () => {
                // Send a POST request to /ourcanvas/api/firstConnect
                // to get the initial state of the game
                // NOTE: Don't use socketio
                fetch('/ourcanvas/api/firstConnect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nickname: this.nickname,
                        requestSid: this.socket.id,
                    })
                }).then((response) => response.json()).then((data: FullDump) => {
                    console.log("connected: ", data);
                    if (!data || !data.users) {
                        console.error("No data")
                        return;
                    }
                    this.fullDumpCallback(data);
                    this.afterFirstConnect();
                    resolve(null);
                });
            });
        });
    }

    startStroke(x: number, y: number) {
        this.socket.emit('start_stroke', {
            x: x,
            y: y,
        });
    }

    continueStroke(strokeId: number, points: StrokePoint[], lastOrder: number) {
        this.socket.emit('continue_stroke', {
            strokeId: strokeId,
            points: points,
            lastOrder: lastOrder,
        });
    }

}

export async function initNetwork(props: socketUtilsProps) {
    const ret = new socketUtils(props);
    await ret.waitUntilConnected();
    return ret;
}
