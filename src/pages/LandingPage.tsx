import React, { useEffect, useState } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onNext?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNext }) => {
  const [showNext, setShowNext] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowNext(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing-root">
      <div className="landing-content">
        <h1 className="landing-heading">He'll Text Me.</h1>
        <img src={`${import.meta.env.BASE_URL}rose.gif`} alt="rose" className="landing-rose" />
        <h2 className="landing-heading">He'll Text Me Not...</h2>
        <div className="landing-body">
          <p className="landing-intro">
            <em>Texting is the bane of modern dating.<br/>
            Where once there was longing, now there is latency.<br/>
            Where once poetry bloomed, now only read receipts.</em>
          </p>
          <p className="landing-intro">
            So, upload your chat history. Seek answers to your most pressing questions:<br/>
            Who initiated the <span className="landing-em">most</span>?<br/>
            Who responded the <span className="landing-em">quickest</span>?<br/>
            Who ghosted <span className="landing-em">first</span> — but who ghosted <span className="landing-em">harder</span>?
          </p>
          <p className="landing-intro">
            This is not therapy. This is not closure. <br/>
            This is <span className="landing-em">˚.⋆ Data Science⁺₊✧☾</span>.
          </p>
        </div>
        <button
          className={`landing-next${showNext ? ' fade-in visible' : ' invisible'}`}
          onClick={showNext && onNext ? onNext : undefined}
        >
          Next
        </button>
      </div>
    </div>
  );
}; 

