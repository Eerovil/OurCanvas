from models import FullStroke, StrokePoint
from typing import List

import logging
logger = logging.getLogger(__name__)


def full_strokes_serializer(strokes) -> None:
    """
    Return a serialized version of the strokes list as dict
    """

    if len(strokes) == 0:
        return {}

    if isinstance(strokes[0], int):
        strokes = (
            FullStroke
            .query
            .filter(FullStroke.id.in_(strokes))
            .all()
        )

    ret = {}
    for stroke in strokes:
        ret[stroke.id] = {
            "id": stroke.id,
            "color_id": stroke.color_id,
            "pen_size": stroke.pen_size,
            "user_id": stroke.user_id,
            "finished": stroke.finished,
            "points": [],
            "deleted": stroke.deleted,
            "erase": stroke.erase or False,
        }

    stroke_ids = list(ret.keys())

    # Get all the points for the strokes
    # Order by "order"
    stroke_points = (
        StrokePoint
        .query
        .filter(StrokePoint.stroke_id.in_(stroke_ids))
        .order_by(StrokePoint.order)
        .all()
    )

    for point in stroke_points:
        ret[point.stroke_id]["points"].append({
            "x": point.x,
            "y": point.y
        })

    return ret


def get_all_strokes(min_x, min_y, max_x, max_y):
    """
    Return all strokes that are within the given rectangle
    """
    stroke_points = (
        StrokePoint
        .query
        .filter(StrokePoint.x >= min_x)
        .filter(StrokePoint.x <= max_x)
        .filter(StrokePoint.y >= min_y)
        .filter(StrokePoint.y <= max_y)
    )

    full_stroke_ids_set = set()
    for point in stroke_points:
        full_stroke_ids_set.add(point.stroke_id)

    full_strokes = (
        FullStroke
        .query
        .filter(FullStroke.id.in_(full_stroke_ids_set))
        .filter(FullStroke.deleted == False)
        .all()
    )

    return full_strokes_serializer(full_strokes)

def onSegment(p, q, r):
	if ( (q.x <= max(p.x, r.x)) and (q.x >= min(p.x, r.x)) and
		(q.y <= max(p.y, r.y)) and (q.y >= min(p.y, r.y))):
		return True
	return False

def orientation(p, q, r):
	val = (float(q.y - p.y) * (r.x - q.x)) - (float(q.x - p.x) * (r.y - q.y))
	if (val > 0):
		return 1
	elif (val < 0):
		return 2
	else:
		return 0

def doIntersect(p1,q1,p2,q2):
	o1 = orientation(p1, q1, p2)
	o2 = orientation(p1, q1, q2)
	o3 = orientation(p2, q2, p1)
	o4 = orientation(p2, q2, q1)

	if ((o1 != o2) and (o3 != o4)):
		return True

	if ((o1 == 0) and onSegment(p1, p2, q1)):
		return True

	if ((o2 == 0) and onSegment(p1, q2, q1)):
		return True

	if ((o3 == 0) and onSegment(p2, p1, q2)):
		return True

	if ((o4 == 0) and onSegment(p2, q1, q2)):
		return True

	return False


class BasePoint:
    def __init__(self, x, y):
        self.x = x
        self.y = y


def handle_erase(db, strokepoints: List[StrokePoint], full_stroke_id: int):
    # Mark intersecting fullstrokes as deleted
    lines = []
    changed_strokes = {}

    logger.info("Handling erase, %s", [(point.x, point.y) for point in strokepoints])

    if len(strokepoints) < 2:
        return []

    last_x, last_y = None, None
    for strokepoint in sorted(strokepoints, key=lambda x: x.order):
        if last_x is None:
            last_x, last_y = strokepoint.x, strokepoint.y
            continue
        
        lines.append((BasePoint(last_x, last_y), BasePoint(strokepoint.x, strokepoint.y)))
        last_x, last_y = strokepoint.x, strokepoint.y

    avg_line_length = sum([((p1.x - p2.x)**2 + (p1.y - p2.y)**2)**0.5 for p1,p2 in lines]) / len(lines)

    # Find points that are within 4 times the average line length
    # Away from the given points

    minx = min([p1.x for p1,p2 in lines]) - avg_line_length * 4
    maxx = max([p1.x for p1,p2 in lines]) + avg_line_length * 4
    miny = min([p1.y for p1,p2 in lines]) - avg_line_length * 4
    maxy = max([p1.y for p1,p2 in lines]) + avg_line_length * 4

    # Get all the points that are within the rectangle
    # defined by the min and max values
    points = (
        StrokePoint
        .query
        .filter(StrokePoint.x >= minx)
        .filter(StrokePoint.x <= maxx)
        .filter(StrokePoint.y >= miny)
        .filter(StrokePoint.y <= maxy)
        .filter(StrokePoint.stroke_id != full_stroke_id)
        .filter(StrokePoint.stroke.has(FullStroke.erase == False))
        .filter(StrokePoint.stroke.has(FullStroke.deleted == False))
        .all()
    )

    logger.info("Checking %s points for intersections with %s lines", len(points), len(lines))

    prev_point = None
    for point in points:
        if point.stroke_id in changed_strokes:
            continue
        if prev_point is None:
            prev_point = point
            continue
        for (p1, p2) in lines:
            logger.info("Checking line %s %s %s %s with points %s %s %s %s", p1.x, p1.y, p2.x, p2.y, prev_point.x, prev_point.y, point.x, point.y)
            if doIntersect(prev_point, point, p1, p2):
                # Mark the stroke as deleted
                FullStroke.query.filter(FullStroke.id == point.stroke_id).update({"deleted": True})
                changed_strokes[point.stroke_id] = True
                logger.info("Marked stroke %s as deleted", point.stroke_id)
                break
        prev_point = point

    db.session.commit()

    return list(changed_strokes.keys())
