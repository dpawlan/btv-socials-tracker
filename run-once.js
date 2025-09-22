#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const TikTokScraperRapidAPI = require('./src/tiktok-scraper-rapidapi');
const { initDatabase, saveMention } = require('./src/database');
const SlackNotifier = require('./src/slack-notifier');
const GoogleSheetsLogger = require('./src/google-sheets');

const MENTION_HANDLE = process.env.MENTION_HANDLE || '@bracketology.tv';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const GOOGLE_SA_JSON = process.env.GOOGLE_SA_JSON ? path.join(__dirname, process.env.GOOGLE_SA_JSON) : null;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Mentions';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

const scraper = new TikTokScraperRapidAPI(MENTION_HANDLE, RAPIDAPI_KEY);
const slack = new SlackNotifier(SLACK_WEBHOOK_URL);
const sheets = new GoogleSheetsLogger(GOOGLE_SA_JSON, GOOGLE_SHEET_ID, SHEET_NAME);

async function runOnce() {
  console.log(`[${new Date().toISOString()}] Starting TikTok mention check...`);

  try {
    await initDatabase();

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
      console.log(`✅ Processed ${newMentions} new mentions`);

      // Send summary to Slack
      const newMentionsList = mentions.slice(0, newMentions);
      await slack.sendSummary(newMentionsList);
    } else {
      console.log('No new mentions found');
    }

  } catch (error) {
    console.error('Error during check:', error);
    process.exit(1);
  }

  console.log(`[${new Date().toISOString()}] Check complete`);
  process.exit(0);
}

runOnce();