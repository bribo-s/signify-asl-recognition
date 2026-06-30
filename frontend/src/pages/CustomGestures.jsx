import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, Save, Image as ImageIcon, Trash2 } from 'lucide-react';

export default function CustomGestures({ triggerToast }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [label, setLabel] = useState('');
  const [savedGestures, setSavedGestures] = useState([]);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchSavedGestures();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchSavedGestures = async () => {
    try {
      const res = await fetch('/api/gestures');
      if (res.ok) {
        const data = await res.json();
        setSavedGestures(data);
      }
    } catch (err) {
      console.error("Error fetching custom gestures:", err);
    }
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
    } catch (err) {
      triggerToast('Could not access webcam.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCapture = async () => {
    if (!label.trim()) {
      triggerToast('Please enter a gesture label first.', 'error');
      return;
    }

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      triggerToast('Camera feed not ready.', 'error');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg');

    try {
      const response = await fetch('/api/gestures/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Data,
          label: label.trim().toUpperCase()
        })
      });

      if (response.ok) {
        triggerToast(`Gesture snapshot saved for '${label.toUpperCase()}'.`, 'success');
        fetchSavedGestures();
      } else {
        triggerToast('Failed to save gesture snapshot.', 'error');
      }
    } catch (err) {
      console.error("Error saving custom gesture:", err);
      triggerToast('Error saving snapshot.', 'error');
    }
  };

  return (
    <div className="custom-collector-panel">
      {/* Recording Workspace */}
      <div className="glass-card collector-form">
        <h3>Custom Gesture Recorder</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Create your own gestures dataset! Enter a label (e.g., a specific letter or custom word) and snap camera photos to save them to the local backend gestures pool.
        </p>

        <div className="form-group">
          <label className="form-label">Gesture Label</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. HELLO, A, THANKS" 
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="camera-container" style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: '#000' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="webcam-video"
            style={{ display: cameraActive ? 'block' : 'none' }}
          />
          {!cameraActive && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-secondary)' }}>
              <CameraOff size={32} style={{ opacity: 0.5 }} />
              <button className="button" onClick={startCamera}>
                Activate camera
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {cameraActive && (
            <button className="button secondary" onClick={stopCamera}>
              Camera Off
            </button>
          )}
          <button 
            className="button" 
            onClick={handleCapture}
            disabled={!cameraActive || !label.trim()}
            style={{ flexGrow: 1 }}
          >
            <Save size={16} />
            Capture & Save Gesture
          </button>
        </div>
      </div>

      {/* Dataset Grid Display */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageIcon size={20} color="var(--primary)" />
          Collected Dataset ({savedGestures.length} files)
        </h3>

        <div className="gesture-gallery">
          {savedGestures.length > 0 ? (
            savedGestures.map((item) => (
              <div key={item.id} className="gesture-gallery-item">
                <img src={item.image_url} alt={item.label} className="gesture-gallery-img" />
                <span className="gesture-gallery-label">{item.label}</span>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              No custom snapshots collected yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
