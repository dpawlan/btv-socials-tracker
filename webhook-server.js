require('dotenv').config();
const express = require('express');
const TikTokScraperApify = require('./src/tiktok-scraper-apify');
const { initDatabase, saveMention } = require('./src/database');
const SlackNotifier = require('./src/slack-notifier');
const GoogleSheetsLogger = require('./src/google-sheets');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-secret-key';

const MENTION_HANDLE = process.env.MENTION_HANDLE || '@bracketology.tv';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Mentions';
const APIFY_TOKEN = process.env.APIFY_TOKEN;

const scraper = new TikTokScraperApify(MENTION_HANDLE, APIFY_TOKEN);
const slack = new SlackNotifier(SLACK_WEBHOOK_URL);
const sheets = new GoogleSheetsLogger(GOOGLE_SA_JSON, GOOGLE_SHEET_ID, SHEET_NAME);

// Initialize database on startup
initDatabase().then(() => {
  console.log('Database initialized');
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TikTok Mentions Tracker',
    tracking: MENTION_HANDLE
  });
});

// Webhook endpoint for cron-job.org
app.get('/check-mentions', async (req, res) => {
  const secret = req.query.secret;

  // Basic authentication
  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log(`[${new Date().toISOString()}] Webhook triggered - checking mentions...`);

  try {
    const mentions = await scraper.searchMentions();
    console.log(`Found ${mentions.length} potential mentions`);

    let newMentions = 0;
    const newMentionsList = [];

    for (const mention of mentions) {
      try {
        await saveMention(mention);

        // If save succeeded, it's a new mention
        await slack.sendMention(mention);
        await sheets.logMention(mention);
        newMentions++;
        newMentionsList.push(mention);

        console.log(`New mention from @${mention.username}`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
          // Already exists, skip
          continue;
        } else {
          console.error('Error processing mention:', error.message);
        }
      }
    }

    if (newMentions > 0) {
      await slack.sendSummary(newMentionsList);
      console.log(`✅ Processed ${newMentions} new mentions`);
    }

    res.json({
      success: true,
      checked: mentions.length,
      new: newMentions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error during check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual trigger endpoint (for testing)
app.post('/trigger', async (req, res) => {
  const secret = req.body.secret || req.query.secret;

  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Same logic as above
  try {
    const mentions = await scraper.searchMentions();
    let newMentions = 0;
    const newMentionsList = [];

    for (const mention of mentions) {
      try {
        await saveMention(mention);
        await slack.sendMention(mention);
        await sheets.logMention(mention);
        newMentions++;
        newMentionsList.push(mention);
      } catch (error) {
        if (!error.message.includes('UNIQUE constraint')) {
          console.error('Error:', error.message);
        }
      }
    }

    if (newMentions > 0) {
      await slack.sendSummary(newMentionsList);
    }

    res.json({
      success: true,
      checked: mentions.length,
      new: newMentions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/check-mentions?secret=${WEBHOOK_SECRET}`);
});