import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { parseChatFile, getFactsAndFigures, getKPIs } from '../utils/whatsappParser';
import './LoadingPage.css';

export const LoadingPage: React.FC = () => {
  const [dotCount, setDotCount] = useState(0);
  const [showReady, setShowReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facts, setFacts] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [messages, setMessages] = useState<any>(null);
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const file = (location.state && (location.state as any).file) || null;

  useEffect(() => {
    if (!file) {
      setError('No file provided!');
      setTimeout(() => setShowError(true), 5000);
      return;
    }
    (async () => {
      try {
        const msgs = await parseChatFile(file);
        setMessages(msgs);
        setFacts(getFactsAndFigures(msgs));
        setKpis(getKPIs(msgs));
        setTimeout(() => setShowReady(true), 5000);
      } catch (err) {
        setError('Incorrect File Format!');
        setTimeout(() => setShowError(true), 5000);
      }
    })();
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4); // 0,1,2,3
    }, 1000);
    return () => {
      clearInterval(dotInterval);
    };
  }, [file]);

  const handleReady = () => {
    navigate('/dashboard', { state: { facts, kpis, messages } });
  };

  const handleGoBack = () => {
    navigate('/tutorial');
  };

  return (
    <div className="loading-root">
      <h1 className="landing-heading" style={{ marginTop: '28vh' }}>He'll Text Me.</h1>
      <img src={`${import.meta.env.BASE_URL}rose.gif`} alt="rose" className="landing-rose" />
      <h2 className="landing-heading">
            He'll Text Me Not
            <span className={`loading-dot${dotCount > 0 ? ' visible' : ''}`}>.</span>
            <span className={`loading-dot${dotCount > 1 ? ' visible' : ''}`}>.</span>
            <span className={`loading-dot${dotCount > 2 ? ' visible' : ''}`}>.</span>
          </h2>
      {error && showError ? (
        <div className="loading-next fade-in" style={{ color: '#E33CC1', fontStyle: 'italic', marginTop: '1.2rem' }}>
          Incorrect File Format!<br />
          <button className="landing-next" style={{ marginTop: '0rem' }} onClick={handleGoBack}>
            Go back
          </button>
        </div>
      ) : (
        <>
          {showReady && (
            <button className="landing-next fade-in" onClick={handleReady}>Ready!</button>
          )}
        </>
      )}
    </div>
  );
}; 