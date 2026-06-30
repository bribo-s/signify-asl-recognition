import os
import sys
import base64
import numpy as np

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import cnn_model
import database
import models

def test_preprocessing():
    print("Testing image preprocessing pipeline...")
    # Create a simple 100x100 white square image in base64
    import cv2
    dummy_img = np.ones((100, 100, 3), dtype=np.uint8) * 255
    _, encoded = cv2.imencode(".jpg", dummy_img)
    base64_str = "data:image/jpeg;base64," + base64.b64encode(encoded).decode("utf-8")
    
    # Run preprocessing
    model_input, processed_base64 = cnn_model.preprocess_image(base64_str)
    
    assert model_input.shape == (1, 28, 28, 1), f"Expected shape (1, 28, 28, 1), got {model_input.shape}"
    assert processed_base64.startswith("data:image/jpeg;base64,"), "Processed image should be base64 data URI"
    print("✓ Preprocessing pipeline passed. Reshaped input correctly to (1, 28, 28, 1).")

def test_model_loading():
    print("Testing neural network loading...")
    model = cnn_model.get_model()
    assert model is not None, "Model failed to load/compile."
    print("✓ Neural network loaded successfully (compiled architecture).")

def test_database():
    print("Testing SQLite database tables bootstrap...")
    models.Base.metadata.create_all(bind=database.engine)
    db = next(database.get_db())
    assert db is not None, "Database session failed to initialize."
    
    # Check table existence (can insert a mock attempt)
    history_entry = models.PracticeHistory(
        target_letter="A",
        predicted_letter="A",
        confidence=0.99,
        is_correct=True
    )
    db.add(history_entry)
    db.commit()
    
    # Verify insert
    queried = db.query(models.PracticeHistory).filter_by(target_letter="A").first()
    assert queried is not None, "Database insertion/query failed."
    assert queried.is_correct == True
    
    # Cleanup mock entry
    db.delete(queried)
    db.commit()
    print("✓ SQLite database write and query operations passed.")

def run_all_tests():
    print("=========================================")
    print(" Running Backend Verification Tests")
    print("=========================================")
    try:
        test_preprocessing()
        test_model_loading()
        test_database()
        print("=========================================")
        print(" All verification tests passed successfully!")
        print("=========================================")
        return True
    except Exception as e:
        print(f"✗ Verification tests failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
