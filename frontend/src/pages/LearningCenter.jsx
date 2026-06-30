import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Flame, CheckCircle, HelpCircle, Trophy } from 'lucide-react';

const QUIZ_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];

const QUIZ_DETAILS = {
  'A': 'Fist, thumb aligned with index side.',
  'B': 'Flat hand, four fingers upright, thumb folded.',
  'C': 'Curved hand forming a C outline.',
  'D': 'Index up, others circle with thumb.',
  'E': 'Clenched fingers folded tight, thumb across.',
  'F': 'OK sign: index-thumb circle, others up.',
  'G': 'Index-thumb horizontal pinch forward.',
  'H': 'Index-middle fingers flat horizontally.',
  'I': 'Pinky finger pointing straight up.',
  'K': 'V-sign up, thumb touching middle knuckle.',
  'L': 'Form L shape with index pointing up, thumb out.',
  'M': 'Fist, thumb under first three fingers.',
  'N': 'Fist, thumb under first two fingers.',
  'O': 'Form O circle with all fingers.',
  'P': 'Down-facing G shape, thumb at middle.',
  'Q': 'Down-facing index-thumb pinch.',
  'R': 'Cross index and middle fingers.',
  'S': 'Clenched fist, thumb wrapped in front.',
  'T': 'Fist, thumb tucked under index.',
  'U': 'Index-middle extended straight up together.',
  'V': 'V-sign with index-middle spread.',
  'W': 'W-sign with three fingers extended.',
  'X': 'Index finger bent like a hook.',
  'Y': 'Thumb and pinky extended, phone shape.'
};

export default function LearningCenter({ stats, triggerToast, fetchStats }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [targetLetter, setTargetLetter] = useState('A');
  const [prediction, setPrediction] = useState('-');
  const [confidence, setConfidence] = useState(0);
  const [successHoldCount, setSuccessHoldCount] = useState(0); // Holds correct count for verification
  
  const [successAnimation, setSuccessAnimation] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const quizIntervalRef = useRef(null);

  useEffect(() => {
    // Pick a random letter to start
    pickNewLetter();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (cameraActive) {
      startQuizInference();
    } else {
      stopQuizInference();
    }
    return () => stopQuizInference();
  }, [cameraActive, targetLetter]);

  const pickNewLetter = () => {
    const remaining = QUIZ_LETTERS.filter(l => l !== targetLetter);
    const randomL = remaining[Math.floor(Math.random() * remaining.length)];
    setTargetLetter(randomL);
    setSuccessHoldCount(0);
    setPrediction('-');
    setConfidence(0);
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Error playing video:", e));
      }
      setCameraActive(true);
      triggerToast('Quiz mode started.', 'success');
    } catch (err) {
      triggerToast('Could not access webcam.', 'error');
    }
  };

  const stopCamera = () => {
    stopQuizInference();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setSuccessHoldCount(0);
    setPrediction('-');
    setConfidence(0);
  };

  const startQuizInference = () => {
    stopQuizInference();
    quizIntervalRef.current = setInterval(captureAndEvaluate, 350);
  };

  const stopQuizInference = () => {
    if (quizIntervalRef.current) {
      clearInterval(quizIntervalRef.current);
      quizIntervalRef.current = null;
    }
  };

  const captureAndEvaluate = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Data,
          target_letter: targetLetter // Send target letter to write history
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPrediction(data.prediction);
        setConfidence(data.confidence);

        // Evaluation Logic
        if (data.prediction.toUpperCase() === targetLetter.toUpperCase() && data.confidence > 0.75) {
          // Increment hold count
          setSuccessHoldCount(prev => {
            const nextCount = prev + 1;
            // 4 consecutive positive reviews (~1.4s total hold)
            if (nextCount >= 4) {
              handleQuizSuccess();
              return 0; // Reset
            }
            return nextCount;
          });
        } else {
          // Reset hold count on mismatch or low confidence
          setSuccessHoldCount(0);
        }
      }
    } catch (err) {
      console.error("Quiz evaluation error:", err);
    }
  };

  const handleQuizSuccess = () => {
    stopQuizInference();
    setSuccessAnimation(true);
    triggerToast(`Congratulations! You signed '${targetLetter}' perfectly!`, 'success');
    
    // Play celebration sound or effects
    setTimeout(() => {
      setSuccessAnimation(false);
      fetchStats();
      pickNewLetter();
    }, 1800);
  };

  return (
    <div className="quiz-panel">
      {/* Camera Side */}
      <div className="camera-container">
        <div className={`webcam-viewport-wrapper ${successAnimation ? 'success' : (cameraActive ? 'detecting' : '')}`}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="webcam-video"
            style={{ display: cameraActive ? 'block' : 'none' }}
          />
          {!cameraActive && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--text-secondary)' }}>
              <CameraOff size={48} style={{ opacity: 0.5 }} />
              <p>Webcam deactivated.</p>
              <button className="button" onClick={startCamera}>
                <Camera size={16} />
                Activate Camera
              </button>
            </div>
          )}

          {cameraActive && (
            <div className="camera-overlay-indicator">
              <span className="pulsing-red-dot" style={{ background: successHoldCount > 0 ? 'var(--success)' : 'var(--primary)' }}></span>
              {successHoldCount > 0 ? `Holding Sign... (${successHoldCount}/4)` : 'Awaiting Sign Gesture'}
            </div>
          )}
        </div>

        {cameraActive && (
          <div className="camera-controls-bar">
            <button className="button secondary" onClick={stopCamera}>
              <CameraOff size={16} />
              Stop Training
            </button>
            <button className="button secondary" onClick={pickNewLetter}>
              Skip Letter
            </button>
          </div>
        )}
      </div>

      {/* Target and Instruction Details */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
        {successAnimation ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px', padding: '40px 0' }}>
            <Trophy size={72} color="var(--success)" style={{ filter: 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.4))' }} />
            <h2 style={{ color: 'var(--success)', fontSize: '28px' }}>Perfect Match!</h2>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
              You formed the letter <strong>{targetLetter}</strong> successfully.
            </p>
            <div className="result-badge correct">Hold Time Verified ✓</div>
          </div>
        ) : (
          <div className="target-badge-container">
            <span className="target-heading">Make this sign</span>
            <span className="target-char">{targetLetter}</span>
            <div className="quiz-instruction-text">
              <strong>Tip:</strong> {QUIZ_DETAILS[targetLetter]}
            </div>
            
            {prediction !== '-' && (
              <div 
                className={`quiz-feedback-banner show ${prediction === targetLetter ? 'correct' : 'wrong'}`}
                style={{ width: '100%', marginTop: '24px' }}
              >
                {prediction === targetLetter ? (
                  <>
                    <CheckCircle size={16} /> Ready! Hold Sign
                  </>
                ) : (
                  <>
                    <HelpCircle size={16} /> Saw: {prediction} (Needs: {targetLetter})
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} color="var(--success)" />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Daily Streak:</span>
            <strong style={{ fontSize: '16px', color: 'var(--success)' }}>{stats.streak}</strong>
          </div>
          <button className="button secondary" onClick={pickNewLetter} disabled={successAnimation}>
            Next Letter
          </button>
        </div>
      </div>
    </div>
  );
}
