import os
import cv2
import numpy as np
import base64

LABEL_MAP = {
    0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I',
    10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R',
    18: 'S', 19: 'T', 20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y'
}
REV_LABEL_MAP = {v: k for k, v in LABEL_MAP.items()}

MODEL_PATH = "sign_mnist_model.h5"
_model = None

def create_model():
    import tensorflow as tf
    model = tf.keras.models.Sequential([
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(28, 28, 1)),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.MaxPooling2D((2, 2)),
        
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.MaxPooling2D((2, 2)),
        
        tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.MaxPooling2D((2, 2)),
        
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(25, activation='softmax')
    ])
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    return model

def get_model():
    global _model
    if _model is not None:
        return _model
    
    import tensorflow as tf
    if os.path.exists(MODEL_PATH):
        try:
            _model = tf.keras.models.load_model(MODEL_PATH)
            print("Loaded trained model successfully.")
            return _model
        except Exception as e:
            print(f"Error loading model: {e}. Recreating.")
            
    print("Model file not found. Creating fallback model with random weights.")
    _model = create_model()
    try:
        _model.save(MODEL_PATH)
    except Exception as e:
        print(f"Could not save fallback model: {e}")
    return _model

def reload_model():
    global _model
    _model = None
    return get_model()

def preprocess_image(base64_str):
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    
    img_bytes = base64.b64decode(base64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Could not decode image.")
        
    h, w, _ = img.shape
    min_dim = min(h, w)
    start_y = (h - min_dim) // 2
    start_x = (w - min_dim) // 2
    cropped = img[start_y:start_y+min_dim, start_x:start_x+min_dim]
    
    gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (28, 28), interpolation=cv2.INTER_AREA)
    
    normalized = resized.astype(np.float32) / 255.0
    model_input = np.expand_dims(np.expand_dims(normalized, axis=0), axis=-1)
    
    _, encoded_img = cv2.imencode(".jpg", resized)
    processed_base64 = "data:image/jpeg;base64," + base64.b64encode(encoded_img).decode("utf-8")
    
    return model_input, processed_base64

def predict_gesture(base64_str):
    model_input, processed_base64 = preprocess_image(base64_str)
    
    model = get_model()
    predictions = model.predict(model_input, verbose=0)
    
    class_idx = int(np.argmax(predictions[0]))
    confidence = float(predictions[0][class_idx])
    
    predicted_letter = LABEL_MAP.get(class_idx, "Unknown")
    
    return predicted_letter, confidence, processed_base64
