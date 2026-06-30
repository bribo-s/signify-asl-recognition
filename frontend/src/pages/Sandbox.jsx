import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Play, Pause, Eye } from 'lucide-react';

export default function Sandbox({ triggerToast }) {
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [predictLoopActive, setPredictLoopActive] = useState(false);
  
  const [prediction, setPrediction] = useState('-');
  const [confidence, setConfidence] = useState(0);
  const [visionFeed, setVisionFeed] = useState(null);
  const [history, setHistory] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const predictIntervalRef = useRef(null);

  const gatherDiagnostics = () => {
    const video = videoRef.current;
    if (!video) {
      setDiagnostics({ videoElementExists: false });
      return;
    }
    let tracksInfo = [];
    if (streamRef.current) {
      tracksInfo = streamRef.current.getVideoTracks().map(track => ({
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      }));
    }
    setDiagnostics({
      videoElementExists: true,
      srcObjectExists: !!video.srcObject,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      paused: video.paused,
      ended: video.ended,
      tracks: tracksInfo
    });
  };

  // Initialize and clean up camera on mount/unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Monitor predictLoopActive to start/stop prediction loop
  useEffect(() => {
    if (predictLoopActive && cameraActive) {
      startPredictionLoop();
    } else {
      stopPredictionLoop();
    }
    return () => stopPredictionLoop();
  }, [predictLoopActive, cameraActive]);

  const startCamera = async () => {
    try {
      stopCamera(); // Make sure clean
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Error playing video:", e));
        setTimeout(gatherDiagnostics, 100);
      }
      setHasCamera(true);
      setCameraActive(true);
      setPredictLoopActive(true); // Auto-start prediction
      triggerToast('Webcam activated successfully.', 'success');
    } catch (err) {
      console.error("Camera access error:", err);
      setHasCamera(false);
      triggerToast('Could not access webcam. Please check permissions.', 'error');
    }
  };

  const stopCamera = () => {
    stopPredictionLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setPredictLoopActive(false);
    setPrediction('-');
    setConfidence(0);
    setVisionFeed(null);
    setDiagnostics(null);
  };

  const startPredictionLoop = () => {
    stopPredictionLoop();
    // Run prediction check every 350ms
    predictIntervalRef.current = setInterval(captureAndPredict, 350);
  };

  const stopPredictionLoop = () => {
    if (predictIntervalRef.current) {
      clearInterval(predictIntervalRef.current);
      predictIntervalRef.current = null;
    }
  };

  const captureAndPredict = async () => {
    gatherDiagnostics();
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64
    const base64Data = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data })
      });

      if (response.ok) {
        const data = await response.json();
        setPrediction(data.prediction);
        setConfidence(data.confidence);
        setVisionFeed(data.processed_image);

        // Append to local history list if confidence is high (> 60%)
        if (data.confidence > 0.6) {
          setHistory(prev => {
            // Avoid duplicate contiguous predictions to keep log readable
            if (prev.length > 0 && prev[0].char === data.prediction) {
              return prev;
            }
            return [{ char: data.prediction, conf: data.confidence, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)];
          });
        }
      }
    } catch (err) {
      console.error("Error predicting frame:", err);
    }
  };

  return (
    <div className="sandbox-workspace">
      {/* Webcam Block */}
      <div className="camera-container">
        <div className={`webcam-viewport-wrapper ${predictLoopActive ? 'detecting' : ''}`}>
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
              <p>Camera is inactive.</p>
              <button className="button" onClick={startCamera}>
                <Camera size={16} />
                Activate Webcam
              </button>
            </div>
          )}

          {cameraActive && (
            <div className="camera-overlay-indicator">
              <span className={predictLoopActive ? "pulsing-red-dot" : ""} style={{ background: predictLoopActive ? 'var(--secondary)' : 'var(--text-muted)' }}></span>
              {predictLoopActive ? 'Live Recognition Running' : 'Classifier Paused'}
            </div>
          )}
        </div>

        {cameraActive && (
          <div className="camera-controls-bar">
            <button className="button secondary" onClick={stopCamera}>
              <CameraOff size={16} />
              Turn Off Camera
            </button>

            <button 
              className={`button ${predictLoopActive ? 'secondary' : ''}`}
              onClick={() => setPredictLoopActive(!predictLoopActive)}
            >
              {predictLoopActive ? (
                <>
                  <Pause size={16} /> Pause Inference
                </>
              ) : (
                <>
                  <Play size={16} /> Resume Inference
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Inference Details Sidebar */}
      <div className="glass-card inference-box">
        <h3>Model Inference</h3>
        
        {/* Grayscale preprocessed vision */}
        <div className="vision-feed-wrapper">
          <span className="vision-feed-title">
            <Eye size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            28x28 Preprocessed Grayscale
          </span>
          {visionFeed ? (
            <img src={visionFeed} alt="CNN Vision" className="vision-feed-img" />
          ) : (
            <div className="vision-feed-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
              No Feed
            </div>
          )}
        </div>

        {/* Prediction Display */}
        <div className="prediction-panel">
          <div className="pred-char">{prediction}</div>
          <span className="pred-label">Classified Gesture</span>

          {confidence > 0 ? (
            <div className="confidence-container">
              <div className="confidence-header">
                <span>Confidence</span>
                <span>{(confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="confidence-bar-bg">
                <div 
                  className="confidence-bar-fill" 
                  style={{ width: `${confidence * 100}%` }}
                ></div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Local session history logs */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Session Predictions log
          </h4>
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.length > 0 ? (
              history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>Letter {h.char}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{(h.conf * 100).toFixed(0)}% at {h.time}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No predictions recorded yet.</span>
            )}
          </div>
        </div>

        {/* Live Diagnostics */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Diagnostics
          </h4>
          {diagnostics ? (
            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'left', fontFamily: 'monospace' }}>
              <div>Video Element: {diagnostics.videoElementExists ? 'OK' : 'MISSING'}</div>
              <div>srcObject: {diagnostics.srcObjectExists ? 'OK' : 'MISSING'}</div>
              <div>Ready State: {diagnostics.readyState}</div>
              <div>Dimensions: {diagnostics.videoWidth}x{diagnostics.videoHeight}</div>
              <div>Paused: {diagnostics.paused ? 'YES' : 'NO'}</div>
              <div>Tracks:</div>
              {diagnostics.tracks && diagnostics.tracks.map((t, idx) => (
                <div key={idx} style={{ paddingLeft: '8px', color: '#38bdf8' }}>
                  - {t.label.slice(0, 20)}... ({t.readyState})
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Camera inactive.</span>
          )}
        </div>
      </div>
    </div>
  );
}
