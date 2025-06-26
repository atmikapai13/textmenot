import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoadingPage.css';

export const LoadingPage: React.FC = () => {
  const [dotCount, setDotCount] = useState(0);
  const [showReady, setShowReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4); // 0,1,2,3
    }, 1000);
    const readyTimeout = setTimeout(() => setShowReady(true), 5000);
    return () => {
      clearInterval(dotInterval);
      clearTimeout(readyTimeout);
    };
  }, []);

  return (
    <div className="loading-root">
      <h1 className="landing-heading" style={{ marginTop: '28vh' }}>He'll Text Me.</h1>
      <img src="public/rose.gif" alt="rose" className="landing-rose" />
      <h2 className="landing-heading">
        He'll Text Me Not
        <span className={`loading-dot${dotCount > 0 ? ' visible' : ''}`}>.</span>
        <span className={`loading-dot${dotCount > 1 ? ' visible' : ''}`}>.</span>
        <span className={`loading-dot${dotCount > 2 ? ' visible' : ''}`}>.</span>
      </h2>
      {showReady && (
        <button className="landing-next fade-in" onClick={() => navigate('/dashboard')}>Ready!</button>
      )}
    </div>
  );
}; 