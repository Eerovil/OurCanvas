// This uses pixijs and draws everything other people have drawn.

import * as PIXI from 'pixi.js'
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

    addFinishedDrawing(fullStroke: FullStroke) {
        // Create a new sprite from the graphics object.
        const { graphics, box } = fullStrokeToGraphics(fullStroke)
        this.deleteDrawing(fullStroke.id)

        const renderer = this.renderer;

        // const renderTexture = PIXI.RenderTexture.create({
        //     width: box.width,
        //     height: box.height,
        //     resolution: window.devicePixelRatio
        // });
        // renderer.render(graphics, {
        //     renderTexture,
        // });

        const renderTexture = renderer.generateTexture(graphics, {
            region: new PIXI.Rectangle(-50, -50, box.width + 100, box.height + 100),
        })

        const sprite = new PIXI.Sprite(renderTexture)
        sprite.position.x = box.x - 50
        sprite.position.y = box.y - 50
        this.drawings.set(fullStroke.id, sprite)

        this.childContainer.addChild(sprite)
        graphics.destroy()
        // this.childContainer.addChild(graphics)

        console.log('added finished drawing', fullStroke.id)
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
        // graphics.width = box.width
        // graphics.height = box.height
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

    deleteDrawing(strokeId: number) {
        if (this.drawings.has(strokeId)) {
            const removed = this.childContainer.removeChild(this.drawings.get(strokeId)!)
            console.log('deleted drawing', strokeId, removed)
            this.drawings.get(strokeId)!.destroy()
            this.drawings.delete(strokeId)
        } else {
            console.log('tried to delete drawing', strokeId, 'but it did not exist')
        }
    }

    addDrawing(fullStroke: FullStroke) {
        if (fullStroke.deleted) {
            this.deleteInProgressDrawing(fullStroke.id)
            this.deleteDrawing(fullStroke.id)
            return
        }
        if (fullStroke.finished) {
            this.deleteInProgressDrawing(fullStroke.id)
            this.addFinishedDrawing(fullStroke)
        } else {
            this.addInProgressDrawing(fullStroke)
        }
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