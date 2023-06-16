// This uses pixijs and draws everything other people have drawn.

import * as PIXI from 'pixi.js'

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

    fullStrokeToGraphics(fullStroke: FullStroke): { graphics: PIXI.Graphics, box: { x: number, y: number, width: number, height: number } } {
        let minX = fullStroke.points[0].x
        let maxX = fullStroke.points[0].x
        let minY = fullStroke.points[0].y
        let maxY = fullStroke.points[0].y
        for (const point of fullStroke.points) {
            minX = Math.min(minX, point.x)
            maxX = Math.max(maxX, point.x)
            minY = Math.min(minY, point.y)
            maxY = Math.max(maxY, point.y)
        }
        const originX = minX
        const originY = minY

        const width = maxX - minX
        const height = maxY - minY

        const graphics = new PIXI.Graphics();
        graphics.lineStyle(2, fullStroke.color, 1);
        graphics.moveTo(fullStroke.points[0].x - originX, fullStroke.points[0].y - originY);
        for (const point of fullStroke.points) {
            graphics.lineTo(point.x - originX, point.y - originY);
        }
        return {
            graphics,
            box: {
                x: originX,
                y: originY,
                width,
                height,
            }
        }
    }

    addFinishedDrawing(fullStroke: FullStroke) {
        // Create a new sprite from the graphics object.
        const { graphics, box } = this.fullStrokeToGraphics(fullStroke)

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
        const { graphics, box } = this.fullStrokeToGraphics(fullStroke)
        graphics.x = box.x
        graphics.y = box.y
        graphics.width = box.width
        graphics.height = box.height
        this.progressDrawings.set(fullStroke.id, graphics)
        this.container.addChild(graphics)
    }

    deleteInProgressDrawing(strokeId: number) {
        if (this.progressDrawings.has(strokeId)) {
            this.container.removeChild(this.progressDrawings.get(strokeId)!)
            this.progressDrawings.get(strokeId)!.destroy()
            this.progressDrawings.delete(strokeId)
        }
    }

    deleteDrawing(strokeId: number) {

    }

    addDrawing(fullStroke: FullStroke) {
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