#! /usr/bin/python3
# -*- encoding: utf-8 -*-

import sys

from flask import Flask, request, redirect
from flask_socketio import SocketIO, emit  # noqa
from flask_sqlalchemy import SQLAlchemy

import settings
from colors import get_all_colors
from models import Color, db, FullStroke, StrokePoint
from strokes import full_strokes_serializer, get_all_strokes  # noqa
from users import get_all_users, get_user, get_user_id_by_sid

import logging
logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO)


app = Flask(__name__, static_url_path='/ourcanvas/', static_folder='../static/')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ourcanvas.db'

db.init_app(app)

app.config['SECRET_KEY'] = 'eero'
socketio = SocketIO(app, path="/ourcanvas/socket.io", cors_allowed_origins="*")



@app.route('/')
def index():
    return redirect('/ourcanvas/index.html')


@app.route('/ourcanvas/')
def index2():
    return redirect('/ourcanvas/index.html')


@app.route('/ourcanvas/api/firstConnect', methods=['POST'])
def conn():
    data = request.get_json()
    logger.info("Connected: %s", data)
    nickname = data.get("nickname")
    user = get_user(db, nickname)
    user.request_sid = data.get("requestSid")
    db.session.commit()

    return full_dump()


@socketio.on('startStroke')
def start_stroke(data):
    logger.info("Start stroke: %s", data)
    user_id = get_user_id_by_sid(request.sid)

    full_stroke = FullStroke(
        color_id=data.get("colorId"),
        pen_size=data.get("penSize"),
        user_id=user_id,
        points=[
            StrokePoint(
                order=0,
                x=round(data.get("x")),
                y=round(data.get("y")),
            )
        ],
    )
    db.session.add(full_stroke)
    db.session.commit()

    emit('partialDump', partial_dump([full_stroke]), broadcast=True)



@socketio.on('continueStroke')
def continue_stroke(data):
    logger.info("Comtinue stroke: %s", data)

    full_stroke_id = data.get("strokeId")

    for stroke_point in data.get("points"):
        stroke_point = StrokePoint(
            stroke_id=full_stroke_id,
            order=stroke_point.get("order"),
            x=round(stroke_point.get("x")),
            y=round(stroke_point.get("y")),
        )
        db.session.add(stroke_point)
    db.session.commit()

    emit('partialDump', partial_dump([full_stroke_id]), broadcast=True)


@socketio.on('finishStroke')
def finish_stroke(data):
    logger.info("Finish stroke: %s", data)

    full_stroke_id = data.get("strokeId")

    full_stroke = FullStroke.query.get(full_stroke_id)
    full_stroke.finished = True
    db.session.commit()

    emit('partialDump', partial_dump([full_stroke_id]), broadcast=True)


def partial_dump(full_strokes):
    return {
        "strokes": full_strokes_serializer(full_strokes),
    }


def full_dump():
    return {
        "users": get_all_users(),
        "strokes": get_all_strokes(0, 0, settings.MAP_SIZE[0], settings.MAP_SIZE[1]),
        "colors": get_all_colors(),
        "mapSize": settings.MAP_SIZE,
    }


if __name__ == '__main__':
    for arg in sys.argv:
        if arg == "init_db":
            with app.app_context():
                db.drop_all()
                db.create_all()
                db.session.commit()

                # Add color black
                db.session.add(Color(name="black", hex="#000000"))
                db.session.commit()

    socketio.run(app, debug=True, host="0.0.0.0", port=5175)
