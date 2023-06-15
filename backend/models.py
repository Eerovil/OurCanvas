from ast import List
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, Mapped

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String)
    request_sid = Column(String)
    x = Column(Integer)
    y = Column(Integer)


class Color(db.Model):
    __tablename__ = 'colors'

    id = Column(Integer, primary_key=True)
    name = Column(String)
    hex = Column(String)


class StrokePoint(db.Model):
    __tablename__ = 'stroke_points'

    id = Column(Integer, primary_key=True)
    stroke_id = Column(Integer, ForeignKey('full_strokes.id'))
    order = Column(Integer, index=True)
    x = Column(Integer, index=True)
    y = Column(Integer, index=True)


class FullStroke(db.Model):
    __tablename__ = 'full_strokes'

    id = Column(Integer, primary_key=True)
    color_id = Column(Integer, ForeignKey(Color.id))
    points = relationship(StrokePoint)
    pen_size = Column(Integer)
    user_id = Column(Integer, ForeignKey(User.id))
