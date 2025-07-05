// Simple test script to verify WhatsApp parser

// Sample chat content from your file
const chatContent = `[16/6/25, 12:51:53] Mudassir Mahmood: ‎Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.
[16/6/25, 12:51:53] Mudassir Mahmood: ‎Mudassir is a contact.
[16/6/25, 12:51:53] Mudassir Mahmood: Hey Eva,

Hope you are doing well!

Tarun (Arcta) shared your contact with me saying that you are working on a project that makes legal work for creatives in the AI Age easier..
[16/6/25, 12:52:35] Mudassir Mahmood: I just saw your LinkedIn and also LagientAI's concept — it looks great
[16/6/25, 12:53:28] Mudassir Mahmood: and I was thinking if we can connect for a potential collab - as I am building an End-to-End AI solution for creatives to and believe your expertise can help our ideas grow into something bigger
[16/6/25, 12:53:57] Mudassir Mahmood: Hoping to hear from you.. 

Best,
Mudassir
[16/6/25, 16:33:42] Eva F: Hi Mudassir, 

Thanks for reaching out and nice to meet you. I'd love to connect with you to talk about a potential collab. Are you free on Thursday between 12pm- 3pm? 

Best, 
Eva`;

console.log('Testing WhatsApp parser with sample chat...');
console.log('Chat content:');
console.log(chatContent);
console.log('\n--- End of chat content ---\n');

// Test the regex patterns
const MESSAGE_REGEX_24H = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}:\d{2})\]\s+(.+?):\s+(.+)$/;
const MESSAGE_REGEX_12H = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\]\s+(.+?):\s+(.+)$/;

const lines = chatContent.split('\n');
console.log('Testing each line:');
lines.forEach((line, index) => {
  const cleanLine = line.trim();
  if (!cleanLine) return;
  
  let match = cleanLine.match(MESSAGE_REGEX_24H);
  let format = '24H';
  
  if (!match) {
    match = cleanLine.match(MESSAGE_REGEX_12H);
    format = '12H';
  }
  
  if (match) {
    const [, dateStr, timeStr, sender, message] = match;
    console.log(`Line ${index + 1} (${format}): ${sender} - "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
  } else {
    console.log(`Line ${index + 1}: No match (continuation line)`);
  }
}); 