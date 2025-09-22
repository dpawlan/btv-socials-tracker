const TikTokScraperRapidAPI = require('../src/tiktok-scraper-rapidapi');
const { initDatabase, saveMention } = require('../src/database');
const SlackNotifier = require('../src/slack-notifier');
const GoogleSheetsLogger = require('../src/google-sheets');

const MENTION_HANDLE = process.env.MENTION_HANDLE || '@bracketology.tv';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Mentions';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

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

    await initDatabase();

    // Search for mentions
    const mentions = await scraper.searchMentions();
    console.log(`Found ${mentions.length} potential mentions`);

    let newMentions = 0;

    for (const mention of mentions) {
      try {
        await saveMention(mention);

        // If save succeeded, it's a new mention
        await slack.sendMention(mention);
        await sheets.logMention(mention);
        newMentions++;

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
      // Send summary to Slack
      const newMentionsList = mentions.slice(0, newMentions);
      await slack.sendSummary(newMentionsList);
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${newMentions} new mentions out of ${mentions.length} found`,
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