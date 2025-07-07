import { useState, useEffect , useRef} from 'react';
import './DashboardDesktop.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLocation } from 'react-router-dom';
import { getStackedBarData, formatResponseTime, fmtPct, fmtWords, fmtInt, formatBinDateRange } from '../utils/whatsappParser';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';



export default function DashboardDesktop() {
  const location = useLocation();

const COLORS = ['#E33CC1', '#FF9AEF'];
  
  // State for dashboard data
  const dashboardImageRef = useRef<HTMLDivElement>(null);
  const [facts] = useState((location.state && (location.state as any).facts) || {});
  const [kpis] = useState((location.state && (location.state as any).kpis) || {});
  const [barData, setBarData] = useState<any[]>(
    (location.state && (location.state as any).barData) || []
  );
  // Use 'any' to avoid linter error; can be typed more strictly if needed
  const [drilldown, setDrilldown] = useState<any>(null);

  // If barData is empty but messages+facts are available, recalculate barData
  useEffect(() => {
    if (barData.length === 0 && location.state && (location.state as any).messages && ((location.state as any).facts)) {
      const messages = (location.state as any).messages;
      const factsInit = (location.state as any).facts;
      setBarData(getStackedBarData(messages, factsInit));
    }
  }, [barData.length, location.state]);

  const participants = Array.isArray(facts.participants) ? facts.participants : [];
  const userA = participants[0] || 'User A';
  const userB = participants[1] || 'User B';
  const dateRange = facts.dateRange || '-';

  
  // Share functionality
  const navigate = useNavigate();

  const handleRestart = () => {
      navigate('/tutorial');
  };
  const [showCopied, setShowCopied] = useState(false);
  const handleCopyUrl = () => {
    navigator.clipboard.writeText('https://atmikapai13.github.io/ghosting_validator/');
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };
  const handleShare = async () => {
    if (dashboardImageRef.current) {
      const canvas = await html2canvas(dashboardImageRef.current, { useCORS: true });
      const image = canvas.toDataURL('image/png');
      // Download the image
      const link = document.createElement('a');
      link.href = image;
      link.download = 'dashboard.png';
      link.click();
    }
   };

  // Custom Tooltip for BarChart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0].payload) {
      const bin = payload[0].payload;
      const dateRange = formatBinDateRange(bin.startDate, bin.endDate, bin.binDaysElapsed);
      return (
        <div className="custom-tooltip" style={{ background: '#fff8fd', border: '1px solid #E33CC1', borderRadius: '8px', padding: '0.7em 1em', color: '#682960' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{dateRange}</div>
          <div><span style={{ color: COLORS[0], fontWeight: 700 }}>{userA}:</span> {payload[0].value}%</div>
          <div><span style={{ color: COLORS[1], fontWeight: 700 }}>{userB}:</span> {payload[1].value}%</div>
        </div>
      );
    }
    return null;
  };

  // Custom XAxis tick: always line break after dash
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    // Label is always 'MMM D, YYYY – MMM D, YYYY'
    const parts = payload.value.split(' – ');
    if (parts.length !== 2) {
      // fallback
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            textAnchor="end"
            fontSize="0.7rem"
            fill="#682960"
            transform="rotate(-45)"
            dy={0}
            dx={-2}
          >
            {payload.value}
          </text>
        </g>
      );
    }
    // Parse years
    const startDate = new Date(parts[0]);
    const endDate = new Date(parts[1]);
    let firstLine = '';
    let secondLine = '';
    if (startDate.getFullYear() === endDate.getFullYear()) {
      // Same year: 'MMM D –\nMMM D, YYYY'
      const startFmt = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endFmt = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const year = startDate.getFullYear();
      firstLine = `${startFmt} –`;
      secondLine = `${endFmt} ${year}`;
    } else {
      // Different years: 'MMM D, YYYY –\nMMM D, YYYY'
      firstLine = `${parts[0]} –`;
      secondLine = parts[1];
    }
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          textAnchor="end"
          fontSize="0.7rem"
          fill="#682960"
          transform="rotate(-45)"
          dy={0}
          dx={-2}
        >
          {firstLine}
          <tspan x="0" dy="12">{secondLine}</tspan>
        </text>
      </g>
    );
  };

  // Handler for bar click (Level 1 -> Level 2)
  const handleBarClick = (data: any) => {
    if (!data || !data.startDate || !data.endDate) return;
    // Filter messages for the selected period
    const messages = (location.state as any).messages;
    const factsInit = (location.state as any).facts;
    if (!messages || !Array.isArray(messages)) {
      console.error('No messages found or messages is not an array');
      return;
    }
    // Defensive: handle both timestamp_ms (number) and timestamp (Date or string)
    const filtered = messages.filter((m: any) => {
      let t: Date;
      if (m.timestamp_ms) {
        t = new Date(m.timestamp_ms);
      } else if (m.timestamp) {
        t = new Date(m.timestamp);
      } else {
        return false;
      }
      return t >= new Date(data.startDate) && t < new Date(data.endDate);
    });
    console.log('Filtered messages for drilldown:', filtered);
    // Re-bin into 6 bins for this period
    const barData2 = getStackedBarData(filtered, factsInit);
    console.log('Drilldown bar data:', barData2);
    if (!barData2 || barData2.length === 0) {
      alert('No data available for this period.');
      return;
    }
    setDrilldown({ period: data, data: barData2 });
  };

  // Handler for back button (Level 2 -> Level 1)
  const handleBack = () => setDrilldown(null);

  return (
    <div className="dashboard-root" ref={dashboardImageRef}>
      {/* Corner decorations */}
      <img src={`${import.meta.env.BASE_URL}rose2.png`} alt="corner" className="dashboard-corner topleft" />
      <img src={`${import.meta.env.BASE_URL}rose2.png`} alt="corner" className="dashboard-corner topright flip-horizontal" />
      <img src={`${import.meta.env.BASE_URL}rose2.png`} alt="corner" className="dashboard-corner bottomleft" />
      <img src={`${import.meta.env.BASE_URL}rose2.png`} alt="corner" className="dashboard-corner bottomright flip-horizontal" />
      
      <div className="dashboard-center-rect">
        <div className="dashboard-header">
          <div className="dashboard-title">{userA} <span role="img" aria-label="heart">❤️</span> {userB}</div>
          <div className="dashboard-dates">{dateRange}</div>
        </div>
        
        <div className="dashboard-facts">
          <div className="dashboard-facts-title">Facts & Figures</div>
          <div className="dashboard-facts-row"  style={{marginTop: '-15px'}}>
            <div className="dashboard-fact"><span className="fact-number">{typeof facts.totalMessages === 'number' ? facts.totalMessages.toLocaleString() : '-'}</span><br />Messages Exchanged</div>
            <div className="dashboard-fact"><span className="fact-number">{typeof facts.totalMedia === 'number' ? facts.totalMedia.toLocaleString() : '-'}</span><br />Media Shared</div>
            <div className="dashboard-fact"><span className="fact-number">{typeof facts.totalEmojis === 'number' ? facts.totalEmojis.toLocaleString() : '-'}</span><br />Emoji Abused</div>
            <div className="dashboard-fact"><span className="fact-number">{typeof facts.daysAndHoursSpanned === 'string' ? facts.daysAndHoursSpanned : '-'}</span><br />Time Elapsed</div>
            <div className="dashboard-fact"><span className="fact-number">{facts.mostActiveDay ?? '-'}</span><br />Most Active Day</div>
            <div className="dashboard-fact"><span className="fact-number">{facts.longestSilence ?? '-'}</span><br />Longest Silence</div>
          </div>
        </div>

        <div className="dashboard-main">
          <div className="dashboard-kpi">
            <div className="kpi-title">Key Performance Indicators</div>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th></th>
                  <th style={{ color: '#E33CC1'}}>{userA}</th>
                  <th style={{ color: '#E33CC1'}}>{userB}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ fontWeight: 700 }}>Initiator Ratio</td><td>{fmtPct(kpis[userA]?.initiatorRatio)}</td><td>{fmtPct(kpis[userB]?.initiatorRatio)}</td></tr>
                <tr><td style={{ fontWeight: 700 }}>Avg. Response Time</td><td>{formatResponseTime(kpis[userA]?.avgResponseTime)}</td><td>{formatResponseTime(kpis[userB]?.avgResponseTime)}</td></tr>
                <tr><td style={{ fontWeight: 700 }}>Avg. Message Length</td><td>{fmtWords(kpis[userA]?.avgMessageLength)}</td><td>{fmtWords(kpis[userB]?.avgMessageLength)}</td></tr>
                <tr><td style={{ fontWeight: 700 }}>Double-texts</td><td>{fmtInt(kpis[userA]?.doubleTexts)}</td><td>{fmtInt(kpis[userB]?.doubleTexts)}</td></tr>
                <tr><td style={{ fontWeight: 700 }}>% Punctuation Used</td><td>{fmtPct(kpis[userA]?.percentPunctuationUsed)}</td><td>{fmtPct(kpis[userB]?.percentPunctuationUsed)}</td></tr>
                <tr><td style={{ fontWeight: 700 }}>% Emoji Used</td><td>{fmtPct(kpis[userA]?.percentEmojiUsed)}</td><td>{fmtPct(kpis[userB]?.percentEmojiUsed)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="dashboard-graphs" style={{ position: 'relative' }}>
            {/* Back button for Level 2 */}
            {drilldown && (
              <button
                className="dashboard-back-btn"
                onClick={handleBack}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 10,
                  padding: 0,
                }}
                aria-label="Back to Level 1"
              >
                {/* SVG refresh icon, styled to match theme */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E33CC1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6"/>
                  <path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10"/>
                  <path d="M20.49 15A9 9 0 0 1 5.87 18.36L1 14"/>
                </svg>
              </button>
            )}
            <div className="graphs-title" style={{ marginTop: '0.6rem' }}>Graphs
              <div className="graph-label" style={{ marginBottom: '0.0rem', marginTop: '0.0rem', fontStyle: 'normal', fontFamily: 'DM Serif Text', color: '#0E2102', fontWeight: 100 }}> 
                Message Equity Index</div>
            </div>
            <div className="graphs-bar">
              {/* Defensive: show message if no data */}
              {((drilldown ? drilldown.data : barData)?.length === 0) ? (
                <div style={{ color: '#E33CC1', textAlign: 'center', padding: '2rem' }}>No data available for this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={180} minWidth={200} minHeight={100}>
                  <BarChart
                    data={drilldown ? drilldown.data : barData}
                    margin={{ top: 0, right: 5, left: -30, bottom: 0 }}
                    onClick={drilldown ? undefined : (e: any) => {
                      if (e && e.activeLabel) {
                        const d = (drilldown ? drilldown.data : barData).find((b: any) => b.periodLabel === e.activeLabel);
                        if (d) handleBarClick(d);
                      }
                    }}
                  >
                    <XAxis
                      dataKey="periodLabel" tick={CustomXAxisTick} interval={0}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: '0.7rem' }} ticks={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="rect" height={33} wrapperStyle={{ fontSize: '0.5rem', marginTop: 0, marginBottom: -5, marginLeft: 30 }} />
                    <Bar dataKey={userA} stackId="a" fill={COLORS[0]} name={userA} />
                    <Bar dataKey={userB} stackId="a" fill={COLORS[1]} name={userB} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-summary">
          We'll let you derive your own conclusions. Happy analyzing!!<br />
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '32px', marginTop: '8px' }}>
            <span className="dashboard-share" onClick={handleShare} style={{ cursor: 'pointer' }}>
              Share these results 🌹
            </span>
            <span className="dashboard-share" onClick={handleRestart} style={{ cursor: 'pointer' }}>
              Restart 🔄
            </span>
            <br />
            <span className="dashboard-share" onClick={handleCopyUrl} style={{ cursor: 'pointer' }}>
              {showCopied ? 'Copied!' : 'helltextmenot.com'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 