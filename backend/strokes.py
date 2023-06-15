from models import FullStroke, StrokePoint
from typing import List


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
            "points": []
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
        .all()
    )

    return full_strokes_serializer(full_strokes)
