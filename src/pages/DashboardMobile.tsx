import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './DashboardMobile.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getStackedBarData, formatResponseTime } from '../utils/whatsappParser';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { trackShare, trackDownload, trackRestart, trackCopyUrl, trackAnalysisComplete } from '../utils/analytics';


interface DashboardProps {}

const DashboardMobile: React.FC<DashboardProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect to /tutorial if required data is missing
  useEffect(() => {
    const state = location.state as any;
    if (!state || !state.facts || !state.kpis) {
      navigate('/tutorial', { replace: true });
    }
  }, [location, navigate]);

  const COLORS = ['#E33CC1', '#FF9AEF'];
  const facts = (location.state && (location.state as any).facts) || {};
  const kpis = (location.state && (location.state as any).kpis) || {};
  const participants = Array.isArray(facts.participants) ? facts.participants : [];
  const userA = participants[0] || 'User A';
  const userB = participants[1] || 'User B';
  const dateRange = facts.dateRange || '-';
  const dashboardImageRef = useRef<HTMLDivElement>(null);
  const [barData, setBarData] = useState<any[]>(
    (location.state && (location.state as any).barData) || []
  );
   // Share functionality
   const [showCopied, setShowCopied] = useState(false);

   const handleRestart = () => {
       trackRestart();
       navigate('/tutorial');
   };

   // Helper function to download image
   const downloadImage = (canvas: HTMLCanvasElement) => {
     trackDownload();
     const link = document.createElement('a');
     link.download = 'text-results.png';
     link.href = canvas.toDataURL();
     link.click();
   };

   const handleShareImage = async () => {
    try {
      // Use the ref instead of getElementById
      if (!dashboardImageRef.current) {
        console.error('Dashboard element not found');
        return;
      }

      const canvas = await html2canvas(dashboardImageRef.current, { useCORS: true });
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Failed to create blob');
          downloadImage(canvas);
          return;
        }

        // Create a File object from the blob
        const file = new File([blob], 'text-results.png', { 
          type: 'image/png' 
        });
        
        // Check if sharing files is supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "He'll Text Me. He'll Text Me Not.",
              text: 'Check out my results!',
            });
            trackShare('native_share');
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              // User didn't cancel - there was an actual error
              console.error('Error sharing:', err);
              // Fallback to download
              downloadImage(canvas);
            }
          }
        } else {
          // Fallback: download the image
          downloadImage(canvas);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error generating image:', error);
      // Final fallback - try to generate and download
      if (dashboardImageRef.current) {
        try {
          const canvas = await html2canvas(dashboardImageRef.current, { useCORS: true });
          downloadImage(canvas);
        } catch (fallbackError) {
          console.error('Fallback download also failed:', fallbackError);
        }
      }
    }
  };

  const handleShareOrDownload = async () => {
    // Try to share first
    if (navigator.canShare && typeof navigator.canShare === 'function') {
      await handleShareImage();
    } else {
      // Fallback to download
      if (dashboardImageRef.current) {
        try {
          const canvas = await html2canvas(dashboardImageRef.current, { useCORS: true });
          downloadImage(canvas);
        } catch (error) {
          console.error('Error downloading image:', error);
        }
      }
    }
  };
   const handleCopyUrl = () => {
    trackCopyUrl();
    navigator.clipboard.writeText('https://atmikapai13.github.io/ghosting_validator/');
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };

  // If barData is empty but messages+facts are available, recalculate barData
  useEffect(() => {
    if (barData.length === 0 && location.state && (location.state as any).messages && ((location.state as any).facts)) {
      const messages = (location.state as any).messages;
      const factsInit = (location.state as any).facts;
      setBarData(getStackedBarData(messages, factsInit));
    }
  }, [barData.length, location.state]);

  // Track when dashboard is loaded (analysis complete)
  useEffect(() => {
    if (location.state && (location.state as any).facts) {
      trackAnalysisComplete();
    }
  }, [location.state]);
  
  // Custom Tooltip for BarChart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ background: '#fff8fd', border: '1px solid #E33CC1', borderRadius: '8px', padding: '0.7em 1em', color: '#682960' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div><span style={{ color: COLORS[0], fontWeight: 700 }}>{userA}:</span> {payload[0].value}%</div>
          <div><span style={{ color: COLORS[1], fontWeight: 700 }}>{userB}:</span> {payload[1].value}%</div>
        </div>
      );
    }
    return null;
  };

  // Custom XAxis tick for rotated, multi-line labels
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const parts = payload.value.split(/ – | - /);
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          textAnchor="end"
          fontSize="0.7rem"
          fill="#682960"
          dy={10}
          transform="rotate(-45)"
        >
          <tspan x="0" dy="0">{parts[0]}{parts[1] ? ' –' : ''}</tspan>
          {parts[1] && <tspan x="0" dy="12">{parts[1]}</tspan>}
        </text>
      </g>
    );
  };

  return (
    <div className="dashboard-mobile-root" ref={dashboardImageRef}>
      

      {/* Inner rectangle */}
      <div className="dashboard-mobile-inner" >
        {/* Corner roses */}
        <img src={`${import.meta.env.BASE_URL}rose2.png`} alt="rose" className="dashboard-mobile-corner topleft" />
        <img src={`${import.meta.env.BASE_URL}rose2.png`} alt="rose" className="dashboard-mobile-corner topright" />
        <img src={`${import.meta.env.BASE_URL}rose2.png`} alt="rose" className="dashboard-mobile-corner bottomleft" />
        <img src={`${import.meta.env.BASE_URL}rose2.png`} alt="rose" className="dashboard-mobile-corner bottomright" />
        {/* Your mobile dashboard content goes here */}
        <div className="dashboard-mobile-content">
        {/* <pre>{JSON.stringify({ facts, kpis, barData, messages }, null, 2)}</pre> */}
        <div className="dashboard-header">
          <div className="dashboard-title">{userA} <span role="img" aria-label="heart">❤️</span> {userB}</div>
          <div className="dashboard-dates">{dateRange}</div>
        </div>
        
        <div className="dashboard-facts">
          <div className="dashboard-facts-title" style={{marginBottom: '-15px'}}>Facts & Figures</div>
          <div className="dashboard-facts-column">
            <div className="dashboard-fact" style={{marginTop: '-15px'}}><span className="fact-number" style={{ marginTop: 0 }}>{typeof facts.totalMessages === 'number' ? facts.totalMessages.toLocaleString() : '-'}</span><br />Messages Exchanged</div>
            <div className="dashboard-fact" style={{marginBottom: '0.0rem'}}><span className="fact-number">{typeof facts.totalMedia === 'number' ? facts.totalMedia.toLocaleString() : '-'}</span><br />Media Shared</div>
            <div className="dashboard-fact" style={{marginBottom: '0.0rem'}}><span className="fact-number">{typeof facts.totalEmojis === 'number' ? facts.totalEmojis.toLocaleString() : '-'}</span><br />Emoji Abused</div>
            <div className="dashboard-fact" style={{marginBottom: '0.0rem'}}><span className="fact-number">{typeof facts.daysAndHoursSpanned === 'string' ? facts.daysAndHoursSpanned : '-'}</span><br />Time Elapsed</div>
            <div className="dashboard-fact"><span className="fact-number">{facts.mostActiveDay ?? '-'}</span><br />Most Active Day</div>
            <div className="dashboard-fact"><span className="fact-number">{facts.longestSilence ?? '-'}</span><br />Longest Silence</div>
          </div>
        </div>

        <div className="dashboard-facts">
          <div className="dashboard-facts-title">Key Performance Indicators</div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: "80px",
            alignItems: 'center',
            width: "auto",
            margin: '0 auto',
            fontSize: '1.0rem',
            fontWeight: 'bold',
            marginTop: '0.0rem',
            marginBottom: '0',
            color: '#682960'
          }}>
            <span>{userA}</span>
            <span>{userB}</span>
          </div>
          <div className="dashboard-fact" style={{ marginTop: "-15px" }}>
            <div className="dashboard-fact-title" style={{fontWeight: '700'}}>Initiator Ratio</div>
            <div className="dashboard-fact-numbers-row" style={{display: "flex", justifyContent: "center", gap: "80px", width: "auto", margin: "0 auto"}}>
              <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
                {kpis[userA]?.initiatorRatio !== undefined ? Math.round(kpis[userA].initiatorRatio) + '%' : '-'}
              </span>
              <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
                {kpis[userB]?.initiatorRatio !== undefined ? Math.round(kpis[userB].initiatorRatio) + '%' : '-'}
              </span>
            </div>
            
          </div>
        <div className="dashboard-fact" style={{ marginTop: 0 }}>
        <div className="dashboard-fact-title" style={{fontWeight: '700'}}>Avg. Response Time</div>
          <div className="dashboard-fact-numbers-row" style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
            <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
              {kpis[userA]?.avgResponseTime !== undefined ? formatResponseTime(kpis[userA].avgResponseTime) : '-'}
            </span>
            <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
              {kpis[userB]?.avgResponseTime !== undefined ? formatResponseTime(kpis[userB].avgResponseTime) : '-'}
            </span>
          </div>
          
        </div>
      <div className="dashboard-fact" style={{ marginTop: 0 }}>
      <div className="dashboard-fact-title" style={{display: "flex", justifyContent: "center", gap: "50px", width: "auto", margin: "0 auto", fontWeight: '700'}}>Avg. Message Length (words)</div>
      
      <div className="dashboard-fact-numbers-row">
        <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
          {kpis[userA]?.avgMessageLength !== undefined ? kpis[userA].avgMessageLength.toFixed(1) : '-'}
        </span>
        <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
          {kpis[userB]?.avgMessageLength !== undefined ? kpis[userB].avgMessageLength.toFixed(1) : '-'}
        </span>
      </div>
      
    </div>
      <div className="dashboard-fact" style={{ marginTop: 0 }}>
      <div className="dashboard-fact-title" style={{fontWeight: '700'}}>Double-texts</div>
        <div className="dashboard-fact-numbers-row" style={{display: "flex", justifyContent: "center", gap: "100px",width: "auto",margin: "0 auto"}}>
          <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
            {kpis[userA]?.doubleTexts !== undefined ? kpis[userA].doubleTexts.toLocaleString() : '-'}
          </span>
          <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
            {kpis[userB]?.doubleTexts !== undefined ? kpis[userB].doubleTexts.toLocaleString() : '-'}
          </span>
        </div>
        
      </div>
      <div className="dashboard-fact" style={{ marginTop: 0 }}>
      <div className="dashboard-fact-title" style={{fontWeight: '700'}}>% Punctuation Used</div>
        <div className="dashboard-fact-numbers-row" style={{display: "flex", justifyContent: "center", gap: "100px", width: "auto", margin: "0 auto"}}>
          <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
            {kpis[userA]?.percentPunctuationUsed !== undefined
              ? Math.round(kpis[userA].percentPunctuationUsed) + '%'
              : '-'}
          </span>
          <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
            {kpis[userB]?.percentPunctuationUsed !== undefined
              ? Math.round(kpis[userB].percentPunctuationUsed) + '%'
              : '-'}
          </span>
        </div>
        
      </div>
      <div className="dashboard-fact" style={{ marginTop: 0 }}>
      <div className="dashboard-fact-title" style={{fontWeight: '700'}}>% Emoji Used</div>
        <div className="dashboard-fact-numbers-row" style={{
                display: "flex",
                justifyContent: "center",
                gap: "100px",
                width: "auto",
                margin: "0 auto"
              }}>
          <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
            {kpis[userA]?.percentEmojiUsed !== undefined
              ? Math.round(kpis[userA].percentEmojiUsed) + '%'
              : '-'}
          </span>
          <span className="fact-number" style={{ marginTop: 0, marginBottom: 0 }}>
            {kpis[userB]?.percentEmojiUsed !== undefined
              ? Math.round(kpis[userB].percentEmojiUsed) + '%'
              : '-'}
          </span>
        </div>
        
      </div>
        </div>
        </div>
        <div className="dashboard-facts">
          <div className="dashboard-facts-title" style={{marginBottom: '0'}}>Graphs</div>
          
          <div style={{fontSize: '1.2rem', fontWeight: 'bold', marginTop: '-15px', color: '#682960'}}>Message Equity Index</div>
          <div className="graphs-bar">
            <ResponsiveContainer width="100%" height={200} minWidth={250} minHeight={100}>
              <BarChart data={barData} margin={{ top: -30, right: -8, left: -30, bottom: 0 }}>
                <XAxis
                  dataKey="periodLabel" tick={CustomXAxisTick} interval={0}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: '0.7rem' }} ticks={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="rect" height={30} wrapperStyle={{ fontSize: '0.5rem', marginTop: 0, marginBottom: -20, marginLeft: 20 }} />
                <Bar dataKey={userA} stackId="a" fill={COLORS[0]} name={userA} />
                <Bar dataKey={userB} stackId="a" fill={COLORS[1]} name={userB} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="dashboard-summary">
          We'll let you derive your own conclusions. Happy analyzing!<br />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
            <span className="dashboard-share" onClick={handleShareOrDownload} style={{ cursor: 'pointer' }}>
              Share these results 🌹
            </span>
            
            <span className="dashboard-share" onClick={handleRestart} style={{ cursor: 'pointer' }}>
              Restart 🔄
            </span>
            
            <span className="dashboard-share" onClick={handleCopyUrl} style={{ cursor: 'pointer' }}>
              {showCopied ? 'Copied!' : 'helltextmenot.com'}
            </span>
            
          </div>
        </div>
      </div>
    </div>
  );
  
};

export default DashboardMobile;

