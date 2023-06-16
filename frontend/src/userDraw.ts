// This handles the drawing that the user has in progress.

import * as PIXI from 'pixi.js'
import { fullStrokeToGraphics } from './drawingUtils';

type UnsentStroke = {
    currentOrder: number,
    sentPoints: StrokePoint[],
    unsentPoints: StrokePoint[],
    strokeId?: number,
    finished?: boolean,
    graphics?: PIXI.Graphics,
}

export class UserDrawHandler {
    container: PIXI.Container
    userId: number;
    stroking: boolean = false;

    unsentStrokes: UnsentStroke[] = [];

    startStrokeHandler: ((x: number, y: number) => void) | null = null;
    continueStrokeHandler: ((strokeId: number, points: StrokePoint[]) => void) | null = null;
    finishStrokeHandler: ((strokeId: number) => void) | null = null;

    constructor(userId: number, container: PIXI.Container) {
        this.userId = userId
        this.container = container;
        // container.interactive = true
        // @ts-ignore
        this.container.on('pointerdown', (e: PIXI.InteractionEvent) => {
            this.mouseDownHandler(e.data.global.x, e.data.global.y)
        })
        // @ts-ignore
        this.container.on('pointermove', (e: PIXI.InteractionEvent) => {
            this.mouseMoveHandler(e.data.global.x, e.data.global.y)
        })
        // @ts-ignore
        this.container.on('pointerup', (e: PIXI.InteractionEvent) => {
            this.mouseUpHandler()
        })
        setInterval(() => {
            try {
                this.sendUpdates()
            } catch (e) {
                console.error(e)
            }
        }, 500)
    }

    sendUpdates() {
        if (!this.continueStrokeHandler) {
            return
        }
        for (const unsentStroke of this.unsentStrokes) {
            if (!unsentStroke.strokeId) {
                continue
            }
            if (unsentStroke.unsentPoints.length == 0) {
                continue
            }
            this.continueStrokeHandler(unsentStroke.strokeId, unsentStroke.unsentPoints)
            unsentStroke.sentPoints.push(...unsentStroke.unsentPoints)
            unsentStroke.unsentPoints = []
            console.log("continueStrokeHandler ", unsentStroke.strokeId, unsentStroke.sentPoints.length)
        }
    }

    updateDisplay() {
        for (const unsentStroke of this.unsentStrokes) {
            if (unsentStroke.graphics) {
                unsentStroke.graphics.destroy()
                unsentStroke.graphics = undefined
            }
            const points = unsentStroke.sentPoints.concat(unsentStroke.unsentPoints).map((point) => point as StrokePoint);
            if (points.length == 0) {
                continue;
            }
            const values = fullStrokeToGraphics({
                id: unsentStroke.strokeId || 0,
                points: points,
                user_id: this.userId,
                color: 0x000000,
                pen_size: 2,
            } as FullStroke);
            unsentStroke.graphics = values.graphics
            unsentStroke.graphics.x = values.box.x
            unsentStroke.graphics.y = values.box.y
            this.container.addChild(unsentStroke.graphics)
        }
    }

    mouseDownHandler(x: number, y: number) {
        if (this.startStrokeHandler) {
            this.stroking = true;
            this.startStrokeHandler(x, y);
            this.unsentStrokes.push({
                currentOrder: 0,
                sentPoints: [],
                unsentPoints: [],
            })
            console.log("startStrokeHandler ", x, y)
        }
        this.updateDisplay();
    }

    mouseMoveHandler(x: number, y: number) {
        if (!this.continueStrokeHandler) {
            return
        }
        if (!this.stroking) {
            return
        }
        const currentStroke = this.unsentStrokes[this.unsentStrokes.length - 1]
        if (!currentStroke) {
            return
        }
        const lastPoint = currentStroke.unsentPoints[currentStroke.unsentPoints.length - 1]
        if (lastPoint && lastPoint.x == x && lastPoint.y == y) {
            return
        }
        currentStroke.currentOrder++;
        currentStroke.unsentPoints.push({
            order: currentStroke.currentOrder,  // This is ignored in the backend.
            x: x,
            y: y,
        })
        this.updateDisplay();
    }

    mouseUpHandler() {
        this.stroking = false;
        const currentStroke = this.unsentStrokes[this.unsentStrokes.length - 1]
        if (!currentStroke) {
            return
        }
        // Mark as pending deletion
        currentStroke.finished = true;
        console.log("mouseUpHandler ", currentStroke.sentPoints.length, currentStroke.unsentPoints.length)
        if (this.finishStrokeHandler && currentStroke.strokeId) {
            this.finishStrokeHandler(currentStroke.strokeId);
        }
        this.updateDisplay();
    }

    handlePartialDump(data: PartialDump) {
        if (this.unsentStrokes.length == 0) {
            return;
        }
        if (data.strokes) {
            for (const unsentStroke of this.unsentStrokes) {
                // Fetch strokeId(s)  (It's possible that we managed to make multiple strokes in the time it took to get a partial dump)
                if (!unsentStroke.strokeId) {
                    for (const stroke of Object.values(data.strokes)) {
                        if (stroke.user_id == this.userId) {
                            unsentStroke.strokeId = stroke.id
                            break
                        }
                    }
                }
                if (!unsentStroke.strokeId || !data.strokes[unsentStroke.strokeId]) {
                    continue
                }
                if (unsentStroke.finished) {
                    const totalPointsCount = unsentStroke.sentPoints.length + unsentStroke.unsentPoints.length
                    const receivedPointsCount = data.strokes[unsentStroke.strokeId].points.length
                    if (totalPointsCount == receivedPointsCount) {
                        // We're done with this stroke.
                        if (unsentStroke.graphics) {
                            unsentStroke.graphics.destroy()
                        }
                        this.unsentStrokes.splice(this.unsentStrokes.indexOf(unsentStroke), 1)
                        console.log("handlePartialDump ", unsentStroke.strokeId, totalPointsCount, receivedPointsCount)
                    }
                }
            }
        }
    }
}
