// This handles the drawing that the user has in progress.

export class UserDrawHandler {
    userId: number;
    fullStrokeId: number | null = null;
    unsentPoints: StrokePoint[] = [];
    pendingUpdate: boolean = false;
    lastOrder: number = -1;

    startStrokeHandler: ((x: number, y: number) => void) | null = null;
    continueStrokeHandler: ((strokeId: number, points: StrokePoint[], lastOrder: number) => void) | null = null;

    constructor(userId: number) {
        this.userId = userId
    }

    mouseDownHandler(x: number, y: number) {
        if (this.startStrokeHandler) {
            this.pendingUpdate = true;
            this.startStrokeHandler(x, y);
        }
    }

    mouseMoveHandler(x: number, y: number) {
        if (!this.continueStrokeHandler) {
            return
        }
        if (this.fullStrokeId && !this.pendingUpdate) {
            this.unsentPoints.push({
                order: 0,  // This is ignored in the backend.
                x: x,
                y: y,
            })
            this.pendingUpdate = true;
            this.continueStrokeHandler(this.fullStrokeId, this.unsentPoints, this.lastOrder)
            this.unsentPoints = []
        } else {
            this.unsentPoints.push({
                order: 0,  // This is ignored in the backend.
                x: x,
                y: y,
            })
        }
    }

    handlePartialDump(data: PartialDump) {
        if (!this.pendingUpdate) {
            return;
        }
        if (data.strokes) {
            if (!this.fullStrokeId) {
                // This is the first partial dump we get, so we need to find our stroke id.
                for (const stroke of Object.values(data.strokes)) {
                    if (stroke.user_id == this.userId) {
                        this.fullStrokeId = stroke.id
                        this.lastOrder = 0
                        this.pendingUpdate = false
                        return
                    }
                }
            }
            if (!this.fullStrokeId) {
                return;
            }
            const stroke = data.strokes[this.fullStrokeId]
            if (!stroke) {
                console.error("Stroke not found")
                return;
            }
            for (const point of stroke.points) {
                this.lastOrder = point.order;
            }
            this.pendingUpdate = false
        }
    }
}
