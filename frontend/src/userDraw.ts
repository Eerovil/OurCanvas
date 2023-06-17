// This handles the drawing that the user has in progress.

import * as PIXI from 'pixi.js'
import { fullStrokeToGraphics } from './drawingUtils';
import { Viewport } from 'pixi-viewport';
import { getGlobal } from './globals';

type UnsentStroke = {
    currentOrder: number,
    sentPoints: StrokePoint[],
    unsentPoints: StrokePoint[],
    strokeId?: number,
    finished?: boolean,
    graphics?: PIXI.Graphics,
    erase: boolean,
}

export class UserDrawHandler {
    container: PIXI.Container
    userId: number;
    stroking: boolean = false;
    maybeStartStroke: { x: number, y: number } | null = null;

    selectedColorId: number = 1;
    selectedPenSize: number = 6;
    eraserMode: boolean = false;

    unsentStrokes: UnsentStroke[] = [];
    blockSend: boolean = false;

    startStrokeHandler: ((x: number, y: number, penSize: number, colorId: number, erase: boolean) => void) | null = null;
    continueStrokeHandler: ((strokeId: number, points: StrokePoint[]) => void) | null = null;
    finishStrokeHandler: ((strokeId: number) => void) | null = null;

    constructor(userId: number, container: PIXI.Container) {
        this.userId = userId
        this.container = container;
        // container.interactive = true
        // @ts-ignore
        this.container.on('pointerdown', (e: PIXI.InteractionEvent) => {
            console.log('pointerdown', e.global.x, e.global.y, e)
            const { x, y } = (container as Viewport).toWorld(e.data.global.x, e.data.global.y)
            this.mouseDownHandler(x, y);
        })
        // @ts-ignore
        this.container.on('pointermove', (e: PIXI.InteractionEvent) => {
            const { x, y } = (container as Viewport).toWorld(e.data.global.x, e.data.global.y)
            this.mouseMoveHandler(x, y)
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
        this.buildToolBar();
    }

    buildToolBar() {
        const isMobile = window.innerWidth < 800;
        if (!isMobile) {
            return;
        }
        const toolBar = document.createElement('div')
        toolBar.style.position = 'fixed'
        toolBar.style.top = '0px'
        toolBar.style.left = '0px'
        toolBar.style.backgroundColor = 'grey'
        toolBar.style.padding = '1px'
        toolBar.style.border = '1px solid black'
        toolBar.style.zIndex = '100'
        toolBar.style.display = 'flex'
        toolBar.style.width = '100%'
        toolBar.style.justifyContent = 'space-between'


        const leftSide = document.createElement('div')

        const allPenSizes = [1, 3, 6, 10, 15, 30]
        for (const penSize of allPenSizes) {
            const penSizeButton = document.createElement('button')
            penSizeButton.innerText = penSize.toString()
            penSizeButton.addEventListener('click', () => {
                this.selectedPenSize = penSize
            })
            leftSide.appendChild(penSizeButton)
        }
        toolBar.appendChild(leftSide)

        const rightSide = document.createElement('div')
        rightSide.style.height = '100%'

        const allColors = getGlobal().colors
        for (const colorId in allColors) {
            const colorButton = document.createElement('button')
            colorButton.innerHTML = '&nbsp;'
            colorButton.style.height = '100%';
            colorButton.style.width = '25px';
            colorButton.style.backgroundColor = allColors[colorId].hex;
            colorButton.addEventListener('click', () => {
                this.selectedColorId = parseInt(colorId)
                this.eraserMode = false;
            })
            rightSide.appendChild(colorButton)
        }

        toolBar.appendChild(rightSide)

        const eraserButton = document.createElement('button')
        eraserButton.innerText = 'Kumi'
        eraserButton.addEventListener('click', () => {
            this.eraserMode = true;
        })
        toolBar.appendChild(eraserButton)

        document.body.appendChild(toolBar)

        return toolBar
    }

    sendUpdates() {
        if (!this.continueStrokeHandler) {
            return
        }
        if (this.blockSend) {
            return
        }
        for (const unsentStroke of this.unsentStrokes) {
            if (!unsentStroke.strokeId) {
                continue
            }
            if (unsentStroke.unsentPoints.length == 0) {
                continue
            }
            this.blockSend = true
            this.continueStrokeHandler(unsentStroke.strokeId, unsentStroke.unsentPoints)
            unsentStroke.sentPoints.push(...unsentStroke.unsentPoints)
            console.log("continueStrokeHandler ", unsentStroke.strokeId, unsentStroke.unsentPoints.length)
            unsentStroke.unsentPoints = []
        }
    }

    updateDisplay() {
        for (const unsentStroke of this.unsentStrokes) {
            if (unsentStroke.graphics) {
                console.log("destroying graphics for ", unsentStroke.strokeId);
                unsentStroke.graphics.destroy()
                unsentStroke.graphics = undefined
            }
            const points = unsentStroke.sentPoints.concat(unsentStroke.unsentPoints).map((point) => point as StrokePoint);
            if (points.length == 0) {
                continue;
            }
            if (unsentStroke.erase) {
                return;
            }
            console.log("updateDisplay ", unsentStroke.strokeId, points.length)
            const values = fullStrokeToGraphics({
                id: unsentStroke.strokeId || 0,
                points: points,
                user_id: this.userId,
                color_id: this.selectedColorId,
                pen_size: this.selectedPenSize,
            } as FullStroke);
            if (unsentStroke.graphics) {
                console.log("destroying graphics for ", unsentStroke.strokeId);
                (unsentStroke.graphics as PIXI.Graphics).destroy()
                unsentStroke.graphics = undefined
            }
            unsentStroke.graphics = values.graphics
            unsentStroke.graphics.x = values.box.x
            unsentStroke.graphics.y = values.box.y
            console.log("adding graphics for ", unsentStroke.strokeId);
            this.container.addChild(unsentStroke.graphics)
        }
    }

    mouseDownHandler(x: number, y: number) {
        x = Math.round(x)
        y = Math.round(y)
        if (this.stroking) {
            // This is a multi-touch event, cancel the current stroke
            this.cancelStroke();
            return;
        }
        this.maybeStartStroke = { x, y };
        this.stroking = true;
    }

    finalizeStartStroke() {
        if (!this.maybeStartStroke) {
            return
        }

        const { x, y } = this.maybeStartStroke;

        if (this.startStrokeHandler) {
            this.startStrokeHandler(x, y, this.selectedPenSize, this.selectedColorId, this.eraserMode);
            this.unsentStrokes.push({
                currentOrder: 0,
                erase: this.eraserMode,
                sentPoints: [{
                    order: 0,
                    x: x,
                    y: y,
                }],
                unsentPoints: [],
            })
            console.log("startStrokeHandler ", x, y)
        }
        this.updateDisplay();
        this.maybeStartStroke = null;
    }

    mouseMoveHandler(x: number, y: number) {
        x = Math.round(x)
        y = Math.round(y)
        console.log("mouseMoveHandler ", x, y)
        this.finalizeStartStroke();
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
            order: currentStroke.currentOrder,
            x: x,
            y: y,
        })
        this.sendUpdates();
        this.updateDisplay();
    }

