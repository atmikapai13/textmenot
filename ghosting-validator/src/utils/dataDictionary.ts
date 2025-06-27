// Data Dictionary for WhatsApp Chat Metrics
// ----------------------------------------

// --- Facts & Figures ---
export const factsAndFiguresDictionary = {
  totalMessages: {
    label: 'Messages Exchanged',
    definition: 'Total number of messages exchanged in the chat.',
    formula: 'Count of all messages.'
  },
  totalMedia: {
    label: 'Media Shared',
    definition: 'Total number of media messages (images, videos, stickers, etc.) shared in the chat.',
    formula: 'Count of messages where isMedia is true.'
  },
  totalEmojis: {
    label: 'Emoji Abused',
    definition: 'Total number of emoji characters used across all messages.',
    formula: 'Sum of all emoji characters in all messages.'
  },
  daysSpanned: {
    label: 'Days of Correspondence',
    definition: 'Number of calendar days from the first to the last message (inclusive).',
    formula: '1 + (lastMessage.date - firstMessage.date) in days.'
  },
  mostActiveDay: {
    label: 'Most Active Day',
    definition: 'The date with the highest number of messages sent.',
    formula: 'Date with the maximum message count.'
  },
  longestSilence: {
    label: 'Longest Silence',
    definition: 'The longest time gap between any two consecutive messages.',
    formula: 'Maximum time difference between consecutive messages, formatted as X days, Y hrs.'
  }
};

// --- Key Performance Indicators (KPIs) ---
export const kpiDictionary = {
  initiatorRatio: {
    label: 'Initiator Ratio',
    definition: 'The percentage of conversation initiations started by the participant (after a 48+ hour gap).',
    formula: 'Initiator Ratio = (initiations by participant) / (total initiations) × 100'
  },
  avgResponseTime: {
    label: 'Avg. Response Time',
    definition: 'The average time it takes for the participant to respond to the other participant\'s message.',
    formula: 'Avg Response Time = (sum of response times for participant) / (number of responses by participant)'
  },
  avgMessageLength: {
    label: 'Avg. Message Length',
    definition: 'The average number of words per non-media message sent by the participant.',
    formula: 'Avg Message Length = (total words sent by participant) / (number of non-media messages sent by participant)'
  },
  doubleTexts: {
    label: 'Double-texts',
    definition: 'The number of times the participant sends a message, waits 24+ hours without a reply, and then sends another message before the other participant replies.',
    formula: 'Count of double-text streaks by participant.'
  },
  percentPunctuationUsed: {
    label: '% Punctuation Used',
    definition: 'The percentage of messages sent by the participant that contain at least one punctuation mark.',
    formula: '% Punctuation Used = (messages with punctuation) / (total messages sent) × 100'
  },
  percentEmojiUsed: {
    label: '% Emoji Used',
    definition: 'The percentage of messages sent by the participant that contain at least one emoji.',
    formula: '% Emoji Used = (messages with emoji) / (total messages sent) × 100'
  }
}; 