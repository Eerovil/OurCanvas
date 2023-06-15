from ast import List
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, DeclarativeBase, Mapped


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = Column(Integer, primary_key=True)
    name: Mapped[str] = Column(String)
    request_sid: Mapped[str] = Column(String)
    x: Mapped[int] = Column(Integer)
    y: Mapped[int] = Column(Integer)


class Color(Base):
    __tablename__ = 'colors'

    id: Mapped[int] = Column(Integer, primary_key=True)
    name: Mapped[str] = Column(String)
    hex: Mapped[str] = Column(String)


class StrokePoint(Base):
    __tablename__ = 'stroke_points'

    id: Mapped[int] = Column(Integer, primary_key=True)
    order: Mapped[int] = Column(Integer, index=True)
    x: Mapped[int] = Column(Integer, index=True)
    y: Mapped[int] = Column(Integer, index=True)


class FullStroke(Base):
    __tablename__ = 'full_strokes'

    id: Mapped[int] = Column(Integer, primary_key=True)
    color_id: Mapped[int] = Column(Integer, ForeignKey(Color.id))
    points = relationship(StrokePoint)
    pen_size: Mapped[int] = Column(Integer)
    user_id: Mapped[int] = Column(Integer, ForeignKey(User.id))
