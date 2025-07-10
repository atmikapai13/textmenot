import JSZip from 'jszip';
import type { JSZipObject } from 'jszip';

export interface WhatsAppMessage {
  timestamp: Date;
  sender: string;
  message: string;
  isMedia: boolean;
  mediaType?: 'image' | 'sticker' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'unknown';
}

export class WhatsAppParser {
  // Regex for both date orders, 2/4 digit year, 24h/12h time, always / separator
  private static readonly MESSAGE_REGEX = /^[\u200e\u200f\u202a-\u202e]?\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?\]\s+(.+?):\s+([\s\S]+)$/;
  private static readonly SYSTEM_MESSAGE_REGEX = /end-to-end encrypted|Messages and calls are end-to-end encrypted/i;
  private static readonly MESSAGE_REGEX_24H_US = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}:\d{2})\]\s+(.+?):\s+(.+)$/;
  private static readonly MESSAGE_REGEX_12H_US = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\]\s+(.+?):\s+(.+)$/;
  private static readonly MESSAGE_REGEX_24H_EU = /^\[(\d{1,2}-(\d{1,2})-(\d{2,4})),?\s+(\d{1,2}:\d{2}:\d{2})\]\s+(.+?):\s+(.+)$/;
  private static readonly MESSAGE_REGEX_12H_EU = /^\[(\d{1,2}-(\d{1,2})-(\d{2,4})),?\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\]\s+(.+?):\s+(.+)$/;
  private static readonly MESSAGE_REGEX_24H_EU_SLASH = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}:\d{2})\]\s+(.+?):\s+(.+)$/;
  private static readonly MESSAGE_REGEX_12H_EU_SLASH = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\]\s+(.+?):\s+(.+)$/;
  private static readonly MEDIA_PATTERNS = {
    image: /‎?image omitted/i,
    sticker: /‎?sticker omitted/i,
    gif: /‎?gif omitted/i,
    video: /‎?video omitted/i,
    audio: /‎?audio omitted/i,
    document: /‎?document omitted/i,
    location: /‎?location omitted/i,
    contact: /‎?contact omitted/i,
    // Add more as needed
  };

  /**
   * Parse a single WhatsApp message line
   */
  static parseMessage(line: string): WhatsAppMessage | null {
    // Remove invisible Unicode characters and leading/trailing whitespace
    const cleanLine = line.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
    
    // Try all regexes and pick the one that matches and deduce date order
    let match, dateOrder: 'US' | 'EU' = 'US', is24Hour = true;
    // Try US-style first
    match = cleanLine.match(this.MESSAGE_REGEX_24H_US);
    if (match) { is24Hour = true; dateOrder = 'US'; }
    else {
      match = cleanLine.match(this.MESSAGE_REGEX_12H_US);
      if (match) { is24Hour = false; dateOrder = 'US'; }
    }
    // Try EU-style (with dash or slash)
    if (!match) {
      match = cleanLine.match(this.MESSAGE_REGEX_24H_EU);
      if (match) { is24Hour = true; dateOrder = 'EU'; }
    }
    if (!match) {
      match = cleanLine.match(this.MESSAGE_REGEX_12H_EU);
      if (match) { is24Hour = false; dateOrder = 'EU'; }
    }
    if (!match) {
      match = cleanLine.match(this.MESSAGE_REGEX_24H_EU_SLASH);
      if (match) { is24Hour = true; dateOrder = 'EU'; }
    }
    if (!match) {
      match = cleanLine.match(this.MESSAGE_REGEX_12H_EU_SLASH);
      if (match) { is24Hour = false; dateOrder = 'EU'; }
    }
    if (!match) return null;

    // For all regexes, the first three groups are date, time, sender, message
    let [, dateStr, timeStr, sender, message] = match;
    // For dash-based EU regex, adjust indices
    if (match.length > 5) {
      dateStr = `${match[1]}`;
      timeStr = match[4];
      sender = match[5];
      message = match[6];
    }
    // Ensure all required parts are present
    if (!dateStr || !timeStr || !sender || !message) return null;
    // Parse timestamp
    const timestamp = this.parseTimestamp(dateStr, timeStr, is24Hour, dateOrder);
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
    const lines = text.split('\n');
    const messages: WhatsAppMessage[] = [];
    let currentMessage: WhatsAppMessage | null = null;
    let currentMessageText: string[] = [];
    let dateOrder: 'US' | 'EU' | null = null;

    for (const line of lines) {
      const cleanLine = line.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
      if (!cleanLine) continue;
      // Ignore system messages
      if (this.SYSTEM_MESSAGE_REGEX.test(cleanLine)) continue;
      // Try to match message
      const match = cleanLine.match(this.MESSAGE_REGEX);
      if (match) {
        // Auto-detect date order on first valid message
        if (!dateOrder) {
          const first = parseInt(match[1] || '0', 10);
          // If first > 12, it's day-first (EU), else month-first (US)
          dateOrder = first > 12 ? 'EU' : 'US';
        }
        // Save previous message if exists
        if (currentMessage && currentMessageText.length > 0) {
          currentMessage.message = currentMessageText.join('\n').trim();
          messages.push(currentMessage);
        }
        // Parse date/time
        const d1 = match[1] || '1', d2 = match[2] || '1', year = match[3] || '2000';
        const hour = match[4] || '0', minute = match[5] || '0', second = match[6] || '0';
        const ampm = match[7];
        const sender = match[8] || '';
        const messageText = match[9] || '';
        let month, day;
        if (dateOrder === 'EU') {
          day = d1; month = d2;
        } else {
          month = d1; day = d2;
        }
        const fullYear = year.length === 2 ? `20${year}` : year;
        let h = parseInt(hour, 10);
        if (ampm) {
          if (ampm === 'PM' && h !== 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
        }
        const timestamp = new Date(
          parseInt(fullYear, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          h,
          parseInt(minute, 10),
          parseInt(second, 10)
        );
        const mediaInfo = this.detectMedia(messageText);
        currentMessage = {
          timestamp,
          sender: sender.trim(),
          message: messageText.trim(),
          isMedia: mediaInfo.isMedia,
          mediaType: mediaInfo.mediaType,
        };
        currentMessageText = [messageText.trim()];
      } else if (currentMessage) {
        // This is a continuation of the current message
        currentMessageText.push(cleanLine);
      }
    }
    // Don't forget the last message
    if (currentMessage && currentMessageText.length > 0) {
      currentMessage.message = currentMessageText.join('\n').trim();
      messages.push(currentMessage);
    }
    return messages;
  }

  /**
   * Parse timestamp from date and time strings
   */
  private static parseTimestamp(dateStr: string, timeStr: string, is24Hour: boolean = true, dateOrder: 'US' | 'EU' = 'US'): Date {
    // Handle different date formats (MM/DD/YY or DD/MM/YY or YYYY)
    let month: string = '', day: string = '', year: string = '';
    if (dateOrder === 'US') {
      const parts = dateStr.split(/[\/\-]/);
      month = parts[0] || '';
      day = parts[1] || '';
      year = parts[2] || '';
    } else {
      const parts = dateStr.split(/[\/\-]/);
      day = parts[0] || '';
      month = parts[1] || '';
      year = parts[2] || '';
    }
    if (!month || !day || !year) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    const fullYear = year.length === 2 ? `20${year}` : year;
    let hour = 0, minute = 0, second = 0;
    if (is24Hour) {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})/);
      if (!timeMatch) {
        throw new Error(`Invalid time format: ${timeStr}`);
      }
      const hours = timeMatch[1] || '0';
      const minutes = timeMatch[2] || '0';
      const seconds = timeMatch[3] || '0';
      hour = parseInt(hours);
      minute = parseInt(minutes);
      second = parseInt(seconds);
    } else {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/);
      if (!timeMatch) {
        throw new Error(`Invalid time format: ${timeStr}`);
      }
      const hours = timeMatch[1] || '0';
      const minutes = timeMatch[2] || '0';
      const seconds = timeMatch[3] || '0';
      const period = timeMatch[4] || 'AM';
      hour = parseInt(hours);
      minute = parseInt(minutes);
      second = parseInt(seconds);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
    }
    return new Date(
      parseInt(fullYear),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      hour,
      minute,
      second
    );
  }

  /**
   * Detect if message contains media and what type
   */
  private static detectMedia(message: string): { isMedia: boolean; mediaType?: 'image' | 'sticker' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'unknown' } {
    // Split the message into lines and check each line
    const lines = message.split('\n');
    for (const line of lines) {
      for (const [type, pattern] of Object.entries(this.MEDIA_PATTERNS)) {
        if (pattern.test(line)) {
          return { isMedia: true, mediaType: type as 'image' | 'sticker' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'unknown' };
        }
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
          const responseTime = (message.timestamp?.getTime?.() ?? 0) - (prevMessage.timestamp?.getTime?.() ?? 0);
          totalResponseTime += responseTime;
          responseCount++;
          responseTimeBySender[message.sender] = (responseTimeBySender[message.sender] ?? 0) + responseTime;
          responseCountBySender[message.sender] = (responseCountBySender[message.sender] ?? 0) + 1;
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
 * Count all emoji in the chat messages
 */
export function countAllEmoji(messages: WhatsAppMessage[]): number {
  // Unicode emoji regex (covers most emoji)
  const emojiRegex = /[\p{Emoji}]/gu;
  let count = 0;
  for (const msg of messages) {
    if (msg.message) {
      const matches = msg.message.match(emojiRegex);
      if (matches) count += matches.length;
    }
  }
  return count;
}

/**
 * Returns the Facts & Figures metrics for a WhatsApp chat transcript.
 */
export function getFactsAndFigures(messages: WhatsAppMessage[]) {
  if (!messages.length) {
    return {
      totalMessages: 0,
      totalMedia: 0,
      totalEmojis: 0,
      daysAndHoursSpanned: '-',
      mostActiveDay: null,
      longestSilence: null,
      participants: [],
      firstDate: null,
      lastDate: null,
    };
  }

  // 1. Total messages exchanged
  const totalMessages = messages.length;

  // 2. Total media shared
  const totalMedia = messages.filter(m => m.isMedia).length;

  // 3. Total emojis used
  const emojiRegex = /[\p{Emoji}]/gu;
  let totalEmojis = 0;
  for (const msg of messages) {
    if (msg.message) {
      const matches = msg.message.match(emojiRegex);
      if (matches) totalEmojis += matches.length;
    }
  }

  // 4. Number of days spanning chat transcript (inclusive, calendar days)
  const sortedMessages = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  let daysAndHoursSpanned = '-';
  let firstDate: Date | null = null;
  let lastDate: Date | null = null;
  if (
    sortedMessages.length > 0 &&
    sortedMessages[0]?.timestamp !== undefined &&
    sortedMessages[sortedMessages.length - 1]?.timestamp !== undefined
  ) {
    const firstTimestamp = sortedMessages[0]?.timestamp;
    const lastTimestamp = sortedMessages[sortedMessages.length - 1]?.timestamp;
    if (firstTimestamp && lastTimestamp) {
      const msDiff = new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime();
      const days = Math.floor(msDiff / (1000 * 60 * 60 * 24)) + 1;
      if (days >= 1) {
        daysAndHoursSpanned = `${days} days`;
      } else {
        const hours = Math.floor(msDiff / (1000 * 60 * 60));
        daysAndHoursSpanned = `${hours} hrs`;
      }
      firstDate = firstTimestamp;
      lastDate = lastTimestamp;
    }
  }

  // 5. Date of the most correspondence/chats (formatted as 'Mon DD, YYYY')
  const messagesByDay: Record<string, number> = {};
  for (const msg of messages) {
    if (!msg.timestamp) continue;
    const dayKey = msg.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    messagesByDay[dayKey] = (messagesByDay[dayKey] || 0) + 1;
  }
  let mostActiveDay: string | null = null;
  let maxCount = 0;
  for (const [day, count] of Object.entries(messagesByDay)) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveDay = day;
    }
  }
  if (!mostActiveDay) mostActiveDay = null;

  // 6. Longest time lapse with no conversation (X days, Y hrs)
  let longestSilenceMs = 0;
  for (let i = 1; i < sortedMessages.length; i++) {
    const prev = sortedMessages[i-1];
    const curr = sortedMessages[i];
    if (!prev?.timestamp || !curr?.timestamp) continue;
    const gap = curr.timestamp.getTime() - prev.timestamp.getTime();
    if (gap > longestSilenceMs) longestSilenceMs = gap;
  }
  // Convert ms to X days, Y hrs
  const days = Math.floor(longestSilenceMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((longestSilenceMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const longestSilence = `${days} days, ${hours} hrs`;

  // Get participants as array
  const participants = Array.from(new Set(messages.map(m => m.sender)));

  let dateRange = '-';
  if (firstDate && lastDate) {
    const first = new Date(firstDate);
    const last = new Date(lastDate);
    const firstStr = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const lastStr = last.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    dateRange = `${firstStr} — ${lastStr}`;
  }

  return {
    totalMessages,
    totalMedia,
    totalEmojis,
    daysAndHoursSpanned,
    mostActiveDay,
    longestSilence,
    participants: Array.from(participants),
    firstDate,
    lastDate,
    dateRange,
  };
}

/**
 * Returns Key Performance Indicators (KPIs) for each participant in a 1:1 chat.
 */
export function getKPIs(messages: WhatsAppMessage[]) {
  if (!messages.length) return {};
  // Get participants
  const participants = Array.from(new Set(messages.map(m => m.sender)));
  if (participants.length !== 2) return {};
  const userA = String(participants[0]);
  const userB = String(participants[1]);
  const users = [userA, userB];

  // 1. Initiator Ratio (48+ hour gap)
  const INITIATION_GAP_MS = 1000 * 60 * 60 * 48;
  let initiatorCounts: Record<string, number> = { [userA]: 0, [userB]: 0 };
  let lastTimestamp: Date | null = null;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg) continue;
    if (
      i === 0 ||
      (lastTimestamp && msg.timestamp.getTime() - lastTimestamp.getTime() >= INITIATION_GAP_MS)
    ) {
      initiatorCounts[msg.sender] = (initiatorCounts[msg.sender] || 0) + 1;
    }
    lastTimestamp = msg.timestamp;
  }
  const totalInitiations = (initiatorCounts[userA] ?? 0) + (initiatorCounts[userB] ?? 0);
  const initiatorRatio: Record<string, number> = {
    [userA]: totalInitiations > 0 ? ((initiatorCounts[userA] ?? 0) / totalInitiations) * 100 : 0,
    [userB]: totalInitiations > 0 ? ((initiatorCounts[userB] ?? 0) / totalInitiations) * 100 : 0,
  };

  // 2. Avg. Response Time
  let responseTimeBySender: Record<string, number> = { [userA]: 0, [userB]: 0 };
  let responseCountBySender: Record<string, number> = { [userA]: 0, [userB]: 0 };
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (!prev || !curr || !prev.sender || !curr.sender) continue;
    if (prev.sender !== curr.sender) {
      const responseTime = (curr.timestamp?.getTime?.() ?? 0) - (prev.timestamp?.getTime?.() ?? 0);
      responseTimeBySender[curr.sender] = (responseTimeBySender[curr.sender] ?? 0) + responseTime;
      responseCountBySender[curr.sender] = (responseCountBySender[curr.sender] ?? 0) + 1;
    }
  }
  const avgResponseTime: Record<string, number> = {
    [userA]: (responseCountBySender[userA] ?? 0) > 0 ? (responseTimeBySender[userA] ?? 0) / (responseCountBySender[userA] ?? 1) : 0,
    [userB]: (responseCountBySender[userB] ?? 0) > 0 ? (responseTimeBySender[userB] ?? 0) / (responseCountBySender[userB] ?? 1) : 0,
  };

  // 3. Avg. Message Length (words, non-media)
  let wordSum: Record<string, number> = { [userA]: 0, [userB]: 0 };
  let wordCount: Record<string, number> = { [userA]: 0, [userB]: 0 };
  for (const msg of messages) {
    if (!msg.sender || !(msg.sender in wordSum) || !(msg.sender in wordCount)) continue;
    if (!msg.isMedia && msg.message.trim().length > 0) {
      const wc = msg.message?.trim?.().split(/\s+/).length ?? 0;
      wordSum[msg.sender] = (wordSum[msg.sender] ?? 0) + wc;
      wordCount[msg.sender] = (wordCount[msg.sender] ?? 0) + 1;
    }
  }
  const avgMessageLength: Record<string, number> = {
    [userA]: (wordCount[userA] ?? 0) > 0 ? (wordSum[userA] ?? 0) / (wordCount[userA] ?? 1) : 0,
    [userB]: (wordCount[userB] ?? 0) > 0 ? (wordSum[userB] ?? 0) / (wordCount[userB] ?? 1) : 0,
  };

  // 4. Double-texts (count, 24+ hour gap, per streak)
  const DOUBLE_TEXT_GAP_MS = 1000 * 60 * 60 * 24;
  let doubleTexts: Record<string, number> = { [userA]: 0, [userB]: 0 };
  for (const user of users) {
    let i = 0;
    while (i < messages.length) {
      if (messages[i]?.sender === user) {
        let streakStart = i;
        let streakEnd = i;
        // Find end of streak
        while (
          streakEnd + 1 < messages.length &&
          messages[streakEnd + 1]?.sender === user
        ) {
          streakEnd++;
        }
        // Check for double-text: if previous message is from other user and gap >= 24h
        const currMsg = messages[streakStart];
        const prevMsg = streakStart > 0 ? messages[streakStart - 1] : undefined;
        if (
          streakStart > 0 &&
          currMsg && prevMsg &&
          prevMsg.sender !== user &&
          (currMsg.timestamp?.getTime?.() ?? 0) - (prevMsg.timestamp?.getTime?.() ?? 0) >= DOUBLE_TEXT_GAP_MS
        ) {
          doubleTexts[user] = (doubleTexts[user] ?? 0) + 1;
        }
        i = streakEnd + 1;
      } else {
        i++;
      }
    }
  }

  // 6. % Punctuation Used (per message)
  const punctuationRegex = /[.,!?;:]/;
  let punctCount: Record<string, number> = { [userA]: 0, [userB]: 0 };
  let msgCount: Record<string, number> = { [userA]: 0, [userB]: 0 };
  for (const msg of messages) {
    if (!msg.sender || !(msg.sender in msgCount)) continue;
    msgCount[msg.sender] = (msgCount[msg.sender] ?? 0) + 1;
    if (punctuationRegex.test(msg.message ?? '')) {
      punctCount[msg.sender] = (punctCount[msg.sender] ?? 0) + 1;
    }
  }
  const percentPunctuationUsed: Record<string, number> = {
    [userA]: (msgCount[userA] ?? 0) > 0 ? ((punctCount[userA] ?? 0) / (msgCount[userA] ?? 1)) * 100 : 0,
    [userB]: (msgCount[userB] ?? 0) > 0 ? ((punctCount[userB] ?? 0) / (msgCount[userB] ?? 1)) * 100 : 0,
  };

  // 7. % Emoji Used (per message)
  const emojiRegex = /[\p{Emoji}]/gu;
  let emojiMsgCount: Record<string, number> = { [userA]: 0, [userB]: 0 };
  for (const msg of messages) {
    if (!msg.sender || !(msg.sender in emojiMsgCount)) continue;
    if (emojiRegex.test(msg.message ?? '')) {
      emojiMsgCount[msg.sender] = (emojiMsgCount[msg.sender] ?? 0) + 1;
    }
  }
  const percentEmojiUsed: Record<string, number> = {
    [userA]: (msgCount[userA] ?? 0) > 0 ? ((emojiMsgCount[userA] ?? 0) / (msgCount[userA] ?? 1)) * 100 : 0,
    [userB]: (msgCount[userB] ?? 0) > 0 ? ((emojiMsgCount[userB] ?? 0) / (msgCount[userB] ?? 1)) * 100 : 0,
  };

  // Compose result
  const result: Record<string, any> = {};
  for (const user of users) {
    result[user] = {
      initiatorRatio: initiatorRatio[user],
      avgResponseTime: avgResponseTime[user],
      avgMessageLength: avgMessageLength[user],
      doubleTexts: doubleTexts[user],
      percentPunctuationUsed: percentPunctuationUsed[user],
      percentEmojiUsed: percentEmojiUsed[user],
    };
  }
  return result;
}

/**
 * Returns data for a 100% stacked bar chart of messages sent by each user by period (6 bars, snapped to calendar months/weeks/days).
 */
export function getStackedBarData(messages: WhatsAppMessage[], facts: any) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) return [];
  if (!facts || !Array.isArray(facts.participants) || facts.participants.length !== 2) return [];
  const [userA, userB] = facts.participants;
  // Get first and last date
  const sorted = [...messages].sort((a, b) => (a && b && a.timestamp && b.timestamp ? a.timestamp.getTime() - b.timestamp.getTime() : 0));
  if (!sorted[0]?.timestamp || !sorted[sorted.length - 1]?.timestamp) return [];
  const firstDate = sorted[0]?.timestamp ?? new Date();
  const lastDate = sorted[sorted.length - 1]?.timestamp ?? new Date();
  const msDiff = lastDate.getTime() - firstDate.getTime();
  const totalBins = 6;
  const binSize = msDiff / totalBins;

  // Generate period boundaries and labels
  let periods: { start: Date; end: Date; label: string; daysElapsed: number }[] = [];
  for (let i = 0; i < totalBins; i++) {
    const start = new Date(firstDate.getTime() + i * binSize);
    const end = i === totalBins - 1 ? new Date(lastDate.getTime() + 1) : new Date(firstDate.getTime() + (i + 1) * binSize);
    const daysElapsed = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    // Improved label: if same year, 'May – July 2024', else 'Dec 2024 – Jan 2025'
    const sameYear = start.getFullYear() === end.getFullYear();
    let label = '';
    if (sameYear) {
      const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
      label = `${startMonth} – ${endMonth} ${start.getFullYear()}`;
    } else {
      const startMonthYear = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const endMonthYear = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      label = `${startMonthYear} – ${endMonthYear}`;
    }
    periods.push({ start, end, label, daysElapsed });
  }
  if (!Array.isArray(periods) || periods.length === 0) return [];

  // Bin messages by period
  const data = periods.map(period => {
    if (!period || !period.start || !period.end) return { periodLabel: '', [userA]: 0, [userB]: 0 };
    const start = period.start as Date;
    const end = period.end as Date;
    const msgs = messages.filter(m => m && m.timestamp && m.timestamp >= start && m.timestamp < end && m.sender);
    const countA = msgs.filter(m => m.sender === userA).length;
    const countB = msgs.filter(m => m.sender === userB).length;
    const total = countA + countB;
    return {
      periodLabel: period.label,
      startDate: start,
      endDate: end,
      binDaysElapsed: period.daysElapsed,
      [userA]: total > 0 ? Math.round((countA / total) * 100) : 0,
      [userB]: total > 0 ? Math.round((countB / total) * 100) : 0,
    };
  });
  return data;
}

