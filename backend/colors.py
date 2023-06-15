

from models import Color


def get_all_colors():
    """
    Return all colors
    """
    ret = {}
    for color in Color.query.all():
        ret[color.id] = {
            "id": color.id,
            "name": color.name,
            "hex": color.hex,
        }
    return ret
