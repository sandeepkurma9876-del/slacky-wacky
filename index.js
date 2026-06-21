const { App } = require('@slack/bolt');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Initializes your app with your credentials
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,       // Your xoxb- token
  signingSecret: process.env.SLACK_SIGNING_SECRET, // Your Signing Secret
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN     // Your xapp- token
});

/**
 * 1. Command: /ask-groq
 * Description: Forwards a user's question to the Groq API and returns the answer.
 */
app.command('/ask-groq', async ({ command, ack, say }) => {
  // Acknowledge the command request immediately back to Slack
  await ack();

  const userQuestion = command.text;

  if (!userQuestion) {
    await say(`Hey <@${command.user_id}>, please provide a question! Example: \`/ask-groq What is JavaScript?\``);
    return;
  }

  try {
    // Notify the user that the bot is processing
    await say(`_Thinking... Let me ask Groq about: "${userQuestion}"_`);

    // Make the request to the Groq API
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile', // You can change this to your preferred Groq model
        messages: [
          {
            role: 'user',
            content: userQuestion
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const groqAnswer = response.data.choices[0].message.content;

    // Send the answer back to the Slack channel
    await say({
      text: `*Answer for <@${command.user_id}>:*\n${groqAnswer}`,
      mrkdwn: true
    });

  } catch (error) {
    console.error('Groq API Error:', error.response ? error.response.data : error.message);
    await say(`Sorry <@${command.user_id}>, I encountered an error communicating with Groq.`);
  }
});

/**
 * 2. Command: /bot-status
 * Description: Simple health check command to see if the server code is alive.
 */
app.command('/bot-status', async ({ command, ack, say }) => {
  await ack();
  await say(`🟢 *Status Update:* \`slacky-wacky\` is online, connected via Socket Mode, and running smoothly!`);
});

/**
 * 3. Command: /bot-help
 * Description: Lists available commands and usage hints.
 */
app.command('/bot-help', async ({ command, ack, say }) => {
  await ack();
  const helpMessage = `
*Available Commands for \`slacky-wacky\`:*
• \`/ask-groq [your question]\` - Sends your question to the Groq AI model and replies with the response.
• \`/bot-status\` - Checks if the bot application server is responsive.
• \`/bot-help\` - Displays this help message.
  `;
  await say(helpMessage);
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡ Bolt app is running in Socket Mode!');
})();
