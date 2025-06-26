import React from 'react';
import './Dashboard.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#E33CC1', '#FF9AEF'];

const barData = [
  { month: 'Jan', 'User A': 80, 'User B': 20 },
  { month: 'Feb', 'User A': 60, 'User B': 40 },
  { month: 'Mar', 'User A': 70, 'User B': 30 },
  { month: 'Apr', 'User A': 50, 'User B': 50 },
  { month: 'May', 'User A': 90, 'User B': 10 },
  { month: 'Jun', 'User A': 60, 'User B': 40 },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-root">
      {/* Corner decorations */}
      <img src="public/rose2.png" alt="corner" className="dashboard-corner topleft" />
      <img src="public/rose2.png" alt="corner" className="dashboard-corner topright" />
      <img src="public/rose2.png" alt="corner" className="dashboard-corner bottomleft" />
      <img src="public/rose2.png" alt="corner" className="dashboard-corner bottomright" />
      
      <div className="dashboard-center-rect">
        <div className="dashboard-header">
          <div className="dashboard-title">User A <span role="img" aria-label="heart">❤️</span> User B</div>
          <div className="dashboard-dates">May 2024 - April 2026</div>
        </div>
      
        <div className="dashboard-facts">
          <div className="dashboard-facts-title">Facts & Figures</div>
          <div className="dashboard-fact"><span className="fact-number">33</span><br />Messages Exchanged</div>
          <div className="dashboard-fact"><span className="fact-number">14</span><br />Media Shared</div>
          <div className="dashboard-fact"><span className="fact-number">75</span><br />Emoji Abused</div>
          <div className="dashboard-fact"><span className="fact-number">466</span><br />Days of Correspondence</div>
          <div className="dashboard-fact"><span className="fact-number">May 3, 2024</span><br />Most Active Day</div>
          <div className="dashboard-fact"><span className="fact-number">4 days, 2 hrs</span><br />Longest Silence</div>
        </div>

        <div className="dashboard-main">
          <div className="dashboard-kpi">
            <div className="kpi-title">Key Performance Indicators</div>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th></th>
                  <th>User A</th>
                  <th>User B</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Initiator Ratio</td><td>42%</td><td>59%</td></tr>
                <tr><td>Avg. Response Time</td><td>2 hr</td><td>1 hr</td></tr>
                <tr><td>Avg. Message Length</td><td>7 words</td><td>5.6 words</td></tr>
                <tr><td>% Double-texts</td><td>66%</td><td>23%</td></tr>
                <tr><td>% Left on Read</td><td>23%</td><td>46%</td></tr>
              </tbody>
            </table>
          </div>
          <div className="dashboard-graphs">
            <div className="graphs-title">Graphs</div>
            <div className="graphs-bar">
              <div className="graph-label">Who carried the conversation?</div>
              <ResponsiveContainer width="100%" height={120} minWidth={200} minHeight={100}>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="User A" stackId="a" fill={COLORS[0]} />
                  <Bar dataKey="User B" stackId="a" fill={COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="dashboard-summary">
          We'll let you make your own conclusions. <br />
          Hope we made the pathologies & neuroses worth it!<br />
        </div>
        <div className="dashboard-share" onClick={() => navigate('/chatparser')} style={{cursor: 'pointer', textDecoration: 'underline'}}>
          Share these results <span role="img" aria-label="rose">🌹</span>
        </div>
      </div>
    </div>
  );
}; 