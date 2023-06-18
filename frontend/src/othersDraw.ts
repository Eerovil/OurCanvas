// This uses pixijs and draws everything other people have drawn.

import * as PIXI from 'pixi.js-legacy'
import { fullStrokeToGraphics } from './drawingUtils'
import { getGlobal } from './globals';

export class DrawingsDisplay {
    container: PIXI.Container
    childContainer: PIXI.Container = new PIXI.Container()
    renderer: PIXI.Renderer

    drawings: Map<number, PIXI.Sprite> = new Map()
    progressDrawings: Map<number, PIXI.Graphics> = new Map()

    constructor(container: PIXI.Container, renderer: PIXI.Renderer) {
        this.container = container
        this.container.addChild(this.childContainer)
        // @ts-ignore
        this.renderer = renderer;
        this.drawBorders();
    }

    drawBorders() {
        const mapSize = getGlobal().mapSize;
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(10, 0x000000, 1);
        graphics.drawRect(0, 0, mapSize[0], mapSize[1]);
        this.container.addChild(graphics);
    }

    addInProgressDrawing(fullStroke: FullStroke) {
        if (fullStroke.erase) {
            return;
        }
        // Add (or recreate) the drawing which is a graphics object in this case.
        const { graphics, box } = fullStrokeToGraphics(fullStroke)
        this.deleteInProgressDrawing(fullStroke.id);
        graphics.x = box.x
        graphics.y = box.y
        this.progressDrawings.set(fullStroke.id, graphics)
        this.childContainer.addChild(graphics)
        console.log('updated in progress drawing', fullStroke.id)
    }

    deleteInProgressDrawing(strokeId: number) {
        if (this.progressDrawings.has(strokeId)) {
            const removed = this.childContainer.removeChild(this.progressDrawings.get(strokeId)!)
            console.log('deleted in progress drawing', strokeId, removed)
            this.progressDrawings.get(strokeId)!.destroy()
            this.progressDrawings.delete(strokeId)
        } else {
            console.log('tried to delete in progress drawing', strokeId, 'but it did not exist')
        }
    }

    addDrawing(fullStroke: FullStroke) {
        if (fullStroke.deleted) {
            this.deleteInProgressDrawing(fullStroke.id)
            return
        }
        this.addInProgressDrawing(fullStroke)
    }

    handleFullDump(data: FullDump) {
        for (const strokeId in data.strokes) {
            this.addDrawing(data.strokes[strokeId])
        }
    }

    handlePartialDump(data: PartialDump) {
        for (const strokeId in data.strokes) {
            this.addDrawing(data.strokes[strokeId])
        }
    }
}