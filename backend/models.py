from ast import List
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Boolean
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
    stroke = relationship("FullStroke", back_populates="points")
    order = Column(Integer, index=True)

    # stroke_id and order are unique together
    __table_args__ = (
        UniqueConstraint('stroke_id', 'order'),
    )

    x = Column(Integer, index=True)
    y = Column(Integer, index=True)


class FullStroke(db.Model):
    __tablename__ = 'full_strokes'

    id = Column(Integer, primary_key=True)
    color_id = Column(Integer, ForeignKey(Color.id))
    points = relationship(StrokePoint, back_populates="stroke")
    pen_size = Column(Integer)
    user_id = Column(Integer, ForeignKey(User.id))
    finished = Column(Boolean, default=False)
    erase = Column(Boolean, default=False)
    deleted = Column(Boolean, default=False)
