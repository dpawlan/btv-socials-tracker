require('dotenv').config();
const cron = require('node-cron');
const TikTokScraperRapidAPI = require('./src/tiktok-scraper-rapidapi');
const { initDatabase, saveMention, getNewMentions } = require('./src/database');
const SlackNotifier = require('./src/slack-notifier');
const GoogleSheetsLogger = require('./src/google-sheets');

const MENTION_HANDLE = process.env.MENTION_HANDLE || '@bracketology.tv';
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || 120;  // Changed to 120 minutes (2 hours)
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Mentions';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

const scraper = new TikTokScraperRapidAPI(MENTION_HANDLE, RAPIDAPI_KEY);
const slack = new SlackNotifier(SLACK_WEBHOOK_URL);
const sheets = new GoogleSheetsLogger(GOOGLE_SA_JSON, GOOGLE_SHEET_ID, SHEET_NAME);

let lastCheckTime = null;

async function checkForMentions() {
  console.log(`[${new Date().toISOString()}] Checking for mentions of ${MENTION_HANDLE}...`);

  try {
    const mentions = await scraper.searchMentions();
    console.log(`Found ${mentions.length} potential mentions`);

    const newMentions = [];

    for (const mention of mentions) {
      try {
        await saveMention(mention);

        if (!lastCheckTime || new Date(mention.created_at) > new Date(lastCheckTime)) {
          newMentions.push(mention);

          await slack.sendMention(mention);
          await sheets.logMention(mention);
        }
      } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
          console.log(`Mention already tracked: ${mention.post_id}`);
        } else {
          console.error('Error saving mention:', error.message);
        }
      }
    }

    if (newMentions.length > 0) {
      console.log(`${newMentions.length} new mentions found!`);
      await slack.sendSummary(newMentions);
    } else {
      console.log('No new mentions found');
    }

    lastCheckTime = new Date().toISOString();
  } catch (error) {
    console.error('Error checking mentions:', error);
  }
}

async function showRecentMentions() {
  const recent = await getNewMentions();
  console.log('\n=== Recent Mentions ===');
  recent.forEach(mention => {
    console.log(`\n@${mention.username} (${mention.views} views, ${mention.likes} likes)`);
    console.log(`Caption: ${mention.caption.substring(0, 100)}...`);
    console.log(`Hashtags: ${mention.hashtags.join(' ')}`);
    console.log(`URL: ${mention.post_url}`);
  });
  console.log('====================\n');
}

async function startTracker() {
  console.log('TikTok Mentions Tracker Starting...');
  console.log(`Tracking: ${MENTION_HANDLE}`);
  console.log(`Check interval: Every ${CHECK_INTERVAL} minutes`);
  console.log(`Slack: ${SLACK_WEBHOOK_URL ? 'Configured' : 'Not configured'}`);
  console.log(`Google Sheets: ${GOOGLE_SA_JSON ? 'Configured' : 'Not configured'}`);

  await initDatabase();
  console.log('Database initialized');

  await checkForMentions();

  const cronExpression = `*/${CHECK_INTERVAL} * * * *`;
  cron.schedule(cronExpression, checkForMentions);

  console.log(`\nScheduler started. Checking every ${CHECK_INTERVAL} minutes.`);
  console.log('Press Ctrl+C to stop.\n');

  cron.schedule('0 */6 * * *', async () => {
    console.log('Generating 6-hour summary...');
    await showRecentMentions();
  });
}

process.on('SIGINT', () => {
  console.log('\nStopping tracker...');
  process.exit(0);
});

startTracker().catch(error => {
  console.error('Failed to start tracker:', error);
  process.exit(1);
});