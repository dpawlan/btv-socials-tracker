const axios = require('axios');

class TikTokScraperRapidAPI {
  constructor(mentionHandle, rapidApiKey) {
    this.mentionHandle = mentionHandle;
    this.searchQuery = mentionHandle.replace('@', '');
    this.rapidApiKey = rapidApiKey;
  }

  extractHashtags(text) {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return text.match(hashtagRegex) || [];
  }

  async searchMentions() {
    console.log(`Searching for ${this.mentionHandle} using RapidAPI...`);

    const mentions = [];

    // Calculate cutoff time - 5 hours ago (300 minutes) - buffer for 4-hour check intervals
    const cutoffTime = new Date(Date.now() - 300 * 60 * 1000);
    console.log(`Filtering for TikToks posted after: ${cutoffTime.toISOString()} (last 5 hours)`);

    if (!this.rapidApiKey) {
      console.error('RapidAPI key not configured');
      return mentions;
    }

    try {
      // Using TikTok Video No Watermark2 from RapidAPI
      // Search feed for videos by keyword
      const options = {
        method: 'GET',
        url: 'https://tiktok-video-no-watermark2.p.rapidapi.com/feed/search',
        params: {
          keywords: this.searchQuery,
          count: 30,
          cursor: 0,
          region: 'US',
          publish_time: 0,
          sort_type: 0
        },
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': 'tiktok-video-no-watermark2.p.rapidapi.com'
        }
      };

      console.log('Making RapidAPI request...');
      const response = await axios.request(options);

      if (response.data && response.data.data) {
        // TikTok Video No Watermark2 API returns videos in data.data.videos array
        const videos = response.data.data.videos || [];
        console.log(`Found ${videos.length} results from RapidAPI`);


        let filteredOut = 0;

        for (const video of videos) {
          // Get the video text/caption from TikTok Video No Watermark2 API structure
          const caption = video.title || '';
          const text = caption.toLowerCase();

          // Check if it mentions our handle
          if (text.includes('bracketology')) {
            // Check if the video was posted within our time window
            const createTime = video.create_time || 0;
            const videoTime = new Date(createTime * 1000);

            if (videoTime < cutoffTime) {
              filteredOut++;
              continue; // Skip videos older than 5 hours
            }

            const hashtags = this.extractHashtags(caption);

            // Extract video ID and author info
            const videoId = video.video_id || video.aweme_id || '';
            const username = video.author?.unique_id || video.author?.nickname || '';

            // Build the video URL
            const videoUrl = `https://www.tiktok.com/@${username}/video/${videoId}`;

            mentions.push({
              post_id: videoId,
              username: username,
              caption: caption,
              hashtags: hashtags,
              mention_type: 'direct',
              views: video.play_count || 0,
              likes: video.digg_count || 0,
              comments: video.comment_count || 0,
              shares: video.share_count || 0,
              post_url: videoUrl,
              created_at: new Date(createTime * 1000).toISOString()
            });
          }
        }

        if (filteredOut > 0) {
          console.log(`Filtered out ${filteredOut} mentions older than 5 hours`);
        }

        console.log(`Found ${mentions.length} recent mentions of ${this.mentionHandle}`);

      } else {
        console.log('No data in response');
      }

    } catch (error) {
      console.error('Error using RapidAPI:', error.response?.data?.message || error.message);

      // Try alternative endpoint if first one fails
      if (error.response?.status === 429) {
        console.log('Rate limit hit. Will retry next scheduled run.');
      }
    }

    return mentions;
  }
}

module.exports = TikTokScraperRapidAPI;