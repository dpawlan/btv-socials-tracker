const TikTokScraperRapidAPI = require('../src/tiktok-scraper-rapidapi');
const SlackNotifier = require('../src/slack-notifier');
const GoogleSheetsLogger = require('../src/google-sheets');

const MENTION_HANDLE = process.env.MENTION_HANDLE || '@bracketology.tv';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Mentions';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Store processed IDs in memory (resets on each deploy)
const processedIds = new Set();

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log(`[${new Date().toISOString()}] Checking for mentions of ${MENTION_HANDLE}...`);

  try {
    // Initialize services
    const scraper = new TikTokScraperRapidAPI(MENTION_HANDLE, RAPIDAPI_KEY);
    const slack = new SlackNotifier(SLACK_WEBHOOK_URL);
    const sheets = new GoogleSheetsLogger(GOOGLE_SA_JSON, GOOGLE_SHEET_ID, SHEET_NAME);

    // Search for mentions
    const mentions = await scraper.searchMentions();
    console.log(`Found ${mentions.length} potential mentions`);

    const newMentions = [];

    for (const mention of mentions) {
      // Check if we've already processed this mention
      if (!processedIds.has(mention.post_id)) {
        processedIds.add(mention.post_id);
        newMentions.push(mention);

        // Send to Slack and Google Sheets
        await slack.sendMention(mention);
        await sheets.logMention(mention);

        console.log(`New mention from @${mention.username}`);
      }
    }

    if (newMentions.length > 0) {
      // Send summary to Slack
      await slack.sendSummary(newMentions);
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${newMentions.length} new mentions out of ${mentions.length} found`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error during check:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};