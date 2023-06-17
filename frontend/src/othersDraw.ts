// This uses pixijs and draws everything other people have drawn.

import * as PIXI from 'pixi.js'
import { fullStrokeToGraphics } from './drawingUtils'

export class DrawingsDisplay {
    container: PIXI.Container
    renderer: PIXI.Renderer

    drawings: Map<number, PIXI.Sprite> = new Map()
    progressDrawings: Map<number, PIXI.Graphics> = new Map()

    constructor(container: PIXI.Container, renderer: PIXI.Renderer) {
        this.container = container
        // @ts-ignore
        this.renderer = renderer;
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

        const renderTexture = renderer.generateTexture(graphics)

        const sprite = new PIXI.Sprite(renderTexture)
        sprite.position.x = box.x - 1
        sprite.position.y = box.y - 1
        this.drawings.set(fullStroke.id, sprite)

        this.container.addChild(sprite)
        // this.container.addChild(graphics)

        console.log('added finished drawing', fullStroke.id, box.x, box.y, box.width, box.height, renderTexture.width, renderTexture.height, graphics.width, graphics.height)
    }

    addInProgressDrawing(fullStroke: FullStroke) {
        if (fullStroke.erase) {
            return;
        }
        // Add (or recreate) the drawing which is a graphics object in this case.
        const { graphics, box } = fullStrokeToGraphics(fullStroke)
        this.deleteInProgressDrawing(fullStroke.id);
        graphics.x = box.x + 1
        graphics.y = box.y + 1
        graphics.width = box.width
        graphics.height = box.height
        this.progressDrawings.set(fullStroke.id, graphics)
        this.container.addChild(graphics)
        console.log('updated in progress drawing', fullStroke.id)
    }

    deleteInProgressDrawing(strokeId: number) {
        if (this.progressDrawings.has(strokeId)) {
            const removed = this.container.removeChild(this.progressDrawings.get(strokeId)!)
            console.log('deleted in progress drawing', strokeId, removed)
            this.progressDrawings.get(strokeId)!.destroy()
            this.progressDrawings.delete(strokeId)
        } else {
            console.log('tried to delete in progress drawing', strokeId, 'but it did not exist')
        }
    }

    deleteDrawing(strokeId: number) {
        if (this.drawings.has(strokeId)) {
            const removed = this.container.removeChild(this.drawings.get(strokeId)!)
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