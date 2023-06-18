import axios from "axios";
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
    partialDumpCallbacks: any[] = []
    nickname: string
    socket: any

    constructor(props: socketUtilsProps) {
        this.nickname = props.nickname
        this.fullDumpCallback = props.fullDumpCallback || (() => { })
        let reloadTimeout: any;
        try {
            let transport = ['websocket', 'polling'];
            const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            if (iOS) {
                transport = ['polling'];
            }
            this.socket = io(URL, {
                path: "/ourcanvas/socket.io",
                forceNew: true,
                retries: 10,
                ackTimeout: 1000,
                transports: transport,
            });
            // this.socket.on('disconnect', () => {
            //     reloadTimeout = setTimeout(() => {
            //         window.location.reload();
            //     }, 10000);
            // });
            // this.socket.on('connect', () => {
            //     if (reloadTimeout) {
            //         clearTimeout(reloadTimeout);
            //     }
            // });
        } catch (e) {
            console.log("Error: ", e);
        }
    }

    handlePartialDump(data: PartialDump) {
        console.log("partialDump: ", data, data.strokes);
        for (const callback of this.partialDumpCallbacks) {
            callback(data);
        }
    }

    afterFirstConnect() {
        this.socket.on('partialDump', (data: PartialDump) => {
            this.handlePartialDump(data);
        });
    }

    waitUntilConnected() {
        return new Promise((resolve) => {
            this.socket.on('connect', () => {
                console.log("connected");
                // Send a POST request to /ourcanvas/api/firstConnect
                // to get the initial state of the game
                // NOTE: Don't use socketio
                axios.post('/ourcanvas/api/firstConnect', {
                    nickname: this.nickname,
                    requestSid: this.socket.id,
                }).then((response) => response.data).then((data: FullDump) => {
                    console.log("connected: ", data);
                    if (!data || !data.users) {
                        console.error("No data")
                        return;
                    }
                    this.fullDumpCallback(data);
                    this.afterFirstConnect();
                    resolve(null);
                }).catch((e) => {
                    console.error("Error: ", e);
                });
            });
        });
    }

    startStroke(x: number, y: number, penSize: number, colorId: number, erase: boolean) {
        this.socket.emit('startStroke', {
            x: x,
            y: y,
            penSize: penSize,
            colorId: colorId,
            erase: erase,
        });
    }

    continueStroke(strokeId: number, points: StrokePoint[]) {
        this.socket.emit('continueStroke', {
            strokeId: strokeId,
            points: points,
        });
    }

    finishStroke(strokeId: number) {
        this.socket.emit('finishStroke', {
            strokeId: strokeId,
        });
    }
}

export async function initNetwork(props: socketUtilsProps) {
    const ret = new socketUtils(props);
    return ret;
}
