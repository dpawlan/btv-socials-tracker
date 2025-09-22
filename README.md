# TikTok Mentions Tracker

A bot that monitors TikTok for mentions of @bracketology.tv, extracts hashtags from those posts, and logs them to Slack and Google Sheets.

## Setup

### 1. Install Dependencies

```bash
# Create virtual environment (if not already created)
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate  # On Windows

# Install required packages
pip install -r requirements.txt
```

### 2. Install Chrome WebDriver

For Selenium-based scraping, you need Chrome and ChromeDriver:

```bash
# On macOS with Homebrew
brew install --cask chromedriver

# Or download manually from https://chromedriver.chromium.org
```

### 3. Configure Environment Variables

Edit the `.env` file with your actual values:

```env
MENTION_HANDLE=@bracketology.tv

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Google Sheets
GOOGLE_SA_JSON=service_account.json
GOOGLE_SHEET_ID=your_google_sheet_id_here
SHEET_NAME=Mentions
```

### 4. Set Up Google Sheets

1. Create a Google Cloud Project and enable the Google Sheets API
2. Create a service account and download the JSON key file
3. Save the JSON file as `service_account.json` in the project directory
4. Create a Google Sheet and share it with the service account email
5. Copy the Sheet ID from the URL and add it to `.env`
6. Create a worksheet named "Mentions" with these columns:
   - URL
   - Creator
   - Hashtags
   - Description
   - Video Timestamp
   - Date Added

### 5. Set Up Slack Webhook

1. Go to your Slack workspace settings
2. Create an incoming webhook for the desired channel
3. Copy the webhook URL to `.env`

## Running the Bot

### Single Run (for testing)
```bash
source .venv/bin/activate
python bot.py
```

### Continuous Monitoring
Edit `bot.py` and uncomment the last line to enable continuous monitoring:
```python
# Uncomment the line below to run continuously
run_continuous(interval_minutes=30)
```

Then run:
```bash
python bot.py
```

### Using the Alternative Scraper
If the main bot has issues with TikTok scraping, try the Selenium-based scraper:
```bash
python tiktok_scraper.py
```

## How It Works

1. **Search**: The bot searches TikTok for mentions of the specified handle (@bracketology.tv)
2. **Extract**: Hashtags are extracted from videos that mention the handle
3. **Track**: New mentions are tracked in `processed_videos.json` to avoid duplicates
4. **Notify**: Each new mention is sent to the configured Slack channel with hashtags
5. **Log**: Mentions are logged to the Google Sheet with URL, creator, hashtags, description, and timestamps
6. **Repeat**: In continuous mode, the bot checks every 30 minutes (configurable)

## Troubleshooting

- **No mentions found**: TikTok's structure changes frequently. The scraper may need updates.
- **Google Sheets errors**: Ensure the service account has edit access to the sheet
- **Slack not working**: Verify the webhook URL is correct and active
- **Chrome driver issues**: Ensure ChromeDriver version matches your Chrome browser version

## Files

- `bot.py` - Main bot script with all functionality
- `tiktok_scraper.py` - Alternative Selenium-based scraper
- `requirements.txt` - Python dependencies
- `.env` - Configuration (not committed to git)
- `processed_videos.json` - Tracks processed videos (auto-created)
- `service_account.json` - Google service account credentials (add this yourself)