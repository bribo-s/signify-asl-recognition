import React, { useState, useEffect } from 'react';
import { Play, Activity, Award, Flame, RefreshCw, Cpu, BookOpen, AlertTriangle } from 'lucide-react';

const ASL_ALPHABET = [
  { letter: 'A', name: 'Alpha', desc: 'Fist with thumb resting flat against the side of the index finger.' },
  { letter: 'B', name: 'Bravo', desc: 'Open flat hand with all four fingers touching and thumb folded across the palm.' },
  { letter: 'C', name: 'Charlie', desc: 'Hand curved to form a semi-circle resembling the letter C.' },
  { letter: 'D', name: 'Delta', desc: 'Index finger pointing straight up, with other fingers touching the thumb to form a circle.' },
  { letter: 'E', name: 'Echo', desc: 'All fingers curled tightly into the top of the palm, thumb folded across the front.' },
  { letter: 'F', name: 'Foxtrot', desc: 'Index finger and thumb touching to form a circle (like an "OK" sign), other three fingers extended upward.' },
  { letter: 'G', name: 'Golf', desc: 'Index finger and thumb pointing forward, parallel to each other, like a pinching motion.' },
  { letter: 'H', name: 'Hotel', desc: 'Index and middle fingers extended horizontally and pressed together, thumb tucked.' },
  { letter: 'I', name: 'India', desc: 'Pinky finger extended straight up, other fingers curled into a fist with thumb over them.' },
  { letter: 'K', name: 'Kilo', desc: 'Index and middle fingers extended up in a V-shape, with the thumb touching the middle finger joint.' },
  { letter: 'L', name: 'Lima', desc: 'Index finger pointing straight up and thumb extended horizontally, forming an L-shape.' },
  { letter: 'M', name: 'Mike', desc: 'Fist with the thumb tucked under the first three fingers (index, middle, ring).' },
  { letter: 'N', name: 'November', desc: 'Fist with the thumb tucked under the first two fingers (index and middle).' },
  { letter: 'O', name: 'Oscar', desc: 'All fingers curved down to touch the thumb, forming an O-shape.' },
  { letter: 'P', name: 'Papa', desc: 'G-shape hand tilted downwards towards the ground, with the thumb touching the middle finger.' },
  { letter: 'Q', name: 'Quebec', desc: 'G-shape hand pointing straight down towards the ground, thumb and index pinching downwards.' },
  { letter: 'R', name: 'Romeo', desc: 'Index and middle fingers crossed tightly, other fingers tucked into the palm.' },
  { letter: 'S', name: 'Sierra', desc: 'Clenched fist with the thumb folded across the front of all fingers.' },
  { letter: 'T', name: 'Tango', desc: 'Fist with the thumb tucked under the index finger only.' },
  { letter: 'U', name: 'Uniform', desc: 'Index and middle fingers extended straight up and pressed tightly together.' },
  { letter: 'V', name: 'Victor', desc: 'Index and middle fingers extended straight up in a V-shape, spread apart.' },
  { letter: 'W', name: 'Whiskey', desc: 'Index, middle, and ring fingers extended and spread in a W-shape, pinky and thumb touching.' },
  { letter: 'X', name: 'X-Ray', desc: 'Fist with the index finger extended and bent into a hook shape.' },
  { letter: 'Y', name: 'Yankee', desc: 'Thumb and pinky extended wide, middle three fingers curled down, resembling a phone shape.' }
];

