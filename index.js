const { App } = require('@slack/bolt');
const axios = require('axios');
const dotenv = require('dotenv');
const { startServer, addLog, updateLatency, trackCommand } = require('./server');

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
const db = require('./db');

app.command('/slacky-wacky-ask', async ({ command, ack, respond }) => {
  trackCommand('/slacky-wacky-ask');
  // Acknowledge the command request immediately back to Slack
  await ack();

  const userQuestion = command.text;

  if (!userQuestion) {
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hey <@${command.user_id}>, please provide a question! Example: \`/slacky-wacky-ask What is JavaScript?\``
          }
        }
      ]
    });
    return;
  }

  try {
    // Notify the user that the bot is processing
    await respond({
      blocks: [
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_Thinking... Let me ask Groq about: "${userQuestion}"_`
            }
          ]
        }
      ]
    });

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = userQuestion.match(urlRegex) || [];
    let messageContent = userQuestion;
    let containsImage = false;

    if (urls.length > 0) {
      const imageUrls = urls.filter(url => url.match(/\.(jpeg|jpg|gif|png|webp)$/i));
      if (imageUrls.length > 0) {
        containsImage = true;
        messageContent = [
          { type: "text", text: userQuestion }
        ];
        for (const url of imageUrls) {
          messageContent.push({
            type: "image_url",
            image_url: { url: url }
          });
        }
      }
    }

    const history = db.getHistory(command.user_id, 10);
    const messages = [
      ...history,
      { role: 'user', content: messageContent }
    ];

    // Determine model based on image presence
    const modelToUse = containsImage ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

    // Make the request to the Groq API
    const startTime = Date.now();
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: modelToUse,
        messages: messages
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const latency = Date.now() - startTime;
    updateLatency(latency);
    addLog(`Groq API call took ${latency}ms`);

    const groqAnswer = response.data.choices[0].message.content;

    db.addMessage(command.user_id, 'user', userQuestion);
    db.addMessage(command.user_id, 'assistant', groqAnswer);

    // Send the answer back to the Slack channel
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Answer for <@${command.user_id}>:*`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: groqAnswer
          }
        }
      ]
    });

  } catch (error) {
    console.error('Groq API Error:', error.response ? error.response.data : error.message);
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Sorry <@${command.user_id}>, I encountered an error communicating with Groq.`
          }
        }
      ]
    });
  }
});

/**
 * 2. Command: /slacky-wacky-status
 * Description: Simple health check command to see if the server code is alive.
 */
app.command('/slacky-wacky-status', async ({ command, ack, respond }) => {
  trackCommand('/slacky-wacky-status');
  await ack();
  await respond({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🟢 *Status Update:* \`slacky-wacky\` is online, connected via Socket Mode, and running smoothly!`
        }
      }
    ]
  });
});

/**
 * 3. Command: /slacky-wacky-help
 * Description: Lists available commands and usage hints.
 */
app.command('/slacky-wacky-help', async ({ command, ack, respond }) => {
  trackCommand('/slacky-wacky-help');
  await ack();
  const helpMessage = `*Available Commands for \`slacky-wacky\`:*
• \`/slacky-wacky-ask [your question]\` - Ask the Groq AI a question.
• \`/slacky-wacky-joke\` - Get a funny developer joke.
• \`/slacky-wacky-fact\` - Get a random mind-blowing fun fact.
• \`/slacky-wacky-define [word]\` - Get a concise dictionary definition of a word.
• \`/slacky-wacky-status\` - Checks if the bot application server is responsive.
• \`/slacky-wacky-help\` - Displays this help message.`;
  await respond({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: helpMessage
        }
      }
    ]
  });
});

/**
 * 4. Command: /slacky-wacky-joke
 * Description: Returns a funny developer joke generated by Groq.
 */
app.command('/slacky-wacky-joke', async ({ command, ack, respond }) => {
  trackCommand('/slacky-wacky-joke');
  await ack();
  try {
    await respond({
      blocks: [
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_Thinking up a joke..._`
            }
          ]
        }
      ]
    });
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Tell me a short, clean, funny developer/coding joke.' }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `😂 *Joke of the day:* \n${response.data.choices[0].message.content}`
          }
        }
      ]
    });
  } catch (err) {
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Sorry, I couldn't think of a joke right now."
          }
        }
      ]
    });
  }
});

/**
 * 5. Command: /slacky-wacky-fact
 * Description: Returns a random fun fact generated by Groq.
 */
app.command('/slacky-wacky-fact', async ({ command, ack, respond }) => {
  trackCommand('/slacky-wacky-fact');
  await ack();
  try {
    await respond({
      blocks: [
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_Searching the archives for a fact..._`
            }
          ]
        }
      ]
    });
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Tell me a random, mind-blowing fun fact.' }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🧠 *Fun Fact:* \n${response.data.choices[0].message.content}`
          }
        }
      ]
    });
  } catch (err) {
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Sorry, I couldn't fetch a fun fact."
          }
        }
      ]
    });
  }
});

/**
 * 6. Command: /slacky-wacky-define
 * Description: Returns a concise definition of a word.
 */
app.command('/slacky-wacky-define', async ({ command, ack, respond }) => {
  trackCommand('/slacky-wacky-define');
  await ack();
  const word = command.text;
  if (!word) {
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please provide a word! Example: \`/slacky-wacky-define recursion\`"
          }
        }
      ]
    });
    return;
  }
  try {
    await respond({
      blocks: [
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_Looking up "${word}"..._`
            }
          ]
        }
      ]
    });
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `Define the word "${word}" in a concise dictionary format.` }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📖 *Definition of ${word}:* \n${response.data.choices[0].message.content}`
          }
        }
      ]
    });
  } catch (err) {
    await respond({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Sorry, I couldn't define "${word}".`
          }
        }
      ]
    });
  }
});

// Start the app
(async () => {
  await app.start();
  console.log('⚡ Bolt app is running in Socket Mode!');
  addLog('Bolt app started');
  await startServer(3000);
})();
