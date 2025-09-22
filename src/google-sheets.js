const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleSheetsLogger {
  constructor(jsonPath, sheetId, sheetName) {
    this.sheetId = sheetId;
    this.sheetName = sheetName;
    this.auth = null;
    this.sheets = null;

    // Handle both file path and JSON string (for Vercel)
    if (jsonPath) {
      if (typeof jsonPath === 'string' && jsonPath.startsWith('{')) {
        // It's a JSON string from environment variable
        this.initializeAuthFromJson(jsonPath);
      } else if (fs.existsSync(jsonPath)) {
        // It's a file path
        this.initializeAuth(jsonPath);
      }
    }
  }

  // Convert UTC to Central Time (Chicago)
  toCentralTime(date = new Date()) {
    const options = {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };

    const centralTime = new Intl.DateTimeFormat('en-US', options).format(date);

    // Add timezone abbreviation
    const isDST = this.isDaylightSavingTime(date);
    const tzAbbr = isDST ? 'CDT' : 'CST';

    return `${centralTime} ${tzAbbr}`;
  }

  // Check if date is in daylight saving time for Central timezone
  isDaylightSavingTime(date) {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const janOffset = jan.getTimezoneOffset();
    const julOffset = jul.getTimezoneOffset();
    const dateOffset = date.getTimezoneOffset();

    return Math.max(janOffset, julOffset) !== dateOffset;
  }

  initializeAuth(jsonPath) {
    try {
      const credentials = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets authentication initialized');
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error.message);
    }
  }

  initializeAuthFromJson(jsonString) {
    try {
      const credentials = JSON.parse(jsonString);

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets authentication initialized from JSON string');
    } catch (error) {
      console.error('Failed to initialize Google Sheets from JSON:', error.message);
    }
  }

  async ensureHeaders() {
    if (!this.sheets) return;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!A1:L1`
      });

      if (!response.data.values || response.data.values[0].length === 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetId,
          range: `${this.sheetName}!A1:L1`,
          valueInputOption: 'RAW',
          resource: {
            values: [[
              'Timestamp',
              'Username',
              'Caption',
              'Hashtags',
              'Views',
              'Likes',
              'Comments',
              'Shares',
              'Post URL',
              'Mention Type',
              'Post ID',
              'Created At'
            ]]
          }
        });
        console.log('Headers created in Google Sheets');
      }
    } catch (error) {
      console.error('Failed to ensure headers:', error.message);
    }
  }

  async logMention(mention) {
    if (!this.sheets) {
      console.log('Google Sheets not configured, skipping');
      return;
    }

    try {
      await this.ensureHeaders();

      const row = [
        this.toCentralTime(),  // Convert to Central Time
        mention.username,
        mention.caption,
        mention.hashtags.join(', '),
        mention.views,
        mention.likes,
        mention.comments,
        mention.shares,
        mention.post_url,
        mention.mention_type,
        mention.post_id,
        mention.created_at
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!A:L`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row]
        }
      });

      console.log('Logged to Google Sheets:', mention.username);
    } catch (error) {
      console.error('Failed to log to Google Sheets:', error.message);
    }
  }

  async logBatch(mentions) {
    if (!this.sheets || mentions.length === 0) return;

    try {
      await this.ensureHeaders();

      const rows = mentions.map(mention => [
        this.toCentralTime(),  // Convert to Central Time
        mention.username,
        mention.caption,
        mention.hashtags.join(', '),
        mention.views,
        mention.likes,
        mention.comments,
        mention.shares,
        mention.post_url,
        mention.mention_type,
        mention.post_id,
        mention.created_at
      ]);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!A:L`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: rows
        }
      });

      console.log(`Logged ${mentions.length} mentions to Google Sheets`);
    } catch (error) {
      console.error('Failed to log batch to Google Sheets:', error.message);
    }
  }
}

module.exports = GoogleSheetsLogger;