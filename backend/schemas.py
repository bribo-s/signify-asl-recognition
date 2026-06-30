from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PredictRequest(BaseModel):
    image: str
    target_letter: Optional[str] = None

class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    is_correct: Optional[bool] = None
    processed_image: str

class GestureSaveRequest(BaseModel):
    image: str
    label: str

class GestureSaveResponse(BaseModel):
    status: str
    id: int
    image_path: str

class GestureResponse(BaseModel):
    id: int
    timestamp: datetime
    label: str
    image_url: str

    class Config:
        from_attributes = True

class TrainingStatusResponse(BaseModel):
    status: str
    epoch: int
    total_epochs: int
    accuracy: float
    loss: float
    logs: List[str]
    model_type: str

class PracticeHistoryResponse(BaseModel):
    id: int
    timestamp: datetime
    target_letter: str
    predicted_letter: str
    confidence: float
    is_correct: bool

    class Config:
        from_attributes = True

class AnalyticsSummaryResponse(BaseModel):
    accuracy_rate: float
    attempts: int
    mastered_count: int
    streak: int
