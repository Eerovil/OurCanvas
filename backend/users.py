

from models import User
import settings
import random


def get_user_id_by_sid(sid):
    """
    Return the user id for the given sid
    """
    user = (
        User
        .query
        .filter(User.request_sid == sid)
        .first()
    )

    if user is None:
        return None

    return user.id


def get_user(db, nickname):
    """
    Return the user with the given nickname

    or create a new one if it doesn't exist
    """
    # type object 'User' has no attribute 'query'
    user = (
        User
        .query
        .filter(User.name == nickname)
        .first()
    )

    if user is None:
        user = User(name=nickname)
        user.x = random.randint(0, settings.MAP_SIZE[0])
        user.y = random.randint(0, settings.MAP_SIZE[1])
        db.session.add(user)
        db.session.commit()

    return user


def get_all_users():
    """
    Return all users
    """
    ret = {}
    for user in User.query.all():
        ret[user.id] = {
            "id": user.id,
            "name": user.name,
            "x": user.x,
            "y": user.y
        }

    return ret
