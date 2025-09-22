const axios = require('axios');

class SlackNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendMention(mention) {
    if (!this.webhookUrl) {
      console.log('Slack webhook not configured, skipping notification');
      return;
    }

    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎉 New TikTok Mention!"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*User:* @${mention.username}`
            },
            {
              type: "mrkdwn",
              text: `*Views:* ${this.formatNumber(mention.views)}`
            },
            {
              type: "mrkdwn",
              text: `*Likes:* ${this.formatNumber(mention.likes)}`
            },
            {
              type: "mrkdwn",
              text: `*Comments:* ${this.formatNumber(mention.comments)}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Caption:* ${mention.caption.substring(0, 200)}${mention.caption.length > 200 ? '...' : ''}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Hashtags:* ${mention.hashtags.join(' ')}`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View on TikTok"
              },
              url: mention.post_url
            }
          ]
        }
      ]
    };

    try {
      await axios.post(this.webhookUrl, message);
      console.log('Slack notification sent for:', mention.username);
    } catch (error) {
      console.error('Failed to send Slack notification:', error.message);
    }
  }

  async sendSummary(mentions) {
    if (!this.webhookUrl || mentions.length === 0) return;

    const totalViews = mentions.reduce((sum, m) => sum + m.views, 0);
    const totalLikes = mentions.reduce((sum, m) => sum + m.likes, 0);
    const allHashtags = [...new Set(mentions.flatMap(m => m.hashtags))];

    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `📊 TikTok Mentions Summary`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*New Mentions:* ${mentions.length}`
            },
            {
              type: "mrkdwn",
              text: `*Total Views:* ${this.formatNumber(totalViews)}`
            },
            {
              type: "mrkdwn",
              text: `*Total Likes:* ${this.formatNumber(totalLikes)}`
            },
            {
              type: "mrkdwn",
              text: `*Unique Hashtags:* ${allHashtags.length}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Top Hashtags:* ${allHashtags.slice(0, 10).join(' ')}`
          }
        }
      ]
    };

    try {
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      console.error('Failed to send Slack summary:', error.message);
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

module.exports = SlackNotifier;