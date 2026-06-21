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
 * 1. Command: /slacky-wacky-ask
 * Description: Forwards a user's question to the Groq API and returns the answer.
 */
app.command('/slacky-wacky-ask', async ({ command, ack, respond }) => {
  // Acknowledge the command request immediately back to Slack
  await ack();

  const userQuestion = command.text;

  if (!userQuestion) {
    await respond({ text: `Hey <@${command.user_id}>, please provide a question! Example: \`/slacky-wacky-ask What is JavaScript?\`` });
    return;
  }

  try {
    // Notify the user that the bot is processing
    await respond({ text: `_Thinking... Let me ask Groq about: "${userQuestion}"_` });

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
    await respond({
      text: `*Answer for <@${command.user_id}>:*\n${groqAnswer}`,
      mrkdwn: true
    });

  } catch (error) {
    console.error('Groq API Error:', error.response ? error.response.data : error.message);
    await respond({ text: `Sorry <@${command.user_id}>, I encountered an error communicating with Groq.` });
  }
});

/**
 * 2. Command: /slacky-wacky-status
 * Description: Simple health check command to see if the server code is alive.
 */
app.command('/slacky-wacky-status', async ({ command, ack, respond }) => {
  await ack();
  await respond({ text: `🟢 *Status Update:* \`slacky-wacky\` is online, connected via Socket Mode, and running smoothly!` });
});

/**
 * 3. Command: /slacky-wacky-help
 * Description: Lists available commands and usage hints.
 */
app.command('/slacky-wacky-help', async ({ command, ack, respond }) => {
  await ack();
  const helpMessage = `
*Available Commands for \`slacky-wacky\`:*
• \`/slacky-wacky-ask [your question]\` - Sends your question to the Groq AI model and replies with the response.
• \`/slacky-wacky-status\` - Checks if the bot application server is responsive.
• \`/slacky-wacky-help\` - Displays this help message.
  `;
  await respond({ text: helpMessage });
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡ Bolt app is running in Socket Mode!');
})();
