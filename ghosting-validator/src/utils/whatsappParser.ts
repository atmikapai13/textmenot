export interface WhatsAppMessage {
  timestamp: Date;
  sender: string;
  message: string;
  isMedia: boolean;
  mediaType?: 'image' | 'sticker' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'unknown';
}

export class WhatsAppParser {
  private static readonly MESSAGE_REGEX = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\]\s+(.+?):\s+(.+)$/;
  private static readonly MEDIA_PATTERNS = {
    image: /image omitted/i,
    sticker: /sticker omitted/i,
    gif: /gif omitted/i,
    video: /video omitted/i,
    audio: /audio omitted/i,
    document: /document omitted/i,
    location: /location omitted/i,
    contact: /contact omitted/i,
    // Add more as needed
  };

  /**
   * Parse a single WhatsApp message line
   */
  static parseMessage(line: string): WhatsAppMessage | null {
    // Remove invisible Unicode characters and leading/trailing whitespace
    const cleanLine = line.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
    const match = cleanLine.match(this.MESSAGE_REGEX);
    if (!match) return null;

    const [, dateStr, timeStr, sender, message] = match;
    
    // Ensure all required parts are present
    if (!dateStr || !timeStr || !sender || !message) return null;
    
    // Parse timestamp
    const timestamp = this.parseTimestamp(dateStr, timeStr);
    
    // Check if it's media
    const mediaInfo = this.detectMedia(message);
    
    return {
      timestamp,
      sender: sender.trim(),
      message: message.trim(),
      isMedia: mediaInfo.isMedia,
      mediaType: mediaInfo.mediaType,
    };
  }

  /**
   * Parse multiple lines from a WhatsApp export
   */
  static parseChat(text: string): WhatsAppMessage[] {
    const lines = text.split('\n').filter(line => line.trim());
    const messages: WhatsAppMessage[] = [];

    for (const line of lines) {
      const message = this.parseMessage(line);
      if (message) {
        messages.push(message);
      }
    }

    return messages;
  }

  /**
   * Parse timestamp from date and time strings
   */
  private static parseTimestamp(dateStr: string, timeStr: string): Date {
    // Handle different date formats (MM/DD/YY or MM/DD/YYYY)
    const [month, day, year] = dateStr.split('/');
    if (!month || !day || !year) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    
    const fullYear = year.length === 2 ? `20${year}` : year;
    
    // Parse time (e.g., "6:27:05 PM")
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/);
    if (!timeMatch) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }

    const [, hours, minutes, seconds, period] = timeMatch;
    if (!hours || !minutes || !seconds || !period) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }
    
    let hour = parseInt(hours);
    
    // Convert to 24-hour format
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return new Date(
      parseInt(fullYear),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      hour,
      parseInt(minutes),
      parseInt(seconds)
    );
  }

  /**
   * Detect if message contains media and what type
   */
  private static detectMedia(message: string): { isMedia: boolean; mediaType?: 'image' | 'sticker' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'unknown' } {
    for (const [type, pattern] of Object.entries(this.MEDIA_PATTERNS)) {
      if (pattern.test(message)) {
        return { isMedia: true, mediaType: type as 'image' | 'sticker' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'unknown' };
      }
    }
    
    return { isMedia: false };
  }

  /**
   * Get statistics from parsed messages
   */
  static getStats(messages: WhatsAppMessage[]) {
    const stats: {
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
    } = {
      totalMessages: messages.length,
      participants: new Set<string>(),
      mediaCount: 0,
      mediaTypes: {},
      messageCounts: {},
      averageResponseTime: 0,
      firstMessage: null,
      lastMessage: null,
      mediaBySender: {},
      averageResponseTimeBySender: {},
      messageTimelineBySender: {},
      initiatorCounts: {},
      averageMessageLengthBySender: {},
    };

    let totalResponseTime = 0;
    let responseCount = 0;
    const responseTimeBySender: Record<string, number> = {};
    const responseCountBySender: Record<string, number> = {};
    const messageLengthSumBySender: Record<string, number> = {};
    const messageLengthCountBySender: Record<string, number> = {};

    // Initiator logic: a message is an initiation if it's after a gap of 4+ hours
    const INITIATION_GAP_MS = 1000 * 60 * 60 * 4;
    let lastTimestamp: Date | null = null;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message) continue;
      stats.participants.add(message.sender);
      stats.messageCounts[message.sender] = (stats.messageCounts[message.sender] || 0) + 1;

      // Initiator logic
      if (
        i === 0 ||
        (lastTimestamp && message.timestamp.getTime() - lastTimestamp.getTime() > INITIATION_GAP_MS)
      ) {
        stats.initiatorCounts[message.sender] = (stats.initiatorCounts[message.sender] || 0) + 1;
      }
      lastTimestamp = message.timestamp;

      // Timeline aggregation by month
      const monthKey = `${message.timestamp.getFullYear()}-${String(message.timestamp.getMonth() + 1).padStart(2, '0')}`;
      if (!stats.messageTimelineBySender[message.sender]) {
        stats.messageTimelineBySender[message.sender] = {};
      }
      const timeline = stats.messageTimelineBySender[message.sender] ?? {};
      timeline[monthKey] = (timeline[monthKey] ?? 0) + 1;
      stats.messageTimelineBySender[message.sender] = timeline;

      if (message.isMedia) {
        stats.mediaCount++;
        const type = message.mediaType || 'unknown';
        stats.mediaTypes[type] = (stats.mediaTypes[type] || 0) + 1;
        stats.mediaBySender[message.sender] = (stats.mediaBySender[message.sender] || 0) + 1;
      }

      // Average message length (exclude media-only messages)
      if (!message.isMedia && message.message.trim().length > 0) {
        // Count words instead of chars
        const wordCount = message.message.trim().split(/\s+/).length;
        messageLengthSumBySender[message.sender] = (messageLengthSumBySender[message.sender] || 0) + wordCount;
        messageLengthCountBySender[message.sender] = (messageLengthCountBySender[message.sender] || 0) + 1;
      }

      // Response time calculation
      if (i > 0) {
        const prevMessage = messages[i - 1];
        if (prevMessage && prevMessage.sender !== message.sender) {
          const responseTime = message.timestamp.getTime() - prevMessage.timestamp.getTime();
          totalResponseTime += responseTime;
          responseCount++;
          responseTimeBySender[message.sender] = (responseTimeBySender[message.sender] || 0) + responseTime;
          responseCountBySender[message.sender] = (responseCountBySender[message.sender] || 0) + 1;
        }
      }

      // First and last message
      if (!stats.firstMessage || message.timestamp < stats.firstMessage) {
        stats.firstMessage = message.timestamp;
      }
      if (!stats.lastMessage || message.timestamp > stats.lastMessage) {
        stats.lastMessage = message.timestamp;
      }
    }

    stats.averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    for (const sender of Object.keys(responseTimeBySender)) {
      const count = responseCountBySender[sender] ?? 0;
      const total = responseTimeBySender[sender] ?? 0;
      stats.averageResponseTimeBySender[sender] = count > 0 ? total / count : 0;
    }
    for (const sender of Object.keys(messageLengthSumBySender)) {
      const count = messageLengthCountBySender[sender] ?? 0;
      const total = messageLengthSumBySender[sender] ?? 0;
      stats.averageMessageLengthBySender[sender] = count > 0 ? total / count : 0;
    }
    stats.participants = new Set(Array.from(stats.participants));

    return stats;
  }
}