/**
 * Formats a bin's date range for the tooltip, using the new logic.
 * If days <= 150, show 'Mon D YY – Mon D YY', else show 'Mon – Mon YYYY'.
 */
export function formatBinDateRange(start: Date, end: Date, daysElapsed: number): string {
  if (!start || !end) return '-';
  if (daysElapsed <= 150) {
    // e.g. 'Jul 4 2025 – Jul 6 2025'
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  } else {
    // e.g. 'Jun – Jul 2025'
    const startStr = start.toLocaleDateString('en-US', { month: 'short' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }
}

// Helper to format response time in ms to 'X hr Y min'
export function formatResponseTime(ms: number): string {
  if (typeof ms !== 'number' || isNaN(ms) || ms <= 0) return '-';
  const minutes = Math.round(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}${mins > 0 ? ' ' + mins + ' min' : ''}`;
  return `${mins} min`;
}

// Helper to format percent
export function fmtPct(val: number): string {
  return typeof val === 'number' ? Math.round(val) + '%' : '-';
}

// Helper to format words
export function fmtWords(val: number): string {
  return typeof val === 'number' ? val.toFixed(1) + ' words' : '-';
}

// Helper for int
export function fmtInt(val: number): string {
  return typeof val === 'number' ? Math.round(val).toString() : '-';
}

/**
 * Accepts a File (zip or txt). If zip, extracts the first .txt file and parses it. If txt, parses directly.
 */
export async function parseChatFile(file: File): Promise<WhatsAppMessage[]> {
  let messages: WhatsAppMessage[];
  
  if (file.name.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    // Prefer _chat.txt if present, otherwise any .txt file
    let txtFile: JSZipObject | null | undefined = zip.file('_chat.txt');
    if (!txtFile) {
      txtFile = Object.values(zip.files).find(f => (f as JSZipObject).name.endsWith('.txt')) as JSZipObject | undefined;
    }
    if (!txtFile) throw new Error('No .txt file found in zip');
    console.log('Zip file unzipped. Found txt file:', txtFile.name);
    const text = await txtFile.async('string');
    console.log('Contents of extracted txt file:', text.slice(0, 500)); // log first 500 chars for brevity
    messages = WhatsAppParser.parseChat(text);
  } else if (file.name.endsWith('.txt')) {
    const text = await file.text();
    messages = WhatsAppParser.parseChat(text);
  } else {
    throw new Error('Unsupported file type');
  }

  // Debug logging for media detection
  console.log('Total messages parsed:', messages.length);
  const mediaMessages = messages.filter(m => m.isMedia);
  console.log('Media messages found:', mediaMessages.length);
  console.log('Media messages:', mediaMessages.slice(0, 5).map(m => ({
    sender: m.sender,
    message: m.message,
    mediaType: m.mediaType,
    timestamp: m.timestamp
  })));
  
  // Log some examples of messages that might be media but aren't detected
  const potentialMediaMessages = messages.filter(m => 
    m.message.toLowerCase().includes('omitted') || 
    m.message.toLowerCase().includes('image') ||
    m.message.toLowerCase().includes('gif') ||
    m.message.toLowerCase().includes('sticker')
  ).slice(0, 5);
  console.log('Potential media messages (not detected):', potentialMediaMessages.map(m => ({
    sender: m.sender,
    message: m.message,
    isMedia: m.isMedia,
    mediaType: m.mediaType
  })));

  // Additional debug: show raw message content for potential media messages
  console.log('Raw message content for potential media messages:');
  potentialMediaMessages.forEach((m, i) => {
    console.log(`Message ${i + 1}:`, JSON.stringify(m.message));
    console.log(`Message ${i + 1} (hex):`, Array.from(m.message).map(c => c.charCodeAt(0).toString(16)).join(' '));
  });

  return messages;
}

/**
 * Returns a legend date range string for the graph, based on the total days elapsed.
 * If days <= 150, show 'Mon D – Mon D', else show 'Mon – Mon YYYY'.
 */
export function getGraphLegendDateRange(firstDate: Date | null, lastDate: Date | null, daysElapsed: number): string {
  if (!firstDate || !lastDate) return '-';
  if (daysElapsed <= 150) {
    // e.g. 'Jul 4 – Jul 6'
    const start = firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} – ${end}`;
  } else {
    // e.g. 'Jun – Jul 2025'
    const start = firstDate.toLocaleDateString('en-US', { month: 'short' });
    const end = lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${start} – ${end}`;
  }
} 