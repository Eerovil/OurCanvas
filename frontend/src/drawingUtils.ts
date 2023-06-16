import * as PIXI from 'pixi.js'

export function fullStrokeToGraphics(fullStroke: FullStroke): { graphics: PIXI.Graphics, box: { x: number, y: number, width: number, height: number } } {
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