/**
 * Calculate playful ghosting risk scores for both users in a two-person chat.
 * Returns { [user]: { score, label, reasons } }
 */
export function calculateGhostingRiskForBoth(messages: WhatsAppMessage[], stats: ReturnType<typeof WhatsAppParser.getStats>): Record<string, { score: number, label: string, reasons: string[] }> {
  if (!messages.length || Object.keys(stats.messageCounts).length < 2) {
    return {};
  }
  const participants = Object.keys(stats.messageCounts);
  const userA = participants[0] ?? 'User A';
  const userB = participants[1] ?? 'User B';
  const msInDay = 1000 * 60 * 60 * 24;

  // Defensive: ensure last message exists
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) {
    return {};
  }
  const lastMsgTime = lastMsg.timestamp.getTime();
  const twoMonthsAgo = new Date(lastMsgTime - msInDay * 60);

  function hasValidTimestamp(m: WhatsAppMessage): m is WhatsAppMessage & { timestamp: Date } {
    return !!m.timestamp && m.timestamp instanceof Date && !isNaN(m.timestamp.getTime());
  }

  const recentMessages = messages
    .filter(hasValidTimestamp)
    .filter(m => m.timestamp >= twoMonthsAgo && m.timestamp <= lastMsg.timestamp);

  if (recentMessages.length === 0) {
    return {};
  }

  function calcRisk(forUser: string, fromUser: string): { score: number, label: string, reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    // 1. Being left on read frequently
    let leftOnReadCount = 0;
    let sentCount = 0;
    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      if (!msg) continue;
      if (msg.sender === forUser) {
        sentCount++;
        // Check if next message is from fromUser (i.e., replied)
        let replied = false;
        for (let j = i + 1; j < recentMessages.length; j++) {
          const nextMsg = recentMessages[j];
          if (!nextMsg) continue;
          if (nextMsg.sender === fromUser) {
            replied = true;
            break;
          } else if (nextMsg.sender === forUser) {
            break;
          }
        }
        if (!replied) leftOnReadCount++;
      }
    }
    // Patch: If fromUser sent zero messages in the window, and forUser sent > 0, all forUser's messages are left on read
    const forUserMsgCount = recentMessages.filter(m => m.sender === forUser).length;
    const fromUserMsgCount = recentMessages.filter(m => m.sender === fromUser).length;
    if (fromUserMsgCount === 0 && forUserMsgCount > 0) {
      leftOnReadCount = forUserMsgCount;
      sentCount = forUserMsgCount;
    }
    const leftOnReadFreq = sentCount > 0 ? leftOnReadCount / sentCount : 0;
    if (leftOnReadFreq > 0.33 && sentCount > 2) {
      score += 40;
      reasons.push(`You were left on read ${Math.round(leftOnReadFreq * 100)}% of the time in the last 2 months`);
    } else if (leftOnReadFreq > 0.15 && sentCount > 2) {
      score += 20;
      reasons.push(`You were left on read ${Math.round(leftOnReadFreq * 100)}% of the time in the last 2 months`);
    }
    // 2. Lower response time
    const forUserAvg = stats.averageResponseTimeBySender[forUser] || 0;
    const fromUserAvg = stats.averageResponseTimeBySender[fromUser] || 0;
    if (forUserAvg > 0 && fromUserAvg > 0 && forUserAvg < fromUserAvg * 0.7) {
      score += 20;
      reasons.push(`You reply much faster than ${fromUser}`);
    }
    // 3. Sends more messages
    if (forUserMsgCount > 2 * fromUserMsgCount && fromUserMsgCount > 0) {
      score += 10;
      reasons.push(`You sent a lot more messages than ${fromUser} in the last 2 months`);
    }
    // 4. Shares more media
    const forUserMediaCount = recentMessages.filter(m => m.sender === forUser && m.isMedia).length;
    const fromUserMediaCount = recentMessages.filter(m => m.sender === fromUser && m.isMedia).length;
    if (forUserMediaCount > 2 * fromUserMediaCount && fromUserMediaCount > 0) {
      score += 10;
      reasons.push(`You shared a lot more media than ${fromUser} in the last 2 months`);
    }
    // Clamp score and label
    if (score > 100) score = 100;
    let label = 'Low';
    if (score > 60) label = 'High';
    else if (score > 30) label = 'Medium';
    return { score, label, reasons };
  }

  const result: Record<string, { score: number, label: string, reasons: string[] }> = {};
  result[userA] = calcRisk(userA, userB);
  result[userB] = calcRisk(userB, userA);
  return result;
} 