    mouseUpHandler() {
        this.finalizeStartStroke();
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

    cancelStroke() {
        console.log("cancelStroke")
        this.stroking = false;
        this.maybeStartStroke = null;
        const currentStroke = this.unsentStrokes[this.unsentStrokes.length - 1]
        if (!currentStroke) {
            return
        }
        // Mark as pending deletion
        currentStroke.finished = true;
        if (this.finishStrokeHandler && currentStroke.strokeId) {
            this.finishStrokeHandler(currentStroke.strokeId);
        }
    }

    handlePartialDump(data: PartialDump) {
        this.blockSend = false
        if (this.unsentStrokes.length == 0) {
            console.log("handlePartialDump no unsentStrokes")
            return;
        }
        if (data.strokes) {
            for (const unsentStroke of this.unsentStrokes) {
                // Fetch strokeId(s)  (It's possible that we managed to make multiple strokes in the time it took to get a partial dump)
                if (!unsentStroke.strokeId) {
                    for (const stroke of Object.values(data.strokes)) {
                        if (stroke.user_id == this.userId && stroke.points[0].x == unsentStroke.sentPoints[0].x && stroke.points[0].y == unsentStroke.sentPoints[0].y) {
                            unsentStroke.strokeId = stroke.id
                            break
                        }
                    }
                }
                if (!unsentStroke.strokeId) {
                    console.log("handlePartialDump no strokeId")
                }
                const serverSideStroke = data.strokes[unsentStroke.strokeId as number]
                unsentStroke.strokeId = unsentStroke.strokeId as number;
                if (!serverSideStroke) {
                    console.log(`handlePartialDump no serverSideStroke (userId=${this.userId}, strokeId=${unsentStroke.strokeId})`)
                    continue
                }
                console.log("handlePartialDump ", unsentStroke.strokeId, unsentStroke.finished)
                if (serverSideStroke.deleted) {
                    this.unsentStrokes.splice(this.unsentStrokes.indexOf(unsentStroke), 1)
                    if (unsentStroke.graphics) {
                        unsentStroke.graphics.destroy()
                        console.log("handlePartialDump destroy ", unsentStroke.strokeId)
                    }
                }
                if (unsentStroke.finished) {
                    const totalPointsCount = unsentStroke.sentPoints.length + unsentStroke.unsentPoints.length
                    const receivedPointsCount = data.strokes[unsentStroke.strokeId].points.length
                    if (totalPointsCount == receivedPointsCount) {
                        // We're done with this stroke.
                        if (unsentStroke.graphics) {
                            unsentStroke.graphics.destroy()
                            console.log("handlePartialDump destroy ", unsentStroke.strokeId)
                        }
                        this.unsentStrokes.splice(this.unsentStrokes.indexOf(unsentStroke), 1)
                        console.log("handlePartialDump delete ", unsentStroke.strokeId, totalPointsCount, receivedPointsCount)

                        if (!serverSideStroke?.finished) {
                            this.finishStrokeHandler && this.finishStrokeHandler(unsentStroke.strokeId)
                        }
                    }
                }
            }
        }
    }
}