export default function Dashboard({ stats, triggerToast, fetchStats }) {
  const [modelStatus, setModelStatus] = useState({
    status: 'not_trained',
    epoch: 0,
    total_epochs: 10,
    accuracy: 0.0,
    loss: 0.0,
    logs: [],
    model_type: 'CNN'
  });
  const [activeLetter, setActiveLetter] = useState(null);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    fetchModelStatus();
    const interval = setInterval(() => {
      fetchModelStatus();
    }, 2000); // Poll model status every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchModelStatus = async () => {
    try {
      const res = await fetch('/api/model/status');
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data);
        if (data.status === 'training') {
          setIsTraining(true);
        } else {
          if (isTraining && data.status === 'trained') {
            setIsTraining(false);
            triggerToast('Model trained successfully!', 'success');
            fetchStats();
          }
        }
      }
    } catch (err) {
      console.error("Error fetching model status:", err);
    }
  };

  const handleTrainModel = async () => {
    try {
      const res = await fetch('/api/model/train', { method: 'POST' });
      if (res.ok) {
        triggerToast('Training started in background...', 'success');
        setIsTraining(true);
      }
    } catch (err) {
      triggerToast('Failed to trigger training.', 'error');
    }
  };

  const getProgressPercentage = () => {
    if (modelStatus.total_epochs === 0) return 0;
    return (modelStatus.epoch / modelStatus.total_epochs) * 100;
  };

  return (
    <div>
      {/* Metrics Row */}
      <div className="stats-container">
        <div className="glass-card stat-card purple">
          <div className="stat-icon-wrapper">
            <Activity size={20} />
          </div>
          <span className="stat-label">Model Accuracy</span>
          <span className="stat-value">{(stats.accuracy_rate * 100).toFixed(0)}%</span>
        </div>

        <div className="glass-card stat-card cyan">
          <div className="stat-icon-wrapper">
            <Award size={20} />
          </div>
          <span className="stat-label">Letters Mastered</span>
          <span className="stat-value">{stats.mastered_count} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}>/ 24</span></span>
        </div>

        <div className="glass-card stat-card green">
          <div className="stat-icon-wrapper">
            <Flame size={20} />
          </div>
          <span className="stat-label">Day Streak</span>
          <span className="stat-value">{stats.streak} {stats.streak === 1 ? 'day' : 'days'}</span>
        </div>

        <div className="glass-card stat-card orange">
          <div className="stat-icon-wrapper">
            <BookOpen size={20} />
          </div>
          <span className="stat-label">Total Attempts</span>
          <span className="stat-value">{stats.attempts}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Welcome and reference guide */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen className="logo-icon" size={24} /> 
            ASL Finger-Spelling Guide
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
            Select any letter below to view details and instructions on how to perform its sign. 
            The CNN model processes static hand shapes matching the letters A-Y (excluding J and Z, which require dynamic movements not represented in the Sign Language MNIST dataset).
          </p>

          <div className="letter-grid">
            {ASL_ALPHABET.map((item) => (
              <div 
                key={item.letter} 
                className="letter-tile"
                onClick={() => setActiveLetter(item)}
              >
                <div className="letter-tile-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, color: 'var(--secondary)' }}>
                  {item.letter}
                </div>
                <span className="letter-tile-char">{item.letter}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model State and Controls */}
        <div className="glass-card training-card">
          <div className="card-header-with-badge">
            <div>
              <h3>Neural Network Status</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                CNN Classifier
              </p>
            </div>
            <div className={`status-indicator ${modelStatus.status}`}>
              {modelStatus.status === 'training' && <RefreshCw size={14} className="spinning" />}
              {modelStatus.status === 'not_trained' && 'Untrained'}
              {modelStatus.status === 'training' && 'Training...'}
              {modelStatus.status === 'trained' && 'Model Ready'}
              {modelStatus.status === 'error' && 'Error'}
            </div>
          </div>

          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {modelStatus.status === 'not_trained' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '12px', filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.2))' }} />
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The backend is running with a placeholder model. 
                  Download the dataset and train the CNN to enable 92% accurate predictions.
                </p>
              </div>
            )}

            {modelStatus.status === 'trained' && (
              <div style={{ padding: '16px 0', borderBottom: '1px solid var(--glass-border)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Target Accuracy:</span>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>92.0%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dataset Size:</span>
                  <span style={{ fontWeight: 600 }}>30,000+ Images</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Frameworks:</span>
                  <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>FastAPI + TF/Keras</span>
                </div>
              </div>
            )}

            {modelStatus.status === 'training' && (
              <div className="training-progress-container">
                <div className="progress-label-row">
                  <span>Epoch {modelStatus.epoch}/{modelStatus.total_epochs}</span>
                  <span>{getProgressPercentage().toFixed(0)}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill animated" 
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px' }}>
                  <span>Loss: {modelStatus.loss.toFixed(4)}</span>
                  <span>Accuracy: {(modelStatus.accuracy * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* Logs Terminal */}
            {(modelStatus.status === 'training' || modelStatus.logs.length > 0) && (
              <div className="log-terminal">
                {modelStatus.logs.map((log, idx) => {
                  let logClass = 'system';
                  if (log.includes('Done') || log.includes('successfully')) logClass = 'success';
                  if (log.includes('error') || log.includes('Failed')) logClass = 'error';
                  return (
                    <div key={idx} className={`log-line ${logClass}`}>
                      &gt; {log}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button 
            className="button" 
            onClick={handleTrainModel} 
            disabled={modelStatus.status === 'training'}
            style={{ width: '100%' }}
          >
            <Cpu size={16} />
            {modelStatus.status === 'trained' ? 'Retrain Model (Sign MNIST)' : 'Download & Train CNN'}
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {activeLetter && (
        <div className="modal-overlay" onClick={() => setActiveLetter(null)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '24px' }}>Letter {activeLetter.letter} Details</h3>
              <button className="close-btn" onClick={() => setActiveLetter(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-image-large" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', fontWeight: 900, color: 'var(--secondary)', border: '1px solid var(--glass-border)' }}>
                {activeLetter.letter}
              </div>
              <div>
                <h4 style={{ color: 'var(--secondary)', marginBottom: '8px', fontSize: '18px' }}>ASL Form Description</h4>
                <p style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.6 }}>{activeLetter.desc}</p>
              </div>
              <button className="button secondary" onClick={() => setActiveLetter(null)} style={{ alignSelf: 'flex-end' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
