import os
import csv
import threading
import requests
import numpy as np
from cnn_model import create_model, MODEL_PATH, reload_model

TRAIN_URL = "https://raw.githubusercontent.com/gchilingaryan/Sign-Language/master/sign_mnist_train.csv"
TEST_URL = "https://raw.githubusercontent.com/gchilingaryan/Sign-Language/master/sign_mnist_test.csv"
DATASET_DIR = "dataset"
TRAIN_PATH = os.path.join(DATASET_DIR, "sign_mnist_train.csv")
TEST_PATH = os.path.join(DATASET_DIR, "sign_mnist_test.csv")

class TrainingPipeline:
    def __init__(self):
        self.status = "not_trained"  # "not_trained", "training", "trained", "error"
        self.epoch = 0
        self.total_epochs = 10
        self.accuracy = 0.0
        self.loss = 0.0
        self.logs = []
        self._lock = threading.Lock()
        
        # Check if model already exists on disk
        if os.path.exists(MODEL_PATH):
            # We could have a basic file, let's treat it as trained if it exists
            # but if it was generated as fallback, we might still want to retrain.
            self.status = "trained"
            self.logs.append("Pre-existing model weights found.")

    def add_log(self, message):
        with self._lock:
            print(f"[TrainLog] {message}")
            self.logs.append(message)

    def get_status(self):
        with self._lock:
            return {
                "status": self.status,
                "epoch": self.epoch,
                "total_epochs": self.total_epochs,
                "accuracy": self.accuracy,
                "loss": self.loss,
                "logs": self.logs[-20:],  # Return last 20 logs
                "model_type": "CNN (Sign Language MNIST)"
            }

    def start_training(self):
        with self._lock:
            if self.status == "training":
                return
            self.status = "training"
            self.epoch = 0
            self.accuracy = 0.0
            self.loss = 0.0
            self.logs = ["Training process initiated."]
        
        thread = threading.Thread(target=self._run_training)
        thread.daemon = True
        thread.start()

    def _download_file(self, url, dest_path, desc):
        self.add_log(f"Downloading {desc}...")
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024*1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        pct = (downloaded / total_size) * 100
                        # Log every 25% to avoid cluttering
                        if int(pct) % 25 == 0:
                            self.add_log(f"Download progress of {desc}: {pct:.1f}%")
                            
        self.add_log(f"Successfully downloaded {desc} to {dest_path}")

    def _load_csv(self, file_path, desc):
        self.add_log(f"Parsing CSV data for {desc}...")
        labels = []
        images = []
        with open(file_path, 'r') as f:
            reader = csv.reader(f)
            next(reader)  # Skip header row
            count = 0
            for row in reader:
                labels.append(int(row[0]))
                images.append([int(pixel) for pixel in row[1:]])
                count += 1
                if count % 10000 == 0:
                    self.add_log(f"Parsed {count} rows...")
        
        labels_arr = np.array(labels)
        images_arr = np.array(images, dtype=np.float32).reshape(-1, 28, 28, 1) / 255.0
        self.add_log(f"Loaded {len(labels_arr)} samples for {desc}.")
        return labels_arr, images_arr

    def _run_training(self):
        try:
            # 1. Downloads
            if not os.path.exists(TRAIN_PATH):
                self._download_file(TRAIN_URL, TRAIN_PATH, "Training Dataset")
            else:
                self.add_log("Training CSV found in cache.")

            if not os.path.exists(TEST_PATH):
                self._download_file(TEST_URL, TEST_PATH, "Testing Dataset")
            else:
                self.add_log("Testing CSV found in cache.")

            # 2. Loading
            y_train, x_train = self._load_csv(TRAIN_PATH, "Training")
            y_test, x_test = self._load_csv(TEST_PATH, "Testing")

            # 3. Model construction
            self.add_log("Compiling CNN model architecture...")
            model = create_model()
            
            # 4. Training callbacks
            pipeline_self = self
            
            import tensorflow as tf
            
            class KerasProgressCallback(tf.keras.callbacks.Callback):
                def on_epoch_begin(self, epoch, logs=None):
                    pipeline_self.epoch = epoch + 1
                    pipeline_self.add_log(f"Starting Epoch {epoch + 1}/{pipeline_self.total_epochs}...")
                
                def on_epoch_end(self, epoch, logs=None):
                    logs = logs or {}
                    pipeline_self.accuracy = float(logs.get('accuracy', 0.0))
                    pipeline_self.loss = float(logs.get('loss', 0.0))
                    val_acc = logs.get('val_accuracy', 0.0)
                    pipeline_self.add_log(
                        f"Epoch {epoch + 1} Done: accuracy={pipeline_self.accuracy:.4f}, "
                        f"loss={pipeline_self.loss:.4f}, val_accuracy={val_acc:.4f}"
                    )

            self.add_log("Starting training fit loop (10 epochs)...")
            model.fit(
                x_train, y_train,
                validation_data=(x_test, y_test),
                epochs=self.total_epochs,
                batch_size=128,
                callbacks=[KerasProgressCallback()],
                verbose=0
            )

            # 5. Save model
            self.add_log("Saving trained model weights to disk...")
            model.save(MODEL_PATH)
            
            # Reload inside inference module
            reload_model()
            
            with self._lock:
                self.status = "trained"
            self.add_log("Training completed successfully. System ready.")

        except Exception as e:
            with self._lock:
                self.status = "error"
            self.add_log(f"Fatal error during training pipeline: {str(e)}")

# Global pipeline instance
training_pipeline = TrainingPipeline()
