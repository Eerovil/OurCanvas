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
        sprite.position.x = box.x
        sprite.position.y = box.y
        this.drawings.set(fullStroke.id, sprite)

        this.container.addChild(sprite)
        // this.container.addChild(graphics)

        console.log('added finished drawing', fullStroke.id, box.x, box.y, box.width, box.height, renderTexture.width, renderTexture.height, graphics.width, graphics.height)
    }

    addInProgressDrawing(fullStroke: FullStroke) {
        // Add (or recreate) the drawing which is a graphics object in this case.
        if (this.progressDrawings.has(fullStroke.id)) {
            this.container.removeChild(this.progressDrawings.get(fullStroke.id)!)
            this.progressDrawings.get(fullStroke.id)!.destroy()
        }
        const { graphics, box } = fullStrokeToGraphics(fullStroke)
        graphics.x = box.x
        graphics.y = box.y
        graphics.width = box.width
        graphics.height = box.height
        this.progressDrawings.set(fullStroke.id, graphics)
        this.container.addChild(graphics)
        console.log('updated in progress drawing', fullStroke.id)
    }

    deleteInProgressDrawing(strokeId: number) {
        if (this.progressDrawings.has(strokeId)) {
            console.log('deleted in progress drawing', strokeId)
            this.container.removeChild(this.progressDrawings.get(strokeId)!)
            this.progressDrawings.get(strokeId)!.destroy()
            this.progressDrawings.delete(strokeId)
        } else {
            console.log('tried to delete in progress drawing', strokeId, 'but it did not exist')
        }
    }

    deleteDrawing(strokeId: number) {
        if (this.drawings.has(strokeId)) {
            console.log('deleted drawing', strokeId)
            this.container.removeChild(this.drawings.get(strokeId)!)
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