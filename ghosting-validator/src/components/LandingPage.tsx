import React, { useRef, useState } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onFileSelected: (file: File) => void;
  tagline?: string;
}

const flowerSVG = (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="12" fill="#FF4FCB"/>
    <ellipse cx="30" cy="12" rx="8" ry="4" fill="#FFB6EC"/>
    <ellipse cx="30" cy="48" rx="8" ry="4" fill="#FFB6EC"/>
    <ellipse cx="12" cy="30" rx="4" ry="8" fill="#FFB6EC"/>
    <ellipse cx="48" cy="30" rx="4" ry="8" fill="#FFB6EC"/>
    <ellipse cx="18" cy="18" rx="4" ry="8" transform="rotate(-45 18 18)" fill="#FFB6EC"/>
    <ellipse cx="42" cy="18" rx="4" ry="8" transform="rotate(45 42 18)" fill="#FFB6EC"/>
    <ellipse cx="18" cy="42" rx="4" ry="8" transform="rotate(45 18 42)" fill="#FFB6EC"/>
    <ellipse cx="42" cy="42" rx="4" ry="8" transform="rotate(-45 42 42)" fill="#FFB6EC"/>
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onFileSelected, tagline }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div>
          <h1 className="landing-title">Is He Into You?</h1>
          <div className="landing-tagline">{tagline || 'Decode your chat. Discover your fate. Have a laugh.'}</div>
        </div>
        <div className="landing-flower">
          {flowerSVG}
          <div className="landing-flower-text">He texts me.<br/>He texts me not.</div>
        </div>
      </header>
      <main className="landing-main">
        <div
          className={`landing-dropzone${dragActive ? ' active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <span>Drag & drop text transcript ↓</span>
          <input
            type="file"
            accept=".txt,.csv"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        <button className="landing-submit" onClick={() => fileInputRef.current?.click()}>
          Submit
        </button>
      </main>
      <footer className="landing-footer">
        Powered by Eros
      </footer>
    </div>
  );
}; 