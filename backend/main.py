import os
import uuid
import base64
import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func

import database, models, schemas, cnn_model
from train import training_pipeline

# Ensure gestures directory exists
os.makedirs("gestures", exist_ok=True)

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Sign Language Recognition System API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend origin e.g. http://localhost:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount gestures static directory
app.mount("/static/gestures", StaticFiles(directory="gestures"), name="gestures")

# 1. Inference endpoint
@app.post("/api/predict", response_model=schemas.PredictResponse)
def predict(request: schemas.PredictRequest, db: Session = Depends(database.get_db)):
    try:
        prediction, confidence, processed_image = cnn_model.predict_gesture(request.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing error: {str(e)}")
    
    is_correct = None
    if request.target_letter:
        target = request.target_letter.upper()
        pred = prediction.upper()
        is_correct = (pred == target)
        
        # Log to database
        history_entry = models.PracticeHistory(
            target_letter=target,
            predicted_letter=pred,
            confidence=confidence,
            is_correct=is_correct
        )
        db.add(history_entry)
        db.commit()
        
    return schemas.PredictResponse(
        prediction=prediction,
        confidence=confidence,
        is_correct=is_correct,
        processed_image=processed_image
    )

# 2. Save custom gesture
@app.post("/api/gestures/save", response_model=schemas.GestureSaveResponse)
def save_custom_gesture(request: schemas.GestureSaveRequest, db: Session = Depends(database.get_db)):
    try:
        # Decode base64 image
        base64_str = request.image
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
            
        img_bytes = base64.b64decode(base64_str)
        
        # Create unique filename
        filename = f"gesture_{request.label.lower()}_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join("gestures", filename)
        
        with open(filepath, "wb") as f:
            f.write(img_bytes)
            
        # Log in database
        gesture = models.CustomGesture(
            label=request.label.upper(),
            image_path=filepath
        )
        db.add(gesture)
        db.commit()
        db.refresh(gesture)
        
        return schemas.GestureSaveResponse(
            status="success",
            id=gesture.id,
            image_path=filepath
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save gesture: {str(e)}")

# 3. List custom gestures
@app.get("/api/gestures", response_model=List[schemas.GestureResponse])
def get_custom_gestures(db: Session = Depends(database.get_db)):
    gestures = db.query(models.CustomGesture).order_by(models.CustomGesture.timestamp.desc()).all()
    
    response = []
    for g in gestures:
        response.append(schemas.GestureResponse(
            id=g.id,
            timestamp=g.timestamp,
            label=g.label,
            # Return relative path for static mount
            image_url=f"/static/gestures/{os.path.basename(g.image_path)}"
        ))
    return response

# 4. Trigger training
@app.post("/api/model/train")
def train_model():
    if training_pipeline.status == "training":
        return {"status": "already_running", "message": "Training is already in progress."}
    
    training_pipeline.start_training()
    return {"status": "started", "message": "Model training pipeline initiated."}

# 5. Get training status
@app.get("/api/model/status", response_model=schemas.TrainingStatusResponse)
def get_training_status():
    return training_pipeline.get_status()

# 6. Get practice history
@app.get("/api/analytics/history", response_model=List[schemas.PracticeHistoryResponse])
def get_practice_history(db: Session = Depends(database.get_db)):
    history = db.query(models.PracticeHistory).order_by(models.PracticeHistory.timestamp.desc()).limit(50).all()
    return history

# 7. Get analytics summary
@app.get("/api/analytics/summary", response_model=schemas.AnalyticsSummaryResponse)
def get_analytics_summary(db: Session = Depends(database.get_db)):
    total = db.query(models.PracticeHistory).count()
    if total == 0:
        return schemas.AnalyticsSummaryResponse(
            accuracy_rate=0.0,
            attempts=0,
            mastered_count=0,
            streak=0
        )
        
    correct = db.query(models.PracticeHistory).filter(models.PracticeHistory.is_correct == True).count()
    accuracy_rate = float(correct) / total
    
    # Calculate mastered letters
    # Mastered = Letter has at least 3 attempts and its accuracy is >= 80%
    subquery = db.query(
        models.PracticeHistory.target_letter,
        func.count(models.PracticeHistory.id).label('attempts'),
        func.sum(func.cast(models.PracticeHistory.is_correct, models.Integer)).label('correct_attempts')
    ).group_by(models.PracticeHistory.target_letter).subquery()
    
    mastered = db.query(subquery.c.target_letter).filter(
        subquery.c.attempts >= 3,
        (func.cast(subquery.c.correct_attempts, func.Float) / subquery.c.attempts) >= 0.8
    ).count()
    
    # Calculate daily practice streak
    streak = calculate_practice_streak(db)
    
    return schemas.AnalyticsSummaryResponse(
        accuracy_rate=accuracy_rate,
        attempts=total,
        mastered_count=mastered,
        streak=streak
    )

def calculate_practice_streak(db: Session) -> int:
    # Get all unique practice dates sorted desc
    dates_query = db.query(func.date(models.PracticeHistory.timestamp)).distinct().order_by(func.date(models.PracticeHistory.timestamp).desc()).all()
    
    if not dates_query:
        return 0
        
    # Convert query strings to date objects
    dates = [datetime.datetime.strptime(d[0], "%Y-%m-%d").date() for d in dates_query if d[0]]
    
    if not dates:
        return 0
        
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)
    
    # Check if user practiced today or yesterday to continue the streak
    if dates[0] not in (today, yesterday):
        return 0
        
    streak = 1
    current_date = dates[0]
    
    for next_date in dates[1:]:
        diff = (current_date - next_date).days
        if diff == 1:
            streak += 1
            current_date = next_date
        elif diff > 1:
            break  # Streak broken
            
    return streak

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
