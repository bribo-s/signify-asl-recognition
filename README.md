# Sign Language Recognition System

A production-ready full-stack американский Sign Language (ASL) gesture recognition system. Built with Python, FastAPI, SQLite, TensorFlow/Keras, and React (Vite).

## System Features
1. **Interactive ASL Finger-Spelling Guide**: View description guides for all static hand signs from A to Y (excluding J and Z which require motion).
2. **CNN Model Downloader & Trainer**: Train a Convolutional Neural Network (CNN) directly from the Web UI on the full 30,000+ images Sign Language MNIST dataset. Watch logs and epoch metrics stream live!
3. **Webcam Sandbox**: Verify and test gestures in real-time. See the model's processed 28x28 grayscale vision feed, predictions, and confidence levels.
4. **Learning Quiz**: Learn sign language interactively. The app asks you to show a sign, verifies your gesture, checks if you hold it correctly for 1.5 seconds, and logs your successes.
5. **Custom Dataset Collector**: Build a custom hand gesture dataset by typing a label, snapping webcam photos, and browsing the collected files.

## Technical Architecture
- **Frontend**: React, Vite, Vanilla CSS Modules, Lucide Icons.
- **Backend API**: FastAPI (Python 3.10), SQLite database (via SQLAlchemy ORM), OpenCV (for image preprocessing), and TensorFlow / Keras (CNN inference).
- **Machine Learning**: Custom CNN with 3 Conv2D layers, batch normalization, max-pooling, dropout, and a softmax dense layer outputting 25 label classes.

---

## How to Run the System

### 1. Ensure Dependencies are Set Up
The backend environment has been set up with virtual environment at `backend/venv` and required packages installed. The frontend dependencies have been installed using npm.

### 2. Start Both Servers
To run both the FastAPI Backend and the Vite Frontend concurrently, execute the Python orchestrator script in the project root directory:

```bash
python3 run.py
```

This script will run:
* **FastAPI API** at [http://localhost:8000](http://localhost:8000)
* **Vite Frontend Web App** at [http://localhost:5173](http://localhost:5173)

Press `Ctrl+C` in your terminal to safely terminate both servers.

### 3. Model Training
When you first open the web application at [http://localhost:5173](http://localhost:5173), the system will use an untrained placeholder model. Click the **"Download & Train CNN"** button on the Dashboard to fetch the Sign Language MNIST dataset and train the neural network to 92%+ test accuracy!
