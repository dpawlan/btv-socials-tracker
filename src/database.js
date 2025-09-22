const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../mentions.db'));

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS mentions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id TEXT UNIQUE,
          username TEXT,
          caption TEXT,
          hashtags TEXT,
          mention_type TEXT,
          views INTEGER,
          likes INTEGER,
          comments INTEGER,
          shares INTEGER,
          post_url TEXT,
          created_at DATETIME,
          tracked_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

function saveMention(mention) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO mentions (
        post_id, username, caption, hashtags, mention_type,
        views, likes, comments, shares, post_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
      mention.post_id,
      mention.username,
      mention.caption,
      JSON.stringify(mention.hashtags),
      mention.mention_type,
      mention.views,
      mention.likes,
      mention.comments,
      mention.shares,
      mention.post_url,
      mention.created_at
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getNewMentions(since) {
  return new Promise((resolve, reject) => {
    const query = since
      ? `SELECT * FROM mentions WHERE tracked_at > datetime(?) ORDER BY tracked_at DESC`
      : `SELECT * FROM mentions ORDER BY tracked_at DESC LIMIT 10`;

    db.all(query, since ? [since] : [], (err, rows) => {
      if (err) reject(err);
      else {
        const mentions = rows.map(row => ({
          ...row,
          hashtags: JSON.parse(row.hashtags || '[]')
        }));
        resolve(mentions);
      }
    });
  });
}

module.exports = {
  initDatabase,
  saveMention,
  getNewMentions
};