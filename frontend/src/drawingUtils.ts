
import * as PIXI from 'pixi.js-legacy'
import { getGlobal } from './globals'

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
    const color = getGlobal().colors[fullStroke.color_id].hex;
    graphics.lineStyle({
        width: fullStroke.pen_size,
        color: color,
        alpha: 0.95,
        join: PIXI.LINE_JOIN.ROUND,
        cap: PIXI.LINE_CAP.ROUND,
    });
    if (fullStroke.points.length == 1) {
        // Draw filled dot
        graphics.moveTo(fullStroke.points[0].x - originX, fullStroke.points[0].y - originY);
        graphics.lineTo(fullStroke.points[0].x - originX + 1, fullStroke.points[0].y - originY + 1);
    } else {
        graphics.moveTo(fullStroke.points[0].x - originX, fullStroke.points[0].y - originY);
        for (const point of fullStroke.points) {
            graphics.lineTo(point.x - originX, point.y - originY);
        }
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
