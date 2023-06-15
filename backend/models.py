from ast import List
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, DeclarativeBase, Mapped


class Base(DeclarativeBase):
    pass


class User(Base):
    id: Mapped[int] = Column(Integer, primary_key=True)
    name: Mapped[str] = Column(String)
    request_sid: Mapped[str] = Column(String)
    x: Mapped[int] = Column(Integer)
    y: Mapped[int] = Column(Integer)


class Color(Base):
    id: Mapped[int] = Column(Integer, primary_key=True)
    name: Mapped[str] = Column(String)
    hex: Mapped[str] = Column(String)


class StrokePoint(Base):
    id: Mapped[int] = Column(Integer, primary_key=True)
    order: Mapped[int] = Column(Integer, index=True)
    x: Mapped[int] = Column(Integer, index=True)
    y: Mapped[int] = Column(Integer, index=True)


class FullStroke(Base):
    id: Mapped[int] = Column(Integer, primary_key=True)
    color_id: Mapped[int] = Column(Integer, ForeignKey(Color.id))
    points: Mapped[List[StrokePoint]] = relationship(StrokePoint)
    pen_size: Mapped[int] = Column(Integer)
    user_id: Mapped[int] = Column(Integer, ForeignKey(User.id))
