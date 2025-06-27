import React, { useState } from 'react';
import { WhatsAppParser } from '../utils/whatsappParser';
import type { WhatsAppMessage } from '../utils/whatsappParser';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

interface ChatStats {
  totalMessages: number;
  participants: Set<string>;
  mediaCount: number;
  mediaTypes: Record<string, number>;
  messageCounts: Record<string, number>;
  averageResponseTime: number;
  firstMessage: Date | null;
  lastMessage: Date | null;
  mediaBySender: Record<string, number>;
  averageResponseTimeBySender: Record<string, number>;
  messageTimelineBySender: Record<string, Record<string, number>>;
  initiatorCounts: Record<string, number>;
  averageMessageLengthBySender: Record<string, number>;
}

interface ChatParserProps {
  messages?: WhatsAppMessage[];
  stats?: ChatStats;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', '#FF6699', '#FF4444', '#44FF44', '#4444FF', '#AAAAAA'
];

const ChatParser: React.FC<ChatParserProps> = ({ messages: propMessages, stats: propStats }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(propStats || null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const parsedMessages = WhatsAppParser.parseChat(text);
      const chatStats = WhatsAppParser.getStats(parsedMessages);
      setStats(chatStats);
    } catch (error) {
      console.error('Error parsing chat:', error);
      alert('Error parsing chat file. Please make sure it\'s a valid WhatsApp export.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatResponseTime = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'Less than a minute';
  };

  // Use props if provided, otherwise use state
  const usedStats = propStats || stats;

  // Prepare data for pie chart
  const mediaPieData = usedStats
    ? Object.entries(usedStats.mediaTypes).map(([type, count]) => ({ name: type, value: count }))
    : [];

  // Custom label for pie chart to show percentage
  const renderPieLabel = (entry: any) => {
    const total = mediaPieData.reduce((sum, item) => sum + item.value, 0);
    const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
    return `${percent}%`;
  };

  // Prepare data for timeline line chart (percentages)
  let timelineData: any[] = [];
  if (usedStats) {
    // Get all months in the data
    const allMonths = new Set<string>();
    Object.values(usedStats.messageTimelineBySender).forEach(senderTimeline => {
      Object.keys(senderTimeline).forEach(month => allMonths.add(month));
    });
    const sortedMonths = Array.from(allMonths).sort();
    // Build data array for recharts (percentages)
    timelineData = sortedMonths.map(month => {
      const entry: any = { month };
      let total = 0;
      for (const sender of Object.keys(usedStats.messageTimelineBySender)) {
        total += usedStats.messageTimelineBySender[sender]?.[month] || 0;
      }
      for (const sender of Object.keys(usedStats.messageTimelineBySender)) {
        const count = usedStats.messageTimelineBySender[sender]?.[month] || 0;
        entry[sender] = total > 0 ? Math.round((count / total) * 100) : 0;
      }
      return entry;
    });
  }

  return (
    <div className="chat-parser">
      <h2>WhatsApp Chat Parser</h2>
      {/* Only show upload if not using props */}
      {!propMessages && (
        <div className="upload-section">
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
          {isLoading && <p>Parsing chat...</p>}
        </div>
      )}
      {usedStats && (
        <div className="stats-section">
          <h3>Chat Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Messages</h4>
              <p>{usedStats.totalMessages}</p>
            </div>
            <div className="stat-card">
              <h4>Participants</h4>
              <p>{Array.from(usedStats.participants).join(', ')}</p>
            </div>
            <div className="stat-card">
              <h4>Media Messages</h4>
              <p>{usedStats.mediaCount}</p>
            </div>
            <div className="stat-card">
              <h4>Average Response Time</h4>
              <div className="per-person-response-times" style={{ marginTop: 8 }}>
                {Object.entries(usedStats.averageResponseTimeBySender).map(([sender, avg]) => (
                  <div key={sender} className="person-response-time">
                    <span>{sender}:</span> <span>{formatResponseTime(avg)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Initiator Ratio */}
            <div className="stat-card">
              <h4>Initiator Ratio</h4>
              <div className="per-person-initiator" style={{ marginTop: 8 }}>
                {Object.entries(usedStats.initiatorCounts).map(([sender, count]) => {
                  const totalInitiations = Object.values(usedStats.initiatorCounts).reduce((a, b) => a + b, 0);
                  const ratio = totalInitiations > 0 ? (count / totalInitiations) * 100 : 0;
                  return (
                    <div key={sender} className="person-initiator">
                      <span>{sender}:</span> <span>{ratio.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Avg. Message Length */}
            <div className="stat-card">
              <h4>Avg. Message Length</h4>
              <div className="per-person-msglen" style={{ marginTop: 8 }}>
                {Object.entries(usedStats.averageMessageLengthBySender).map(([sender, avg]) => (
                  <div key={sender} className="person-msglen">
                    <span>{sender}:</span> <span>{avg.toFixed(1)} words</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="message-counts">
            <h4>Message Count by Person</h4>
            {Object.entries(usedStats.messageCounts).map(([sender, count]) => (
              <div key={sender} className="message-count">
                <span>{sender}:</span>
                <span>{count} messages</span>
              </div>
            ))}
          </div>
          {usedStats.mediaCount > 0 && (
            <div className="media-types">
              <h4>Media Types</h4>
              <ResponsiveContainer width="100%" height={250} minWidth={300} minHeight={200}>
                <PieChart>
                  <Pie
                    data={mediaPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderPieLabel}
                  >
                    {mediaPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="media-by-sender-summary" style={{ marginTop: 16 }}>
                <h5>Media Shared by Each Person</h5>
                {Object.entries(usedStats.mediaBySender).map(([sender, count]) => (
                  <div key={sender} className="media-sender-count">
                    <span>{sender}:</span> <span>{count} media messages</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="chat-duration">
            <h4>Chat Duration</h4>
            {usedStats.firstMessage && usedStats.lastMessage && (
              <p>
                From {usedStats.firstMessage.toLocaleDateString()} to {usedStats.lastMessage.toLocaleDateString()}
              </p>
            )}
          </div>
          {/* Timeline 100% Stacked Bar Chart */}
          <div className="timeline-section" style={{ marginTop: 32 }}>
            <h4>Messages Per Month (Share %)</h4>
            <ResponsiveContainer width="100%" height={300} minWidth={300} minHeight={200}>
              <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} domain={[0, 100]} tickFormatter={tick => `${tick}%`} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
                {usedStats && Object.keys(usedStats.messageTimelineBySender).map((sender, idx) => (
                  <Bar
                    key={sender}
                    dataKey={sender}
                    stackId="a"
                    fill={COLORS[idx % COLORS.length]}
                    name={sender}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatParser; 