import React, { useRef, useState } from 'react';
import './TutorialPage.css';

interface TutorialPageProps {
  onNext?: () => void;
}

export const TutorialPage: React.FC<TutorialPageProps> = ({ onNext }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showError, setShowError] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setShowError(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setShowError(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      selectedFile &&
      (selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.zip'))
    ) {
      if (onNext) onNext();
    } else {
      setShowError(true);
    }
  };

  return (
    <div className="tutorial-root">
      <div className="tutorial-content">
        <h1 className="tutorial-heading">Upload chats from WhatsApp</h1>
        <div className="tutorial-steps">
          <em>1. Open WhatsApp on your phone<br /></em>
          <em>2. Go to your chat with him<br /></em>
          <em>3. Tap on his name and open Contact Info<br /></em>
          <em>4. Scroll down and tap Export Chat<br /></em>
          <em>5. Upload file below</em>
        </div>
        <div
          className="tutorial-dropzone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleClick}
        >
          <div className="tutorial-envelope">˖✧˖ <span role="img" aria-label="envelope">💌</span> ˖✧˖</div>
          {selectedFile ? (
            <span className="tutorial-dropzone-file">{selectedFile.name}</span>
          ) : (
            <span className="tutorial-dropzone-text">Drag &amp; Drop<br/>Correspondence</span>
          )}
          <input
            type="file"
            accept=".txt,.zip"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <button className="tutorial-submit" type="submit">Submit</button>
        </form>
        {showError && (
          <div className="tutorial-error">Incorrect File Type!</div>
        )}
        <div className="tutorial-note">
          Note: Only you and social media companies own your data.<br/>
          We don't store it. We don't sell it.
        </div>
      </div>
    </div>
  );
}; 