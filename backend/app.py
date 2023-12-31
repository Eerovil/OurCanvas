#! /usr/bin/python3
# -*- encoding: utf-8 -*-

import sys

from flask import Flask, request, redirect
from flask_socketio import SocketIO, emit  # noqa
from flask_sqlalchemy import SQLAlchemy

import settings
from colors import get_all_colors
from models import Color, db, FullStroke, StrokePoint
from strokes import full_strokes_serializer, get_all_strokes, handle_erase  # noqa
from users import get_all_users, get_user, get_user_id_by_sid

import logging
logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO)


app = Flask(__name__, static_url_path='/ourcanvas/', static_folder='../static/')

import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn="https://6ba66efbbfa24148b2ff80ce744f9c4a@o4505339492433920.ingest.sentry.io/4505378821963776",
    integrations=[
        FlaskIntegration(),
    ],

    traces_sample_rate=0.0
)


app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ourcanvas.db'

db.init_app(app)

app.config['SECRET_KEY'] = 'eero'
socketio = SocketIO(app, path="/ourcanvas/socket.io", cors_allowed_origins="*")


# Add CORS headers
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


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

    stroke_point = StrokePoint(
        order=0,
        x=round(data.get("x")),
        y=round(data.get("y")),
    )
    full_stroke = FullStroke(
        color_id=data.get("colorId"),
        pen_size=data.get("penSize"),
        user_id=user_id,
        erase=data.get("erase") or False,
        points=[stroke_point],
    )
    db.session.add(full_stroke)
    db.session.commit()

    changed_stroke_ids = []
    if data.get("erase"):
        changed_stroke_ids = handle_erase(db, [stroke_point], full_stroke.id)

    emit('partialDump', partial_dump([full_stroke.id] + changed_stroke_ids), broadcast=True)



@socketio.on('continueStroke')
def continue_stroke(data):
    logger.info("Continue stroke: %s", data)

    full_stroke_id = data.get("strokeId")
    existing_points = StrokePoint.query.filter_by(stroke_id=full_stroke_id)
    existing_orders = set()
    for existing_point in existing_points:
        existing_orders.add(existing_point.order)
    erase = FullStroke.query.get(full_stroke_id).erase

    stroke_points = []
    for stroke_point in data.get("points"):
        if stroke_point.get("order") in existing_orders:
            continue
        stroke_point = StrokePoint(
            stroke_id=full_stroke_id,
            order=stroke_point.get("order"),
            x=round(stroke_point.get("x")),
            y=round(stroke_point.get("y")),
        )
        db.session.add(stroke_point)
        stroke_points.append(stroke_point)
    db.session.commit()

    changed_stroke_ids = []
    if erase:
        changed_stroke_ids = handle_erase(db, stroke_points, full_stroke_id)

    emit('partialDump', partial_dump([full_stroke_id] + changed_stroke_ids), broadcast=True)


@socketio.on('finishStroke')
def finish_stroke(data):
    logger.info("Finish stroke: %s", data)

    full_stroke_id = data.get("strokeId")

    full_stroke = FullStroke.query.get(full_stroke_id)
    full_stroke.finished = True

    if full_stroke.erase:
        # Delete the entire stroke
        full_stroke.deleted = True

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

                db.session.add(Color(name="black", hex="#000000"))
                db.session.add(Color(name="green", hex="#158245"))
                db.session.add(Color(name="green2", hex="#4dad44"))
                db.session.add(Color(name="red", hex="#b42830"))
                db.session.add(Color(name="blue", hex="#0074b4"))
                db.session.add(Color(name="violetblue", hex="#000092"))
                db.session.add(Color(name="yellow", hex="#ffff6a"))
                db.session.add(Color(name="pink", hex="#ff8ab8"))
                db.session.add(Color(name="purple", hex="#7f3fbf"))
                db.session.add(Color(name="skin", hex="#ff9b77"))
                db.session.add(Color(name="orange", hex="#ff6412"))
                db.session.add(Color(name="brown", hex="#431f16"))
                db.session.add(Color(name="silver", hex="#a3a1a3"))
                db.session.add(Color(name="white", hex="#ffffff"))
                db.session.commit()

    socketio.run(app, debug=True, host="0.0.0.0", port=5175)
