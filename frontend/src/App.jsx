import React, { useState, useEffect } from 'react';
import { Home, Camera, BookOpen, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Sandbox from './pages/Sandbox';
import LearningCenter from './pages/LearningCenter';
import CustomGestures from './pages/CustomGestures';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    accuracy_rate: 0.0,
    attempts: 0,
    mastered_count: 0,
    streak: 0
  });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics/summary');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const triggerToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <>
      {/* Top Application Header */}
      <header className="app-header">
        <div className="logo-container">
          <Layers className="logo-icon" size={28} />
          <span className="logo-text">Signify</span>
          <span className="logo-badge">ASL CLASSIFIER</span>
        </div>

        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Home size={16} />
            Dashboard
          </button>
          <button 
            className={`nav-tab ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
          >
            <Camera size={16} />
            Webcam Sandbox
          </button>
          <button 
            className={`nav-tab ${activeTab === 'learning' ? 'active' : ''}`}
            onClick={() => setActiveTab('learning')}
          >
            <BookOpen size={16} />
            Learning Quiz
          </button>
          <button 
            className={`nav-tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            <Layers size={16} />
            Custom Datasets
          </button>
        </nav>
      </header>

      {/* Main Tab Panel Content */}
      <main style={{ flexGrow: 1, paddingBottom: '40px' }}>
        {activeTab === 'dashboard' && (
          <Dashboard stats={stats} triggerToast={triggerToast} fetchStats={fetchStats} />
        )}
        {activeTab === 'sandbox' && (
          <Sandbox triggerToast={triggerToast} />
        )}
        {activeTab === 'learning' && (
          <LearningCenter stats={stats} triggerToast={triggerToast} fetchStats={fetchStats} />
        )}
        {activeTab === 'custom' && (
          <CustomGestures triggerToast={triggerToast} />
        )}
      </main>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={16} color="var(--success)" /> : <AlertCircle size={16} color="var(--error)" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
