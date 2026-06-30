import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from database import Base

class PracticeHistory(Base):
    __tablename__ = "practice_history"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    target_letter = Column(String(1), nullable=False)
    predicted_letter = Column(String(1), nullable=False)
    confidence = Column(Float, nullable=False)
    is_correct = Column(Boolean, nullable=False)

class CustomGesture(Base):
    __tablename__ = "custom_gestures"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    label = Column(String(255), nullable=False)
    image_path = Column(String(512), nullable=False)
